# Cross-Browser Magic-Link Relay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a magic link opens in a browser without the PKCE verifier (e.g. Gmail's in-app browser), show a 6-digit code the user types back in the original browser to finish sign-in there — instead of the "Sign In Failed" dead end.

**Architecture:** The foreign browser's `/auth/callback` stashes the unusable `?code=` with the API in exchange for a short-lived 6-digit display code (Postgres-backed, single-use). The original browser's `/login/check-email` page claims the auth code by typing the 6 digits and runs `exchangeCodeForSession` locally, where the verifier lives. Post-auth routing logic is extracted from the callback page into a shared helper both paths use.

**Tech Stack:** Express (apps/api) + zod + existing `rateLimit()` middleware + `supabaseAdmin`; Next.js app router client pages (apps/web) + `@supabase/ssr` browser client; `node --test` source/behavioral tests in `tests/`.

**Spec:** `docs/superpowers/specs/2026-07-06-cross-browser-magic-link-relay-design.md`

## Global Constraints

- **NO git commands.** Never run `git add`, `git commit`, or `git push` — the user reviews all changes in their IDE and commits manually. Where this plan template would normally say "Commit", the step is simply omitted.
- Display code: exactly 6 digits, crypto-random, TTL **5 minutes**, **single use**.
- Rate limits: stash **10/hour per IP**, claim **5/minute per IP**.
- Claim failures return a **generic** `404 { "error": "invalid_or_expired" }` (no oracle).
- Migration is applied to the **DEV Supabase project `gjotktstaruezfjnslup` ONLY**. If the MCP-connected project id is anything else, STOP and ask the user. Prod apply is a flagged manual follow-up, not part of this plan.
- Tests live in `tests/api/` and `tests/web/`, run with `npm test` (or a single file via `node --experimental-strip-types --test <path>`). Behavioral imports of source modules must use explicit `.ts` extensions.
- Type check: `npm run type-check` at repo root.
- Web → API base URL pattern (already used in the codebase): `process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"`.

---

### Task 1: `auth_link_codes` migration

**Files:**
- Create: `supabase/migrations/20260706000001_create_auth_link_codes.sql`
- Test: `tests/api/auth-link-codes-migration.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: table `public.auth_link_codes(display_code text pk, auth_code text, created_at timestamptz, expires_at timestamptz)`, RLS enabled with zero policies, grants revoked from `anon`/`authenticated`. Only the service-role client can touch it.

- [ ] **Step 1: Write the failing test**

Create `tests/api/auth-link-codes-migration.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260706000001_create_auth_link_codes.sql"
);

test("migration creates auth_link_codes with required columns", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /create table if not exists public\.auth_link_codes/i);
  assert.match(sql, /display_code text primary key/i);
  assert.match(sql, /auth_code text not null/i);
  assert.match(sql, /expires_at timestamptz not null/i);
});

test("migration enables RLS and defines no policies (deny-all)", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(
    sql,
    /alter table public\.auth_link_codes enable row level security/i
  );
  assert.doesNotMatch(sql, /create policy/i);
});

test("migration revokes access from anon and authenticated", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(
    sql,
    /revoke all on table public\.auth_link_codes from anon, authenticated/i
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/api/auth-link-codes-migration.test.ts`
Expected: FAIL — `ENOENT` (migration file does not exist).

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/20260706000001_create_auth_link_codes.sql`:

```sql
-- Short-lived relay codes for cross-browser magic-link sign-in.
-- A foreign browser (e.g. Gmail in-app) stashes the PKCE auth code here under a
-- 6-digit display code; the originating browser claims it and completes the
-- exchange locally. Rows are single-use and expire after 5 minutes.

create table if not exists public.auth_link_codes (
  display_code text primary key,
  auth_code text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- Service-role access only: RLS on with no policies denies anon/authenticated,
-- and the explicit revoke removes the default table grants as well.
alter table public.auth_link_codes enable row level security;

revoke all on table public.auth_link_codes from anon, authenticated;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test tests/api/auth-link-codes-migration.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Apply to DEV Supabase only**

Using the Supabase MCP tools:
1. Call `get_project` (or `list_projects`) and confirm the connected project id is **`gjotktstaruezfjnslup`** (dev). If it is anything else — especially `hynaqwwofkpaafvlckdm` (prod) — STOP and ask the user.
2. Call `apply_migration` with name `create_auth_link_codes` and the SQL from Step 3.
3. Verify with `list_tables` that `auth_link_codes` exists and shows `rls_enabled: true`.

**Note for the final report:** prod (`hynaqwwofkpaafvlckdm`) does NOT get this migration now; it must be flagged to the user as a pending manual step before prod deploy.

---

### Task 2: Relay service (`stash` / `claim` logic)

**Files:**
- Create: `apps/api/src/services/auth-link-code.ts`
- Test: `tests/api/auth-link-code-service.test.ts`

**Interfaces:**
- Consumes: table `public.auth_link_codes` (Task 1); `SupabaseClient` type from `@supabase/supabase-js` (type-only import so tests can import this module without env vars).
- Produces (used by Task 3):
  - `generateDisplayCode(): string` — 6 crypto-random digits, zero-padded.
  - `stashAuthCode(db: SupabaseClient, authCode: string): Promise<{ displayCode: string; expiresAt: string }>` — throws on DB error.
  - `claimAuthCode(db: SupabaseClient, displayCode: string): Promise<string | null>` — atomically deletes and returns the auth code; `null` when missing/expired/already used; throws on DB error.

- [ ] **Step 1: Write the failing test**

Create `tests/api/auth-link-code-service.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { generateDisplayCode } from "../../apps/api/src/services/auth-link-code.ts";

const servicePath = path.join(
  process.cwd(),
  "apps/api/src/services/auth-link-code.ts"
);

test("generateDisplayCode returns exactly 6 digits, zero-padded", () => {
  for (let i = 0; i < 1000; i++) {
    const code = generateDisplayCode();
    assert.match(code, /^\d{6}$/, `got "${code}"`);
  }
});

test("generateDisplayCode uses crypto randomness, not Math.random", async () => {
  const src = await readFile(servicePath, "utf8");
  assert.match(src, /randomInt/);
  assert.doesNotMatch(src, /Math\.random/);
});

test("stashAuthCode cleans up expired rows and retries on 23505 collision", async () => {
  const src = await readFile(servicePath, "utf8");
  const block = src.slice(src.indexOf("export async function stashAuthCode"));
  assert.match(block, /\.delete\(\)\s*\.lt\(["']expires_at["']/);
  assert.match(block, /23505/, "must retry only on unique-violation");
});

test("claimAuthCode is a single atomic delete-returning (single use)", async () => {
  const src = await readFile(servicePath, "utf8");
  const block = src.slice(src.indexOf("export async function claimAuthCode"));
  assert.match(block, /\.delete\(\)/);
  assert.match(block, /\.eq\(["']display_code["'],\s*displayCode\)/);
  assert.match(
    block,
    /\.gt\(["']expires_at["']/,
    "expiry must be enforced in the same statement"
  );
  assert.match(block, /\.select\(["']auth_code["']\)/);
});

test("claimAuthCode throws on DB error instead of returning null", async () => {
  const src = await readFile(servicePath, "utf8");
  const block = src.slice(src.indexOf("export async function claimAuthCode"));
  assert.match(block, /if\s*\(\s*error\s*\)\s*\{?\s*throw/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/api/auth-link-code-service.test.ts`
Expected: FAIL — cannot find module `apps/api/src/services/auth-link-code.ts`.

- [ ] **Step 3: Write the service**

Create `apps/api/src/services/auth-link-code.ts`:

```ts
/**
 * Cross-browser magic-link relay.
 *
 * When a magic link is opened in a browser without the PKCE code verifier
 * (e.g. Gmail's in-app browser), the callback page stashes the auth code here
 * under a 6-digit display code. The originating browser — which holds the
 * verifier — claims it and completes exchangeCodeForSession locally.
 *
 * A claimed auth code is useless without the verifier, so possession of the
 * display code alone never grants a session.
 */
import { randomInt } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

const CODE_TTL_MS = 5 * 60 * 1000;
const MAX_COLLISION_RETRIES = 3;

export function generateDisplayCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function stashAuthCode(
  db: SupabaseClient,
  authCode: string
): Promise<{ displayCode: string; expiresAt: string }> {
  // Opportunistic cleanup keeps the table tiny without pg_cron.
  await db
    .from("auth_link_codes")
    .delete()
    .lt("expires_at", new Date().toISOString());

  for (let attempt = 0; attempt < MAX_COLLISION_RETRIES; attempt++) {
    const displayCode = generateDisplayCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

    const { error } = await db.from("auth_link_codes").insert({
      display_code: displayCode,
      auth_code: authCode,
      expires_at: expiresAt,
    });

    if (!error) {
      return { displayCode, expiresAt };
    }
    if (error.code !== "23505") {
      throw new Error(`auth_link_codes insert failed: ${error.message}`);
    }
  }

  throw new Error("Could not generate a unique display code");
}

export async function claimAuthCode(
  db: SupabaseClient,
  displayCode: string
): Promise<string | null> {
  // Delete-returning makes the claim atomic: a code can be redeemed once,
  // and only while unexpired.
  const { data, error } = await db
    .from("auth_link_codes")
    .delete()
    .eq("display_code", displayCode)
    .gt("expires_at", new Date().toISOString())
    .select("auth_code");

  if (error) {
    throw new Error(`auth_link_codes claim failed: ${error.message}`);
  }
  if (!data || data.length === 0) {
    return null;
  }
  return data[0].auth_code as string;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test tests/api/auth-link-code-service.test.ts`
Expected: PASS (5 tests).

---

### Task 3: API endpoints + wiring

**Files:**
- Create: `apps/api/src/routes/auth-link-code.ts`
- Modify: `apps/api/src/index.ts` (one import + one mount near the existing `/api/auth` mount, ~lines 15 and 107)
- Test: `tests/api/auth-link-code-routes.test.ts`

**Interfaces:**
- Consumes: `stashAuthCode` / `claimAuthCode` from `../services/auth-link-code` (Task 2); `supabaseAdmin` from `../lib/supabase`; `rateLimit` from `../middleware/rate-limit`; `z` from `zod`.
- Produces (used by Tasks 5–6):
  - `POST /api/auth/link-code` body `{ "authCode": "<uuid>" }` → `200 { "displayCode": "123456", "expiresAt": "<iso>" }` | `400 { "error": "invalid_auth_code" }` | `429` | `500 { "error": "internal_error" }`.
  - `POST /api/auth/link-code/claim` body `{ "displayCode": "123456" }` → `200 { "authCode": "<uuid>" }` | `404 { "error": "invalid_or_expired" }` | `429` | `500 { "error": "internal_error" }`.
  - Export: `authLinkCodeRouter`.

- [ ] **Step 1: Write the failing test**

Create `tests/api/auth-link-code-routes.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const routePath = path.join(
  process.cwd(),
  "apps/api/src/routes/auth-link-code.ts"
);
const indexPath = path.join(process.cwd(), "apps/api/src/index.ts");

test("route file exports authLinkCodeRouter with stash and claim endpoints", async () => {
  const src = await readFile(routePath, "utf8");
  assert.match(src, /export const authLinkCodeRouter = Router\(\)/);
  assert.match(src, /authLinkCodeRouter\.post\(\s*["']\/["']/);
  assert.match(src, /authLinkCodeRouter\.post\(\s*["']\/claim["']/);
});

test("stash validates authCode as UUID via zod", async () => {
  const src = await readFile(routePath, "utf8");
  assert.match(src, /authCode:\s*z\.string\(\)\.uuid\(\)/);
});

test("claim validates displayCode as exactly 6 digits", async () => {
  const src = await readFile(routePath, "utf8");
  assert.match(src, /displayCode:\s*z\.string\(\)\.regex\(\/\^\\d\{6\}\$\/\)/);
});

test("both endpoints are rate limited with distinct counter keys", async () => {
  const src = await readFile(routePath, "utf8");
  // The generic rateLimit() factory keys on `api:<ip>` by default, so two
  // limiters with different windows would share one counter without keyFn.
  const stashBlock = src.slice(0, src.indexOf('"/claim"'));
  const claimBlock = src.slice(src.indexOf('"/claim"'));
  assert.match(stashBlock, /windowMs:\s*60 \* 60 \* 1000/);
  assert.match(stashBlock, /maxRequests:\s*10/);
  assert.match(stashBlock, /link-code-stash/);
  assert.match(claimBlock, /windowMs:\s*60 \* 1000/);
  assert.match(claimBlock, /maxRequests:\s*5/);
  assert.match(claimBlock, /link-code-claim/);
});

test("claim returns generic invalid_or_expired (no oracle)", async () => {
  const src = await readFile(routePath, "utf8");
  const claimBlock = src.slice(src.indexOf('"/claim"'));
  assert.match(claimBlock, /invalid_or_expired/);
  assert.doesNotMatch(claimBlock, /expired code|wrong code|not found/i);
});

test("router is mounted in index.ts with dashboardCors", async () => {
  const src = await readFile(indexPath, "utf8");
  assert.match(
    src,
    /import \{ authLinkCodeRouter \} from ["']\.\/routes\/auth-link-code["']/
  );
  assert.match(
    src,
    /app\.use\(["']\/api\/auth\/link-code["'],\s*dashboardCors,\s*authLinkCodeRouter\)/
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/api/auth-link-code-routes.test.ts`
Expected: FAIL — `ENOENT` on the route file.

- [ ] **Step 3: Write the route**

Create `apps/api/src/routes/auth-link-code.ts`:

```ts
/**
 * Cross-browser magic-link relay endpoints.
 *
 * POST /api/auth/link-code        - foreign browser stashes an unusable PKCE
 *                                   auth code, receives a 6-digit display code
 * POST /api/auth/link-code/claim  - originating browser redeems the display
 *                                   code for the auth code (single use)
 *
 * Both endpoints are unauthenticated by nature (callers are mid-sign-in) and
 * rate limited per IP. A claimed auth code cannot be exchanged without the
 * PKCE verifier, which only the originating browser holds.
 */
import { Router } from "express";
import { z } from "zod";

import { supabaseAdmin } from "../lib/supabase";
import { rateLimit } from "../middleware/rate-limit";
import { claimAuthCode, stashAuthCode } from "../services/auth-link-code";

export const authLinkCodeRouter = Router();

const StashSchema = z.object({
  authCode: z.string().uuid(),
});

const ClaimSchema = z.object({
  displayCode: z.string().regex(/^\d{6}$/),
});

authLinkCodeRouter.post(
  "/",
  rateLimit({
    windowMs: 60 * 60 * 1000,
    maxRequests: 10,
    keyFn: (req) => `link-code-stash:${req.ip}`,
  }),
  async (req, res) => {
    const parsed = StashSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "invalid_auth_code" });
    }

    try {
      const result = await stashAuthCode(supabaseAdmin, parsed.data.authCode);
      res.json(result);
    } catch (err) {
      console.error("[auth-link-code] stash failed:", err);
      res.status(500).json({ error: "internal_error" });
    }
  }
);

authLinkCodeRouter.post(
  "/claim",
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 5,
    keyFn: (req) => `link-code-claim:${req.ip}`,
  }),
  async (req, res) => {
    const parsed = ClaimSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(404).json({ error: "invalid_or_expired" });
    }

    try {
      const authCode = await claimAuthCode(
        supabaseAdmin,
        parsed.data.displayCode
      );
      if (!authCode) {
        return res.status(404).json({ error: "invalid_or_expired" });
      }
      res.json({ authCode });
    } catch (err) {
      console.error("[auth-link-code] claim failed:", err);
      res.status(500).json({ error: "internal_error" });
    }
  }
);
```

- [ ] **Step 4: Wire into `apps/api/src/index.ts`**

Add the import alphabetically with the other route imports (after the `auth` import, ~line 15):

```ts
import { authLinkCodeRouter } from "./routes/auth-link-code";
```

Add the mount immediately BEFORE the existing `app.use("/api/auth", dashboardCors, authRouter);` line (~line 107), so the more specific path is matched first:

```ts
app.use("/api/auth/link-code", dashboardCors, authLinkCodeRouter);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --experimental-strip-types --test tests/api/auth-link-code-routes.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Type check**

Run: `npm run type-check`
Expected: no errors in `apps/api`.

---

### Task 4: Shared post-auth redirect helper (extraction)

**Files:**
- Create: `apps/web/lib/auth/post-auth.ts`
- Test: `tests/web/post-auth-redirect.test.ts`

**Interfaces:**
- Consumes: `posthog-js`, `SupabaseClient` (type-only), the `projects` table, the existing public API endpoint `GET /api/invitations/pending?email=...`.
- Produces (used by Tasks 5–6):
  - `resolvePostAuthRedirect(supabase: SupabaseClient, user: { id: string; email?: string }, next: string): Promise<string>` — returns the path to `router.push`. Behavior is a 1:1 extraction of the logic currently inlined in `apps/web/app/(auth)/auth/callback/page.tsx` (posthog identify + `logged_in`, invite-URL detection, pending-invitation check, projects lookup, `signed_up` + `/onboarding` for new users, `/onboarding` for incomplete onboarding, otherwise `next`).

**Note:** this task only CREATES the helper. The callback page starts using it in Task 5 (single rewrite, no double edit).

- [ ] **Step 1: Write the failing test**

Create `tests/web/post-auth-redirect.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const helperPath = path.join(process.cwd(), "apps/web/lib/auth/post-auth.ts");

test("helper exports resolvePostAuthRedirect", async () => {
  const src = await readFile(helperPath, "utf8");
  assert.match(src, /export async function resolvePostAuthRedirect/);
});

test("helper preserves the exact post-auth decision logic", async () => {
  const src = await readFile(helperPath, "utf8");
  // Invite-flow detection: exactly /invite/{64-hex}
  assert.match(src, /\/\^\\\/invite\\\/\[a-f0-9\]\{64\}\$\/i/);
  // Pending-invitation check against the public API
  assert.match(src, /\/api\/invitations\/pending\?email=/);
  // Projects lookup excludes soft-deleted rows and limits to 1
  assert.match(src, /\.is\(["']deleted_at["'],\s*null\)/);
  assert.match(src, /\.limit\(1\)/);
  // New users: signed_up + onboarding
  assert.match(src, /posthog\.capture\(["']signed_up["']\)/);
  assert.match(src, /["']\/onboarding["']/);
  // Session analytics identity
  assert.match(src, /posthog\.identify\(/);
  assert.match(src, /posthog\.capture\(["']logged_in["']\)/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/web/post-auth-redirect.test.ts`
Expected: FAIL — `ENOENT` on the helper file.

- [ ] **Step 3: Write the helper**

Create `apps/web/lib/auth/post-auth.ts`:

```ts
/**
 * Post-authentication routing shared by the magic-link callback page and the
 * cross-browser verification-code path on the check-email page.
 *
 * Decides where a freshly signed-in user should land:
 * - invited users -> their invite (or `next` as given)
 * - brand-new users -> /onboarding (and emits `signed_up`)
 * - users with incomplete onboarding -> /onboarding
 * - everyone else -> `next`
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import posthog from "posthog-js";

interface AuthUser {
  id: string;
  email?: string;
}

// Must be exactly /invite/{64-char-hex-token}
const INVITE_PATH_RE = /^\/invite\/[a-f0-9]{64}$/i;

async function checkPendingInvitations(email: string): Promise<boolean> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(
      `${apiUrl}/api/invitations/pending?email=${encodeURIComponent(email)}`
    );

    if (!response.ok) {
      console.warn("Failed to check pending invitations:", response.status);
      return false;
    }

    const data = await response.json();
    return data.hasPendingInvitations === true;
  } catch (err) {
    console.warn("Error checking pending invitations:", err);
    return false;
  }
}

export async function resolvePostAuthRedirect(
  supabase: SupabaseClient,
  user: AuthUser,
  next: string
): Promise<string> {
  // Link this browser session to the authenticated user for all analytics,
  // then record the sign-in. Brand-new users additionally emit `signed_up`.
  posthog.identify(user.id, user.email ? { email: user.email } : undefined);
  posthog.capture("logged_in");

  // Invited users are joining someone else's project - never send them to
  // onboarding.
  if (INVITE_PATH_RE.test(next)) {
    return next;
  }
  if (user.email && (await checkPendingInvitations(user.email))) {
    return next;
  }

  // Use .limit(1) instead of .single() to avoid errors when multiple projects
  // exist.
  const { data: existingProjects, error: fetchError } = await supabase
    .from("projects")
    .select("id, settings")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .limit(1);

  if (fetchError) {
    console.error("Failed to check for existing projects:", fetchError);
    return next;
  }

  // New user with no projects -> onboarding
  if (!existingProjects || existingProjects.length === 0) {
    posthog.capture("signed_up");
    return "/onboarding";
  }

  const settings = existingProjects[0].settings as Record<
    string,
    unknown
  > | null;
  const onboarding = settings?.onboarding as Record<string, unknown> | null;

  if (onboarding && !onboarding.completed_at && !onboarding.skipped) {
    return "/onboarding";
  }

  return next;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test tests/web/post-auth-redirect.test.ts`
Expected: PASS (2 tests).

---

### Task 5: Callback page — use helper + relay UI

**Files:**
- Modify: `apps/web/app/(auth)/auth/callback/page.tsx` (full rewrite of `AuthCallbackContent`; the `CallbackFallback` component and default export stay as they are)
- Test: `tests/web/auth-callback-relay.test.ts`

**Interfaces:**
- Consumes: `resolvePostAuthRedirect` (Task 4); `POST /api/auth/link-code` (Task 3).
- Produces: on a verifier-type exchange failure with a `?code=` present, the page renders the display code instead of the error screen. All other behavior (success paths, other errors) is unchanged.

- [ ] **Step 1: Write the failing test**

Create `tests/web/auth-callback-relay.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const callbackPath = path.join(
  process.cwd(),
  "apps/web/app/(auth)/auth/callback/page.tsx"
);

test("callback uses the shared post-auth helper (logic no longer inlined)", async () => {
  const src = await readFile(callbackPath, "utf8");
  assert.match(src, /resolvePostAuthRedirect/);
  assert.match(src, /from ["']@\/lib\/auth\/post-auth["']/);
  assert.doesNotMatch(
    src,
    /posthog\.capture\(["']signed_up["']\)/,
    "signed_up now lives in the shared helper only"
  );
});

test("verifier failures trigger the relay instead of the error screen", async () => {
  const src = await readFile(callbackPath, "utf8");
  assert.match(src, /verifier/i);
  assert.match(src, /\/api\/auth\/link-code/);
  assert.doesNotMatch(src, /\/api\/auth\/link-code\/claim/);
});

test("relay screen shows the display code and where to enter it", async () => {
  const src = await readFile(callbackPath, "utf8");
  assert.match(src, /Use verification code to continue/);
  assert.match(src, /where you first tried to sign in/);
  assert.match(src, /expires in 5 minutes/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/web/auth-callback-relay.test.ts`
Expected: FAIL on all 3 tests (helper not imported, no relay).

- [ ] **Step 3: Rewrite `AuthCallbackContent`**

In `apps/web/app/(auth)/auth/callback/page.tsx`, replace everything from the top of the file down to (but not including) `function CallbackFallback()` with:

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { resolvePostAuthRedirect } from "@/lib/auth/post-auth";
import { createClient } from "@/lib/supabase/client";

/**
 * Auth callback content - handles PKCE code exchange client-side
 *
 * The magic link flow:
 * 1. User requests magic link (signInWithOtp) - browser stores PKCE code verifier
 * 2. User clicks email link -> Supabase verifies -> redirects here with ?code=...
 * 3. This page exchanges the code for a session using the stored code verifier
 * 4. On success, resolvePostAuthRedirect decides where the user lands
 *
 * Cross-browser case: if the link was opened in a browser that never initiated
 * the sign-in (e.g. Gmail's in-app browser), there is no code verifier and the
 * exchange cannot succeed here. Instead of a dead-end error, we stash the auth
 * code with the API in exchange for a 6-digit display code the user types back
 * in the original browser (which holds the verifier) on /login/check-email.
 *
 * Note: createBrowserClient has detectSessionInUrl: true by default, which means
 * it may automatically exchange the code. We handle both cases gracefully.
 */
function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [displayCode, setDisplayCode] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient();
      const next = searchParams?.get("next") ?? "/dashboard";

      const finishSignIn = async (user: { id: string; email?: string }) => {
        router.push(await resolvePostAuthRedirect(supabase, user, next));
      };

      // Trade the unusable auth code for a display code the user can type in
      // the browser where they started sign-in. Returns null on any failure so
      // the caller can fall back to the normal error screen.
      const stashForRelay = async (code: string): Promise<string | null> => {
        try {
          const apiUrl =
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
          const response = await fetch(`${apiUrl}/api/auth/link-code`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ authCode: code }),
          });
          if (!response.ok) return null;
          const data = await response.json();
          return typeof data.displayCode === "string" ? data.displayCode : null;
        } catch {
          return null;
        }
      };

      // First, check if we already have a session
      // (createBrowserClient with detectSessionInUrl: true may have already handled the code)
      const {
        data: { session: existingSession },
      } = await supabase.auth.getSession();

      if (existingSession?.user) {
        await finishSignIn(existingSession.user);
        return;
      }

      // No existing session, try to exchange the code
      const code = searchParams?.get("code");

      if (!code) {
        setError("No authorization code found. Please request a new magic link.");
        return;
      }

      try {
        const { data, error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error("Code exchange error:", exchangeError);

          // Even if exchange fails, check if session was established through another mechanism
          const {
            data: { session: retrySession },
          } = await supabase.auth.getSession();

          if (retrySession?.user) {
            await finishSignIn(retrySession.user);
            return;
          }

          // Missing or mismatched verifier = this browser didn't start the
          // sign-in. Offer the cross-browser verification code instead.
          if (exchangeError.message.toLowerCase().includes("verifier")) {
            const relayCode = await stashForRelay(code);
            if (relayCode) {
              setDisplayCode(relayCode);
              return;
            }
          }

          setError(
            exchangeError.message || "Failed to sign in. Please try again."
          );
          return;
        }

        if (data.user) {
          await finishSignIn(data.user);
          return;
        }
        router.push(next);
      } catch (err) {
        console.error("Unexpected error during auth callback:", err);

        // Last resort: check for session one more time
        const {
          data: { session: lastCheckSession },
        } = await supabase.auth.getSession();

        if (lastCheckSession?.user) {
          await finishSignIn(lastCheckSession.user);
          return;
        }

        setError("An unexpected error occurred. Please try again.");
      }
    };

    handleCallback();
  }, [searchParams, router]);

  if (displayCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-sm p-8 space-y-6 text-center">
          <h1 className="text-xl font-semibold">
            Use verification code to continue
          </h1>
          <p className="text-muted-foreground text-sm">
            Enter this code where you first tried to sign in.
          </p>
          <div className="text-4xl font-semibold tracking-[0.3em] tabular-nums py-4">
            {displayCode}
          </div>
          <p className="text-muted-foreground text-xs">
            This code expires in 5 minutes and can only be used once.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-sm p-8 space-y-6 text-center">
          <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-destructive"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold">Sign In Failed</h1>
          <p className="text-muted-foreground text-sm">{error}</p>
          <button
            onClick={() => router.push("/login")}
            className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 font-medium transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm p-8 space-y-6 text-center">
        <div className="mx-auto w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
          <svg
            className="w-6 h-6 text-primary-foreground animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold">Signing you in...</h1>
        <p className="text-muted-foreground text-sm">
          Please wait while we complete your sign in.
        </p>
      </div>
    </div>
  );
}
```

Notes on what changed vs. the old file:
- The `posthog` import, `checkPendingInvitations`, `setupNewUser`, and `isInvitationFlow` are gone — that logic now lives in `resolvePostAuthRedirect`.
- New `displayCode` state + `stashForRelay` + the verifier-failure branch + the relay screen.
- `CallbackFallback` and `AuthCallbackPage` at the bottom of the file are untouched.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --experimental-strip-types --test tests/web/auth-callback-relay.test.ts tests/web/post-auth-redirect.test.ts`
Expected: PASS (5 tests total).

- [ ] **Step 5: Type check**

Run: `npm run type-check`
Expected: no errors in `apps/web`.

---

### Task 6: Check-email code entry + returnUrl pass-through

**Files:**
- Modify: `apps/web/app/(auth)/login/page.tsx` (one line: the post-submit redirect)
- Modify: `apps/web/app/(auth)/login/check-email/page.tsx` (rewrite of `CheckEmailContent`; `CheckEmailFallback` and the default export stay)
- Test: `tests/web/check-email-verify.test.ts`

**Interfaces:**
- Consumes: `POST /api/auth/link-code/claim` (Task 3); `resolvePostAuthRedirect` (Task 4); `supabase.auth.exchangeCodeForSession`.
- Produces: an "Enter verification code" section on `/login/check-email`; `returnUrl` survives login → check-email → post-code-entry redirect.

- [ ] **Step 1: Write the failing test**

Create `tests/web/check-email-verify.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const loginPath = path.join(
  process.cwd(),
  "apps/web/app/(auth)/login/page.tsx"
);
const checkEmailPath = path.join(
  process.cwd(),
  "apps/web/app/(auth)/login/check-email/page.tsx"
);

test("login passes returnUrl through to check-email", async () => {
  const src = await readFile(loginPath, "utf8");
  const redirect = src.slice(src.indexOf("/login/check-email"));
  assert.match(redirect, /returnUrl/);
});

test("check-email claims the display code and exchanges locally", async () => {
  const src = await readFile(checkEmailPath, "utf8");
  assert.match(src, /\/api\/auth\/link-code\/claim/);
  assert.match(src, /exchangeCodeForSession/);
  assert.match(src, /resolvePostAuthRedirect/);
});

test("check-email verification input is 6-digit numeric", async () => {
  const src = await readFile(checkEmailPath, "utf8");
  assert.match(src, /maxLength=\{6\}/);
  assert.match(src, /inputMode="numeric"/);
});

test("check-email honors returnUrl after code entry and on resend", async () => {
  const src = await readFile(checkEmailPath, "utf8");
  assert.match(src, /returnUrl/);
  // Resend must preserve the next-destination the same way login does
  const resendBlock = src.slice(
    src.indexOf("const handleResend"),
    src.indexOf("const handleVerifyCode")
  );
  assert.match(resendBlock, /emailRedirectTo/);
  assert.match(resendBlock, /returnUrl/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/web/check-email-verify.test.ts`
Expected: FAIL on all 4 tests.

- [ ] **Step 3: Pass returnUrl through in `login/page.tsx`**

Replace:

```ts
      // Redirect to check-email page
      router.push(`/login/check-email?email=${encodeURIComponent(email)}`);
```

with:

```ts
      // Redirect to check-email page, preserving returnUrl for the
      // verification-code path
      router.push(
        returnUrl
          ? `/login/check-email?email=${encodeURIComponent(email)}&returnUrl=${encodeURIComponent(returnUrl)}`
          : `/login/check-email?email=${encodeURIComponent(email)}`
      );
```

(`returnUrl` is already in scope in `handleSubmit` — it is read a few lines above to build `callbackUrl`.)

- [ ] **Step 4: Rewrite `CheckEmailContent` in `check-email/page.tsx`**

Replace everything from the top of the file down to (but not including) `function CheckEmailFallback()` with:

```tsx
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect } from "react";

import { resolvePostAuthRedirect } from "@/lib/auth/post-auth";
import { createClient } from "@/lib/supabase/client";

function CheckEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams?.get("email") || "";
  const returnUrl = searchParams?.get("returnUrl");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [showCodeEntry, setShowCodeEntry] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const supabase = createClient();

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResend = async () => {
    if (!email || resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setResendSuccess(false);

    try {
      // Preserve returnUrl the same way the login page does
      const callbackUrl = returnUrl
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnUrl)}`
        : `${window.location.origin}/auth/callback`;

      await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: callbackUrl,
        },
      });

      setResendCooldown(60); // 60 second cooldown
      setResendSuccess(true);

      // Hide success message after 3 seconds
      setTimeout(() => setResendSuccess(false), 3000);
    } catch (err) {
      // Silently fail - user can try again
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifying || verifyCode.trim().length !== 6) return;

    setIsVerifying(true);
    setVerifyError(null);

    try {
      // Redeem the display code shown by the other browser for the PKCE auth
      // code, then exchange it here - where the code verifier lives.
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const response = await fetch(`${apiUrl}/api/auth/link-code/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayCode: verifyCode.trim() }),
      });

      if (!response.ok) {
        setVerifyError(
          "Invalid or expired code. Check the code, or resend the email to start over."
        );
        return;
      }

      const { authCode } = await response.json();
      const { data, error } = await supabase.auth.exchangeCodeForSession(
        authCode
      );

      if (error || !data.user) {
        setVerifyError(
          "Could not complete sign in. Please resend the email and try again."
        );
        return;
      }

      const next = returnUrl || "/dashboard";
      router.push(await resolvePostAuthRedirect(supabase, data.user, next));
    } catch (err) {
      setVerifyError("Something went wrong. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  // If no email, redirect back to login
  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No email address provided.</p>
          <Link href="/login" className="text-primary hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm p-8 space-y-6 text-center">
        {/* Email Icon */}
        <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>

        {/* Message */}
        <div>
          <h1 className="text-2xl font-semibold">Check your email</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            We sent a magic link to:
          </p>
          <p className="font-medium mt-1">{email}</p>
          <p className="text-muted-foreground mt-2 text-sm">
            Click the link to sign in.
          </p>
        </div>

        {/* Success Message */}
        {resendSuccess && (
          <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm p-3 rounded-md">
            Email sent successfully!
          </div>
        )}

        {/* Verification code entry - for links opened in a different browser */}
        <div className="border-t pt-6">
          {!showCodeEntry ? (
            <button
              onClick={() => setShowCodeEntry(true)}
              className="text-sm text-primary hover:underline"
            >
              Enter verification code
            </button>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Opened the link on another device or browser? Enter the code it
                shows you:
              </p>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                value={verifyCode}
                onChange={(e) =>
                  setVerifyCode(e.target.value.replace(/\D/g, ""))
                }
                placeholder="6-digit code"
                disabled={isVerifying}
                className="block w-full px-3 py-2.5 text-center text-lg tracking-[0.3em] tabular-nums border border-input rounded-md shadow-sm placeholder-muted-foreground placeholder:text-sm placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-background"
                aria-label="Verification code"
              />
              {verifyError && (
                <p className="text-sm text-destructive">{verifyError}</p>
              )}
              <button
                type="submit"
                disabled={isVerifying || verifyCode.length !== 6}
                className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {isVerifying ? "Verifying..." : "Verify code"}
              </button>
            </form>
          )}
        </div>

        {/* Resend Section */}
        <div className="border-t pt-6">
          <p className="text-sm text-muted-foreground mb-3">
            Didn&apos;t receive it?
          </p>
          <button
            onClick={handleResend}
            disabled={isResending || resendCooldown > 0}
            className="px-4 py-2 border border-input rounded-md text-sm font-medium hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isResending ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Sending...
              </span>
            ) : resendCooldown > 0 ? (
              `Resend in ${resendCooldown}s`
            ) : (
              "Resend email"
            )}
          </button>
        </div>

        {/* Back Link */}
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to login
        </Link>
      </div>
    </div>
  );
}
```

Notes on what changed vs. the old file:
- New imports: `useRouter`, `resolvePostAuthRedirect`.
- New state: `showCodeEntry`, `verifyCode`, `isVerifying`, `verifyError`; new `returnUrl` from search params.
- `handleResend` now preserves `returnUrl` in `emailRedirectTo` (it previously dropped it).
- New `handleVerifyCode` + the "Enter verification code" section between the message and the resend section.
- `CheckEmailFallback` and `CheckEmailPage` at the bottom of the file are untouched.

- [ ] **Step 5: Run test to verify it passes**

Run: `node --experimental-strip-types --test tests/web/check-email-verify.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Type check**

Run: `npm run type-check`
Expected: no errors.

---

### Task 7: Full verification

**Files:** none created; this task verifies the whole feature.

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: all tests pass, including the 5 new test files and every pre-existing test (no regressions).

- [ ] **Step 2: Type check + lint**

Run: `npm run type-check && npm run lint`
Expected: clean.

- [ ] **Step 3: Manual E2E (requires the user's help for the email)**

Start the stack (`npm run dev` — web on :3000, api on :3001, pointed at the dev Supabase project). Then, using Chrome DevTools MCP:

1. **Browser A (originating):** navigate to `http://localhost:3000/login`, submit the user's email. Confirm the check-email page shows and now has an "Enter verification code" option.
2. Ask the user to paste the magic-link URL from the email they receive (do NOT click it).
3. **Simulate the foreign browser in the same Chrome profile:** via `evaluate_script`, read and save the Supabase code-verifier cookie (its name contains `-auth-token-code-verifier`), then delete it. Open the pasted magic-link URL in a new page — with the verifier gone, the relay path should trigger and the page should display a 6-digit code.
4. **Restore browser A:** via `evaluate_script`, restore the saved verifier cookie. Navigate back to `/login/check-email?email=<the email>`, click "Enter verification code", type the displayed code, submit.
5. Expected: signed in, redirected to `/dashboard` (or `/onboarding` for a fresh account).
6. Negative check: claim the same code again via `curl -s -X POST http://localhost:3001/api/auth/link-code/claim -H "Content-Type: application/json" -d '{"displayCode":"<same code>"}'` → expect `404 {"error":"invalid_or_expired"}` (single use).

If the cookie choreography proves flaky, fall back to: two separate Chrome profiles/instances, or hand the steps to the user for a real phone + Gmail-app test. The feature is not "verified" until either this simulation or a real-device pass succeeds.

- [ ] **Step 4: Report completion**

Summarize for the user:
- What changed (files) — left uncommitted for IDE review.
- Migration applied to DEV only; **prod (`hynaqwwofkpaafvlckdm`) still needs `20260706000001_create_auth_link_codes.sql` before this ships** — flag it explicitly.
- E2E result (or what remains for a real-device test).
