# Temporary Staging Cron Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make cron configuration failures visible, allow the slow insights classifier enough HTTP time, and verify staging cron end-to-end through a temporary ngrok tunnel using the user-supplied staging secret.

**Architecture:** A forward-only migration replaces the shared Vault-to-pg_net helper, keeping configuration in one database function and assigning the classifier a long timeout. The local API continues to use the staging Supabase project, ngrok exposes it temporarily, and environment-specific Vault values are written outside migration history.

**Tech Stack:** PostgreSQL `pg_cron`, `pg_net`, Supabase Vault, Express, ngrok.

## Global Constraints

- Never record the staging secret in source control, plan text, logs, or the final response.
- Use the exact secret supplied by the user for both the local API process and staging Vault.
- Never point staging cron at `https://api.frontface.app` because that API targets production.
- Keep migration history environment-agnostic; Vault values remain out-of-band configuration.
- Do not stage, commit, or push.

---

### Task 1: Harden the Shared Cron HTTP Helper

**Files:**

- Create: `supabase/migrations/20260716033100_harden_cron_http_dispatch.sql`
- Create: `tests/api/cron-dispatch-migration.test.ts`

**Interfaces:**

- Consumes: `private.trigger_cron_endpoint(endpoint text)`, Vault names `cron_api_base_url` and `cron_secret`.
- Produces: visible configuration errors and endpoint-specific `pg_net` timeouts.

- [ ] **Step 1: Write the failing migration test**

  Assert that missing Vault values raise an exception, `net.http_post` receives `timeout_milliseconds`, the classifier timeout is `600000`, ordinary cron endpoints use `30000`, the function retains `SECURITY DEFINER` with an empty search path, and public execution stays revoked.

- [ ] **Step 2: Run the test and verify RED**

  Run:

  ```bash
  node --experimental-strip-types --test tests/api/cron-dispatch-migration.test.ts
  ```

  Expected: failure because the migration does not exist.

- [ ] **Step 3: Implement the replacement helper**

  Create the migration with one timeout expression:

  ```sql
  timeout_ms integer := case
    when endpoint = '/api/cron/classify-insights' then 600000
    else 30000
  end;
  ```

  Raise an exception if either Vault value is absent and pass `timeout_milliseconds := timeout_ms` to `net.http_post`.

- [ ] **Step 4: Run the test and verify GREEN**

  Re-run the Step 2 command and expect it to pass.

### Task 2: Apply, Configure, and Exercise Staging

**Files:**

- Read: `supabase/migrations/20260716033100_harden_cron_http_dispatch.sql`
- Runtime only: `apps/api/.env` plus a process-level override for the supplied secret; no source file receives the secret.

**Interfaces:**

- Consumes: local API port 3001, ngrok local API on port 4040, staging Vault.
- Produces: an HTTP 200 response in `net._http_response` for `/api/cron/classify-insights`.

- [ ] **Step 1: Apply the migration to staging**

  Apply the exact local SQL under migration name `harden_cron_http_dispatch`.

- [ ] **Step 2: Start the staging-backed API and tunnel**

  Ensure the API process on port 3001 uses the user-supplied `CRON_SECRET`, start `ngrok http 3001`, and read the HTTPS public URL from ngrok's local inspection API.

- [ ] **Step 3: Store temporary Vault configuration**

  Upsert `cron_api_base_url` with the discovered HTTPS URL and `cron_secret` with the exact user-supplied value. Do this through a runtime staging SQL call, never a migration file.

- [ ] **Step 4: Trigger and verify the classifier**

  Invoke:

  ```sql
  select private.trigger_cron_endpoint('/api/cron/classify-insights');
  ```

  Poll `net._http_response` for the returned request and require HTTP 200 with a successful JSON body. Verify the remaining eligible insight count is zero.

- [ ] **Step 5: Leave an explicit temporary-state handoff**

  Report the running tunnel/API state and that the Vault URL is temporary. Do not substitute a production URL. Do not stage or commit any files.
