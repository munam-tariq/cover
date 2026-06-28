# Security Hardening — 2026-06-26 (operator checklist)

Companion to migration `supabase/migrations/20260626000001_security_hardening.sql`. Full plan:
`~/.claude/plans/u-have-supabase-mcp-dreamy-flurry.md`. This file covers **Phase A** (database
hardening) rollout. Phases B (API/widget gating) and C (rate-limit/SSRF/extensions/auth toggle)
are tracked separately in the plan.

## What Phase A changes

- Drops the anon-readable `conversation_insights` "always-true" policy (the **critical** live leak).
- Drops the always-true INSERT policies on `message_feedback` and `pulse_responses` (writes now go
  through the Express API / service role).
- Revokes **all `anon`** privileges on 21 tenant tables (clears 21 `pg_graphql_anon_table_exposed`
  findings). **`authenticated` grants are untouched** — the dashboard reads some tables directly
  under per-user RLS.
- Revokes EXECUTE on 8 `SECURITY DEFINER` helper functions from `public/anon/authenticated`.
- Pins `search_path` on 18 functions.
- Sets a 5 MB `file_size_limit` on the public `assets` bucket.

## Two databases

| Env | Project ref | Reachable via MCP here? |
|-----|-------------|--------------------------|
| Dev | `gjotktstaruezfjnslup` | Yes — verified |
| Prod | `hynaqwwofkpaafvlckdm` | **No** (different org) — apply + verify manually |

⚠️ **Wrong-project hazard:** a deploy/upload script has historically defaulted to the wrong
Supabase project. **Always pass the project ref explicitly** on every prod command.

⚠️ **Prod migration drift:** project memory notes several earlier migrations are "DEV only, prod
pending." This migration is declarative and self-contained, but **bring prod up to date on the
migration history first** (`supabase migration list --linked`) so its baseline matches dev.

## Rollout

### 1. Dev
```bash
# Apply (pick ONE):
supabase db push --linked            # if dev is the linked project
# or apply 20260626000001_security_hardening.sql via the dev SQL editor / MCP apply_migration

# Verify (no secrets printed):
export SUPABASE_URL="https://gjotktstaruezfjnslup.supabase.co"
export SUPABASE_ANON_KEY="<dev anon key>"
pnpm security:probe:supabase
```
- **Before** the migration, `probe-supabase-anon` should report `conversation_insights` returning **200**.
- **After**, every protected table/RPC must be **denied**.
- Re-run the Supabase **Security Advisor** for the dev project: the 3 `rls_policy_always_true`,
  8 `authenticated_security_definer_function_executable`, 18 `function_search_path_mutable`, and
  21 `pg_graphql_anon_table_exposed` findings should clear.
- Optional: set `SUPABASE_AUTH_TEST_JWT=<a real signed-in user's access token>` before the probe
  to confirm the `authenticated` role also can't execute the RPCs.

### 2. Prod (`hynaqwwofkpaafvlckdm`)
```bash
supabase link --project-ref hynaqwwofkpaafvlckdm   # explicit ref — do NOT rely on a default
supabase migration list --linked                   # confirm prior migrations are present
supabase db push --linked                          # apply (or run the SQL in the prod SQL editor)

export SUPABASE_URL="https://hynaqwwofkpaafvlckdm.supabase.co"
export SUPABASE_ANON_KEY="<prod anon key>"
pnpm security:probe:supabase
```
Then run the Security Advisor for the prod project and confirm the same findings clear.
**Do not consider prod fixed until this probe + advisor pass is observed on prod.**

## Smoke test after applying (each env)
- Dashboard: sign in (auth callback reads `projects`), open the Knowledge page (realtime on
  `knowledge_sources`) and the Inbox (realtime on `conversations`/`messages`) — all must still work.
- Embedded widget on `apps/widget/test.html`: chat, lead capture, pulse, feedback, handoff still
  function (these go through the API / broadcast realtime, not the anon data API).

## Follow-ups not in this migration
- **Storage MIME allow-list (`assets`):** confirm the deploy uploads' Content-Types, then run the
  commented `allowed_mime_types` UPDATE at the bottom of the migration.
- **Auth → leaked-password protection:** enable in Supabase Dashboard → Authentication → Security
  (HaveIBeenPwned). Manual; clears `auth_leaked_password_protection`.
- **Extensions in `public` (`vector`, `pg_net`):** relocate to `extensions` in a dedicated
  maintenance window — moving `vector` can break `vector`-typed columns; pre-audit unqualified
  `vector`/`net` references first. Not part of this migration.
- **`authenticated` data-API exposure (21 GraphQL findings remain by design):** a later, fully
  audited pass can revoke `authenticated` on tables the browser never reads directly.

## Rollback
- Safe to roll back: the `file_size_limit` change and `search_path` pins.
- **Do NOT** roll back the policy drops or the anon revokes — that reopens the vulnerabilities.
  If a dashboard query unexpectedly breaks, the fix is to add a precise `authenticated` grant +
  owner-scoped RLS policy for that specific table, not to restore broad anon access.
