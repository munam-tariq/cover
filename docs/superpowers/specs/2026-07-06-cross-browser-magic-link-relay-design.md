# Cross-Browser Magic-Link Relay (Claude-style verification code)

**Date:** 2026-07-06
**Status:** Approved

## Problem

Magic-link sign-in fails with "PKCE code verifier not found in storage" whenever the
email link opens in a different browser than the one that requested it. The most
common real-world case: user requests the link in mobile Chrome, opens the email in
the Gmail app, and Gmail's in-app browser (a separate browser context with empty
storage) follows the link.

Root cause: `signInWithOtp` stores a PKCE code verifier in the initiating browser's
storage. `/auth/callback` needs both the `?code=` from the URL **and** that stored
verifier to call `exchangeCodeForSession`. A foreign browser has the code but not the
verifier, so the exchange fails and the user hits a dead-end error screen.

## Solution overview

Replicate Claude's sign-in UX. The email stays link-only (no Supabase email template
changes — those would require editing both the Magic Link and Confirm signup
templates in both dev and prod dashboards by hand). Instead:

- **Same browser** (verifier present): link click logs in directly. Unchanged.
- **Foreign browser** (verifier missing): instead of the error screen,
  `/auth/callback` stashes the auth code with the API in exchange for a random
  **6-digit display code** and shows: *"Use verification code to continue — enter
  this code where you first tried to sign in."*
- **Original browser**: `/login/check-email` gains an "Enter verification code"
  option. User types the 6 digits → API returns the stashed auth code → the page
  runs `exchangeCodeForSession` locally, where the verifier lives → session is
  established in the browser the user actually wants.

Member invites are covered automatically: invite emails are sent by our API via
Resend and invited users authenticate through this same magic-link → `/auth/callback`
flow. No Supabase dashboard changes anywhere.

## Components

### 1. Database: `auth_link_codes` table (new migration)

| Column         | Type          | Notes                                   |
| -------------- | ------------- | --------------------------------------- |
| `display_code` | `text` PK     | 6 digits, crypto-random, retry on collision |
| `auth_code`    | `text`        | the Supabase PKCE auth code (UUID)      |
| `expires_at`   | `timestamptz` | `now() + 5 minutes`                     |
| `created_at`   | `timestamptz` | default `now()`                         |

- RLS **enabled with no policies** (deny all) and grants revoked from
  `anon`/`authenticated`. Only the API's service-role client touches it.
- No pg_cron: expired rows are lazily deleted on each insert
  (`DELETE ... WHERE expires_at < now()`).
- Migration created with `supabase migration new`, applied to **dev first**;
  prod apply is a separately flagged manual step (standard dev/prod split).

### 2. API: `apps/api/src/routes/auth-link-code.ts` (new)

Two public endpoints (no auth — callers are, by definition, not signed in), both
behind the existing `rateLimit()` middleware from `middleware/rate-limit.ts`:

- **`POST /api/auth/link-code`** — body `{ authCode }` (must be a UUID).
  Generates a unique 6-digit code, inserts the row, returns
  `{ displayCode, expiresAt }`. Rate limit: ~10/hour per IP.
- **`POST /api/auth/link-code/claim`** — body `{ displayCode }`.
  Atomically deletes and returns the matching unexpired row
  (`DELETE ... RETURNING`), responds `{ authCode }`, or a generic
  `404 { error: "invalid_or_expired" }`. Single use is enforced by the delete.
  Rate limit: ~10/minute per IP (bounds brute force; see Security).

Wired into `apps/api/src/index.ts` alongside the other routes.

### 3. Web: shared post-auth helper (extract, DRY)

Extract the post-auth routing logic currently inlined in
`app/(auth)/auth/callback/page.tsx` — posthog `identify`/`logged_in`/`signed_up`,
invitation-flow detection, pending-invitation API check, projects lookup,
onboarding-redirect decision — into `apps/web/lib/auth/post-auth.ts` exposing
`resolvePostAuthRedirect(supabase, user, next): Promise<string>`. Both the callback
page and the new code-entry path use it; behavior is identical to today.

### 4. Web: `/auth/callback` page changes

- On `exchangeCodeForSession` failure whose message indicates a verifier problem
  (match "code verifier" — covers both *not found* and *mismatch* variants), and a
  `?code=` param is present: POST it to `/api/auth/link-code` and render the
  display-code screen (large code, "enter this where you first tried to sign in",
  expiry note). The `next` param does not need to be relayed — the redirect happens
  in the original browser, which already carries it.
- All other failures keep the existing error screen.
- Same-browser success path is untouched.

### 5. Web: `/login/check-email` page changes

- Add an **"Enter verification code"** toggle below the resend section. Expands to a
  6-digit input + submit.
- Submit → `POST /api/auth/link-code/claim` → on success,
  `supabase.auth.exchangeCodeForSession(authCode)` → `resolvePostAuthRedirect` →
  `router.push`. On failure: inline "Invalid or expired code" with resend fallback.
- **Bug fix in passing:** `login/page.tsx` currently drops `returnUrl` when
  redirecting to check-email. Pass it through
  (`/login/check-email?email=...&returnUrl=...`) and use it as `next` after code
  entry, so invited users land on `/invite/{token}`.

## Security

- A claimed display code yields only a PKCE auth code, which is **useless without
  the verifier** — and the verifier never leaves the original browser. An attacker
  who guesses a display code cannot sign in as the victim.
- Brute force is bounded by: 1,000,000-code space, 5-minute TTL, single use
  (delete-on-claim), and per-IP rate limits on claim.
- Stash endpoint validates the auth code is UUID-shaped; garbage stashes expire
  harmlessly. Auth codes are never logged.
- Table is service-role-only (RLS deny-all + revoked grants).

## Edge cases

- **Expired/wrong display code** → generic inline error, user can resend the email.
- **Stale verifier in the foreign browser** (mismatch error instead of not-found) →
  same relay path.
- **Auth code already consumed** (e.g., user retries) → `exchangeCodeForSession`
  fails in the original browser → inline error + resend fallback.
- **`detectSessionInUrl` auto-exchange** on callback load: its failure in the
  foreign browser is silent; the explicit exchange drives the relay path, as today
  it drives the error path.

## Testing

- **API unit tests** (`tests/` following existing patterns): stash returns 6-digit
  code; claim returns auth code exactly once; expired codes rejected; malformed
  auth code rejected; rate limits enforced.
- **Web**: unit-test `resolvePostAuthRedirect` extraction (same decisions as the
  current inline logic).
- **Manual E2E** via Chrome DevTools MCP: request link in browser profile A, open
  callback URL in profile B → display code appears → enter in A → signed in, correct
  redirect (dashboard, onboarding, and invite variants).

## Out of scope

- Email template changes (none needed).
- Auto-login via Realtime handoff (typing the code is the accepted UX).
- Widget/SDK auth (unaffected; uses separate key-based auth).
