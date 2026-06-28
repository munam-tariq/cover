# E2E Test Blockers — 2026-06-22

Two production misconfigurations block the member invite + auth flow. Both stem from the `SupportBase → FrontFace` rebrand not being fully propagated to environment variables and Supabase settings.

---

## Bug 1 — Invite email links to `localhost:3000` instead of `frontface.app`

**Symptom:** When the owner invites a team member, the "Accept Invitation" link inside the email reads:

```
http://localhost:3000/invite/<token>
```

instead of:

```
https://frontface.app/invite/<token>
```

**Root cause:** The server-side code that generates the invite URL reads an `APP_URL` / `NEXT_PUBLIC_APP_URL` environment variable (or equivalent). In production, that variable is either missing or still set to `http://localhost:3000`.

**Fix:** Set the correct env var in the production API environment:

```
APP_URL=https://frontface.app
# or, depending on the variable name used in the invite-generation code:
NEXT_PUBLIC_APP_URL=https://frontface.app
```

Search the codebase for where the invite URL is constructed (likely something like `` `${process.env.APP_URL}/invite/${token}` `` in the team invite API route) and confirm which env var name is used.

---

## Bug 2 — Auth email confirmation redirects to `supportbase.app` (self-signed cert → Chrome rejects it)

**Symptom:** The email sent to new users for account confirmation contains a Supabase verify link that ends with:

```
&redirect_to=https://supportbase.app
```

`supportbase.app` serves a **self-signed TLS certificate**. Chrome refuses the connection with `ERR_CERT_AUTHORITY_INVALID`. The result: the entire sign-up confirmation flow is broken in Chrome (and any standard browser).

Additionally, the Supabase email template footer still reads:
```
© 2025 SupportBase · Built for vibe coders
```

**Root cause:** Two Supabase Auth settings were not updated during the rebrand:

1. **Site URL / Redirect URLs allowlist** — Supabase Auth → URL Configuration. The Site URL is still `https://supportbase.app` (or it is listed in the Additional Redirect URLs). This controls the default `redirect_to` in auth emails.
2. **Email templates** — Supabase Auth → Email Templates. The "Confirm signup" template hardcodes `supportbase.app` in the redirect URL or footer text.

**Fix (Supabase dashboard → Auth section of the prod project `hynaqwwofkpaafvlckdm`):**

1. **URL Configuration:**
   - Set **Site URL** → `https://frontface.app`
   - Add `https://frontface.app/**` to **Additional Redirect URLs** (remove any `supportbase.app` entries)

2. **Email Templates → Confirm signup:**
   - Replace any `supportbase.app` references with `frontface.app`
   - Update footer copy from `© 2025 SupportBase` to `© 2026 FrontFace` (or whatever the current branding is)

3. **Email Templates → Magic Link / Invite (if applicable):**
   - Same find-and-replace for `supportbase.app` → `frontface.app`

---

## Impact

| Flow | Status |
|------|--------|
| Owner login (existing user magic link) | ✅ Works (owner was already confirmed; magic link `redirect_to` goes to `frontface.app`) |
| New member invite email link | ❌ Points to `localhost:3000` |
| New member sign-up confirmation | ❌ Redirects to `supportbase.app` — Chrome SSL error |
| Widget / AI chat / analytics | ✅ Unaffected |

---

## Recommended fix order

1. Fix Supabase Auth URL config + email templates (Bug 2) — highest impact, browser-blocking
2. Fix `APP_URL` env var on prod API (Bug 1) — can also fix by redeploying with correct env
3. Re-run E2E invite flow after both fixes to confirm

Once both are fixed, the full E2E test can resume from **Phase 4 Step 4** (members accepting invites).
