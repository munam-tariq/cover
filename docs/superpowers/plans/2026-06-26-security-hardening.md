# Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the Supabase, public widget API, voice API, rate-limit, storage, and SSRF security issues found in the June 26, 2026 review without committing or staging changes automatically.

**Architecture:** Treat the browser widget/API boundary as an explicit public surface: every service-role-backed write needs either an allowed browser origin plus project identity or a scoped native client key, and every visitor/conversation operation needs a session-bound token. Treat Supabase as server-owned by default: revoke broad Data API exposure, remove public "service role" RLS policies, and keep privileged database functions out of direct client RPC paths.

**Tech Stack:** Express API, Supabase Postgres/RLS/Storage/Auth, Supabase MCP advisors, Next.js dashboard, TypeScript widget, Node `node:test`, pnpm/turbo.

## Global Constraints

- Do not run `git add`, `git commit`, or `git push`; the user reviews and commits manually.
- Follow DRY, KISS, and SOLID; avoid repeated route-specific authorization logic.
- No service-role key may be exposed to browser, widget, test HTML, logs, or docs.
- Public browser widget writes require an allowed `Origin`/`Referer` for the project; native clients may use a valid `X-FrontFace-Key` with stricter rate-limit scope.
- Service-role-backed API routes must verify tenant/project ownership before reading or writing tenant data.
- Supabase migrations must be verified with live SQL probes and Supabase Security Advisor.
- `pnpm audit --prod` must remain clean.
- Keep backwards compatibility only where it does not preserve an active vulnerability; failing closed is preferred for public writes.
- No automated commit steps; each task ends with a diff review and verification output.

---

## File Structure

- `supabase/migrations/<timestamp>_security_hardening.sql`  
  Drops vulnerable RLS policies, revokes broad direct Data API grants, hardens privileged functions, and tightens storage/extension/auth-related database settings that can be represented in SQL.

- `scripts/security/probe-supabase-anon.mjs`  
  Uses only `SUPABASE_URL` and `SUPABASE_ANON_KEY` to prove protected tables are not readable/writable through the anon Data API.

- `scripts/security/probe-supabase-rpc.mjs`  
  Uses `SUPABASE_URL` plus anon/auth test tokens when available to prove sensitive RPCs are not directly executable by client roles.

- `apps/api/src/middleware/public-widget-gate.ts`  
  Shared middleware for public widget routes. Resolves project ID from body/query/params, enforces valid client key or allowed browser domain, and records a normalized security context on the request.

- `apps/api/src/middleware/rate-limit.ts`  
  Adds a non-forgeable rate-limit key builder and a replaceable rate-limit store interface. Keeps the current memory store for local tests and enables Redis/Upstash in production.

- `apps/api/src/middleware/client-key.ts`  
  Extends client-key project matching beyond `req.body.projectId` so query and params routes can use the same gate.

- `apps/api/src/services/voice-session-token.ts`  
  Creates and verifies short-lived HMAC-signed voice session tokens binding `projectId`, `visitorId`, and optional `sessionId`.

- `apps/api/src/routes/chat.ts`  
  Removes or gates legacy conversation list/detail endpoints, feedback, rate-limit status, and `ensure-conversation`.

- `apps/api/src/routes/lead-capture.ts`  
  Applies the shared widget gate to lead capture submit/status/skip/defer/visit routes.

- `apps/api/src/routes/pulse.ts`  
  Applies the shared widget gate to campaign reads and response writes.

- `apps/api/src/routes/conversations.ts`  
  Applies the shared widget gate and visitor session token checks to widget conversation status/messages/typing/presence routes.

- `apps/api/src/routes/handoff.ts`  
  Applies the shared widget gate to public handoff availability/offline/handoff trigger routes.

- `apps/api/src/routes/customers.ts`  
  Applies the shared widget gate to `/api/customers/identify`.

- `apps/api/src/routes/voice.ts`  
  Gates voice config/session-end and requires a signed voice session token for `/api/voice/llm/chat/completions`.

- `apps/widget/src/utils/request.ts`  
  New widget fetch helper that consistently sends project ID, visitor ID, optional client key, and optional voice/session token headers.

- `apps/widget/src/widget.ts`, `apps/widget/src/loader.ts`, `apps/widget/src/utils/api.ts`, `apps/widget/src/utils/handoff.ts`, `apps/widget/src/utils/pulse-manager.ts`, `apps/widget/src/utils/elevenlabs-voice.ts`, `apps/widget/src/components/chat-window.ts`  
  Reads optional embed client key and uses the shared widget fetch helper for every API call.

- `apps/web/lib/widget-embed.ts` and dashboard embed-code callers  
  Adds optional `data-client-key` to generated embed snippets after fetching/creating an active publishable key for the project.

- `tests/api/public-widget-gate.test.ts`  
  Unit tests for project ID resolution, domain/client-key authorization behavior, and fail-closed responses.

- `tests/api/voice-session-token.test.ts`  
  Unit tests for HMAC token signing, expiration, tamper rejection, and project/visitor binding.

- `tests/api/security-route-inventory.test.ts`  
  Static regression test ensuring public widget-mounted routes use an allowlisted gate or are explicitly documented as read-only public config.

- `tests/widget/widget-request.test.ts` and `tests/web/widget-embed.test.ts`  
  Regression tests for widget headers and embed code.

- `docs/security/security-hardening-2026-06-26.md`  
  Short operator checklist for rollout, env vars, Supabase advisor verification, and manual dashboard/Auth settings.

---

### Task 1: Lock Down Supabase Direct Access

**Files:**
- Create: `supabase/migrations/<timestamp>_security_hardening.sql`
- Create: `scripts/security/probe-supabase-anon.mjs`
- Create: `scripts/security/probe-supabase-rpc.mjs`
- Modify: `package.json`
- Document: `docs/security/security-hardening-2026-06-26.md`

**Interfaces:**
- Produces: `pnpm security:probe:supabase` command.
- Produces: a migration that makes `conversation_insights`, `message_feedback`, `pulse_responses`, privileged RPCs, and public storage safer without requiring browser clients to use the Supabase Data API directly.

- [ ] **Step 1: Create the migration with the Supabase CLI**

Run:

```bash
supabase migration new security_hardening
```

Expected: a new file named like `supabase/migrations/20260626HHMMSS_security_hardening.sql`.

- [ ] **Step 2: Add the database hardening SQL**

Paste this SQL into the new migration file:

```sql
-- June 2026 security hardening.
-- Service-role clients bypass RLS; "Service role ..." PUBLIC policies are unsafe and unnecessary.

begin;

-- Critical leak: conversation_insights was readable through anon REST because this policy
-- applied to PUBLIC, not just service_role.
drop policy if exists "Service role full access to insights" on public.conversation_insights;
revoke all privileges on table public.conversation_insights from anon, authenticated;

-- These public insert policies are no longer needed once widget writes go through the API gate.
drop policy if exists "anyone_can_submit_feedback" on public.message_feedback;
drop policy if exists "Anyone can submit pulse responses" on public.pulse_responses;
revoke all privileges on table public.message_feedback from anon, authenticated;
revoke all privileges on table public.pulse_responses from anon, authenticated;

-- Mutating SECURITY DEFINER functions must not be directly callable by signed-in users.
revoke execute on function public.append_late_answer(uuid, jsonb) from authenticated;
revoke execute on function public.mark_late_answer_promoted(uuid, integer) from authenticated;

-- Direct RPC execution is not needed for these service/API helpers. RLS policies should be
-- rewritten to direct predicates or private-schema helpers before revoking helpers used by RLS.
revoke execute on function public.get_available_agents(uuid) from authenticated;
revoke execute on function public.get_queue_position(uuid) from authenticated;

-- Fix mutable search_path on remaining functions while follow-up policy rewrites are applied.
alter function public.append_late_answer(uuid, jsonb) set search_path = public, pg_temp;
alter function public.mark_late_answer_promoted(uuid, integer) set search_path = public, pg_temp;
alter function public.get_available_agents(uuid) set search_path = public, pg_temp;
alter function public.get_queue_position(uuid) set search_path = public, pg_temp;
alter function public.get_project_role(uuid, uuid) set search_path = public, pg_temp;
alter function public.has_project_access(uuid, uuid) set search_path = public, pg_temp;
alter function public.is_project_agent(uuid, uuid) set search_path = public, pg_temp;
alter function public.is_project_owner(uuid, uuid) set search_path = public, pg_temp;
alter function public.fts_search_chunks(text, integer, uuid) set search_path = public, pg_temp;
alter function public.hybrid_search_chunks(vector, text, integer, uuid, double precision) set search_path = public, pg_temp;
alter function public.match_knowledge_chunks(vector, double precision, integer, uuid) set search_path = public, pg_temp;
alter function public.get_user_by_api_key(text) set search_path = public, pg_temp;
alter function public.increment_pulse_response_count() set search_path = public, pg_temp;
alter function public.update_updated_at_column() set search_path = public, pg_temp;
alter function public.update_conversation_message_count() set search_path = public, pg_temp;
alter function public.update_customer_conversation_count() set search_path = public, pg_temp;
alter function public.update_source_chunk_count() set search_path = public, pg_temp;
alter function public.check_domain_allowed(uuid, text) set search_path = public, pg_temp;

-- Defense in depth for the public assets bucket. Keep JS/CSS/image MIME types because this bucket
-- serves both widget bundles and tenant visual assets.
update storage.buckets
set
  file_size_limit = coalesce(file_size_limit, 5242880),
  allowed_mime_types = coalesce(
    allowed_mime_types,
    array[
      'application/javascript',
      'text/javascript',
      'text/css',
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/gif',
      'image/svg+xml'
    ]::text[]
  )
where id = 'assets';

commit;
```

- [ ] **Step 3: Add the anon probe script**

Create `scripts/security/probe-supabase-anon.mjs`:

```js
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error("Missing SUPABASE_URL and SUPABASE_ANON_KEY");
  process.exit(2);
}

const protectedTables = [
  "conversation_insights",
  "message_feedback",
  "pulse_responses",
  "qualified_leads",
  "project_client_keys",
];

let failed = false;

for (const table of protectedTables) {
  const response = await fetch(`${url}/rest/v1/${table}?select=id&limit=1`, {
    headers: { apikey: anon, Authorization: `Bearer ${anon}` },
  });
  const body = await response.text();
  if (response.status === 200) {
    console.error(`${table}: expected denied, got 200 (${body.slice(0, 120)})`);
    failed = true;
  } else {
    console.log(`${table}: denied as expected (${response.status})`);
  }
}

process.exit(failed ? 1 : 0);
```

- [ ] **Step 4: Add the RPC probe script**

Create `scripts/security/probe-supabase-rpc.mjs`:

```js
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const token = process.env.SUPABASE_AUTH_TEST_JWT || anon;

if (!url || !anon || !token) {
  console.error("Missing SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_AUTH_TEST_JWT");
  process.exit(2);
}

const calls = [
  {
    name: "append_late_answer",
    body: { lead_id: "00000000-0000-0000-0000-000000000000", late_answer: {} },
  },
  {
    name: "mark_late_answer_promoted",
    body: { lead_id: "00000000-0000-0000-0000-000000000000", answer_index: 0 },
  },
  {
    name: "get_available_agents",
    body: { p_project_id: "00000000-0000-0000-0000-000000000000" },
  },
  {
    name: "get_queue_position",
    body: { p_conversation_id: "00000000-0000-0000-0000-000000000000" },
  },
];

let failed = false;

for (const call of calls) {
  const response = await fetch(`${url}/rest/v1/rpc/${call.name}`, {
    method: "POST",
    headers: {
      apikey: anon,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(call.body),
  });
  if (response.status < 400) {
    console.error(`${call.name}: expected denied, got ${response.status}`);
    failed = true;
  } else {
    console.log(`${call.name}: denied as expected (${response.status})`);
  }
}

process.exit(failed ? 1 : 0);
```

- [ ] **Step 5: Add package scripts**

Modify the root `package.json` scripts:

```json
{
  "security:probe:supabase": "node scripts/security/probe-supabase-anon.mjs && node scripts/security/probe-supabase-rpc.mjs"
}
```

- [ ] **Step 6: Apply to staging and verify**

Run:

```bash
pnpm security:probe:supabase
```

Expected before migration: at least `conversation_insights` fails with a `200`.  
Expected after migration: all listed tables/RPCs are denied.

Run Supabase MCP Security Advisor after applying. Expected remaining findings may include public extensions and GraphQL object exposure until Tasks 8 and 9.

- [ ] **Step 7: Review diff**

Run:

```bash
git diff -- supabase/migrations scripts/security package.json docs/security
```

Expected: only migration, probe scripts, package script, and security doc changes. Do not stage or commit.

---

### Task 2: Add a Shared Public Widget Gate

**Files:**
- Create: `apps/api/src/middleware/public-widget-gate.ts`
- Modify: `apps/api/src/middleware/client-key.ts`
- Test: `tests/api/public-widget-gate.test.ts`

**Interfaces:**
- Produces: `getProjectIdFromRequest(req, sources): string | undefined`
- Produces: `requirePublicWidgetAccess(options): RequestHandler[]`
- Produces: `req.publicWidgetAccess = { projectId, mode, keyId?, domain? }`

- [ ] **Step 1: Write tests for project ID resolution and fail-closed behavior**

Create `tests/api/public-widget-gate.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import {
  getProjectIdFromRequest,
  makePublicWidgetRateKey,
} from "../../apps/api/src/middleware/public-widget-gate.ts";

test("getProjectIdFromRequest resolves body, query, and params in order", () => {
  const req = {
    body: { projectId: "body-project" },
    query: { projectId: "query-project" },
    params: { projectId: "params-project" },
  } as any;

  assert.equal(
    getProjectIdFromRequest(req, [
      { source: "query", key: "projectId" },
      { source: "body", key: "projectId" },
      { source: "params", key: "projectId" },
    ]),
    "query-project"
  );
});

test("makePublicWidgetRateKey does not trust visitorId alone", () => {
  const req = {
    ip: "203.0.113.9",
    headers: { "x-forwarded-for": "198.51.100.8, 10.0.0.1" },
    body: { visitorId: "attacker-controlled" },
  } as any;

  assert.equal(
    makePublicWidgetRateKey(req, {
      projectId: "project-1",
      action: "lead-submit",
    }),
    "project-1:lead-submit:ip:198.51.100.8"
  );
});

test("makePublicWidgetRateKey namespaces valid client keys", () => {
  const req = {
    ip: "203.0.113.9",
    headers: {},
    clientKey: { keyId: "key-1", projectId: "project-1" },
  } as any;

  assert.equal(
    makePublicWidgetRateKey(req, {
      projectId: "project-1",
      action: "chat-message",
    }),
    "project-1:chat-message:key:key-1"
  );
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
pnpm test -- tests/api/public-widget-gate.test.ts
```

Expected: FAIL because `public-widget-gate.ts` does not exist.

- [ ] **Step 3: Implement the gate module**

Create `apps/api/src/middleware/public-widget-gate.ts`:

```ts
import type { NextFunction, Request, RequestHandler, Response } from "express";

import { domainWhitelistMiddleware, extractDomain } from "./domain-whitelist";
import { clientKeyMiddleware } from "./client-key";
import { rateLimit } from "./rate-limit";

type ProjectIdSource = "body" | "query" | "params";

export interface ProjectIdLocator {
  source: ProjectIdSource;
  key: string;
}

export interface PublicWidgetAccess {
  projectId: string;
  mode: "client-key" | "browser-origin";
  keyId?: string;
  domain?: string;
}

declare global {
  namespace Express {
    interface Request {
      publicWidgetAccess?: PublicWidgetAccess;
    }
  }
}

export function getProjectIdFromRequest(
  req: Request,
  sources: ProjectIdLocator[]
): string | undefined {
  for (const source of sources) {
    const container =
      source.source === "body"
        ? req.body
        : source.source === "query"
          ? req.query
          : req.params;
    const value = container?.[source.key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function forwardedIp(req: Request): string {
  const raw = req.headers["x-forwarded-for"];
  if (typeof raw === "string" && raw.trim()) return raw.split(",")[0].trim();
  if (Array.isArray(raw) && raw[0]) return raw[0].split(",")[0].trim();
  return req.ip || "unknown";
}

export function makePublicWidgetRateKey(
  req: Request,
  options: { projectId: string; action: string }
): string {
  if (req.clientKey?.keyId) {
    return `${options.projectId}:${options.action}:key:${req.clientKey.keyId}`;
  }
  return `${options.projectId}:${options.action}:ip:${forwardedIp(req)}`;
}

export function requirePublicWidgetAccess(options: {
  projectIdSources: ProjectIdLocator[];
  action: string;
  requireBrowserOrigin?: boolean;
  maxPerMinute?: number;
}): RequestHandler[] {
  const maxPerMinute = options.maxPerMinute ?? 60;

  const setBodyProjectId: RequestHandler = (req, res, next) => {
    const projectId = getProjectIdFromRequest(req, options.projectIdSources);
    if (!projectId) {
      res.status(400).json({
        error: { code: "PROJECT_ID_REQUIRED", message: "projectId is required" },
      });
      return;
    }
    req.body = { ...(req.body || {}), projectId };
    next();
  };

  const authorize: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    const projectId = req.body.projectId;
    if (req.clientKey) {
      if (req.clientKey.projectId !== projectId) {
        res.status(403).json({
          error: {
            code: "KEY_PROJECT_MISMATCH",
            message: "This client key is not authorized for the requested project",
          },
        });
        return;
      }
      req.publicWidgetAccess = {
        projectId,
        mode: "client-key",
        keyId: req.clientKey.keyId,
      };
      next();
      return;
    }

    const domain = extractDomain(req);
    if (!domain && options.requireBrowserOrigin !== false) {
      res.status(403).json({
        error: {
          code: "MISSING_ORIGIN",
          message: "Request must include Origin or Referer header",
        },
      });
      return;
    }

    const domainGate = domainWhitelistMiddleware({
      requireDomain: options.requireBrowserOrigin !== false,
      projectIdSource: "body",
    });

    domainGate(req, res, (err?: unknown) => {
      if (err) return next(err);
      req.publicWidgetAccess = {
        projectId,
        mode: "browser-origin",
        domain: domain || undefined,
      };
      next();
    });
  };

  return [
    setBodyProjectId,
    clientKeyMiddleware,
    authorize,
    rateLimit({
      windowMs: 60_000,
      maxRequests: maxPerMinute,
      keyFn: (req) =>
        makePublicWidgetRateKey(req, {
          projectId: req.body.projectId,
          action: options.action,
        }),
    }),
  ];
}
```

- [ ] **Step 4: Run the gate tests**

Run:

```bash
pnpm test -- tests/api/public-widget-gate.test.ts
```

Expected: PASS.

- [ ] **Step 5: Review diff**

Run:

```bash
git diff -- apps/api/src/middleware tests/api/public-widget-gate.test.ts
```

Expected: one shared middleware and one focused test file. Do not stage or commit.

---

### Task 3: Apply the Gate to Public Widget Routes

**Files:**
- Modify: `apps/api/src/routes/chat.ts`
- Modify: `apps/api/src/routes/lead-capture.ts`
- Modify: `apps/api/src/routes/pulse.ts`
- Modify: `apps/api/src/routes/conversations.ts`
- Modify: `apps/api/src/routes/handoff.ts`
- Modify: `apps/api/src/routes/customers.ts`
- Test: `tests/api/security-route-inventory.test.ts`

**Interfaces:**
- Consumes: `requirePublicWidgetAccess` from Task 2.
- Produces: every service-role-backed widget route has a gate before handler execution.

- [ ] **Step 1: Write the route inventory regression test**

Create `tests/api/security-route-inventory.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const REQUIRED = [
  ["apps/api/src/routes/lead-capture.ts", "requirePublicWidgetAccess"],
  ["apps/api/src/routes/pulse.ts", "requirePublicWidgetAccess"],
  ["apps/api/src/routes/conversations.ts", "requirePublicWidgetAccess"],
  ["apps/api/src/routes/handoff.ts", "requirePublicWidgetAccess"],
  ["apps/api/src/routes/customers.ts", "requirePublicWidgetAccess"],
];

test("public widget route files import the shared public widget gate", () => {
  for (const [file, symbol] of REQUIRED) {
    const source = readFileSync(file, "utf8");
    assert.match(source, new RegExp(symbol), `${file} must use ${symbol}`);
  }
});

test("legacy chat session list endpoints are removed or explicitly dashboard-authenticated", () => {
  const source = readFileSync("apps/api/src/routes/chat.ts", "utf8");
  assert.doesNotMatch(source, /chatRouter\.get\("\\/conversations"/);
  assert.doesNotMatch(source, /chatRouter\.get\("\\/conversations\\/:id"/);
});

test("feedback and ensure-conversation use the shared gate", () => {
  const source = readFileSync("apps/api/src/routes/chat.ts", "utf8");
  assert.match(source, /requirePublicWidgetAccess/);
  assert.doesNotMatch(source, /domainWhitelistMiddleware\(\{ requireDomain: false/);
});
```

- [ ] **Step 2: Run the failing route inventory test**

Run:

```bash
pnpm test -- tests/api/security-route-inventory.test.ts
```

Expected: FAIL because routes are not all gated yet and legacy chat list endpoints still exist.

- [ ] **Step 3: Remove or dashboard-protect legacy chat session endpoints**

Modify `apps/api/src/routes/chat.ts`:

- Delete `chatRouter.get("/conversations/:id", ...)`.
- Delete `chatRouter.get("/conversations", ...)`.
- Keep dashboard conversation access in `apps/api/src/routes/conversations.ts` behind `authMiddleware`.

Expected behavior: `/api/chat/conversations` and `/api/chat/conversations/:id` return 404 from the public router.

- [ ] **Step 4: Gate chat feedback and ensure-conversation**

In `apps/api/src/routes/chat.ts`, replace the feedback domain middleware with:

```ts
import { requirePublicWidgetAccess } from "../middleware/public-widget-gate";

const widgetBodyGate = (action: string, maxPerMinute = 60) =>
  requirePublicWidgetAccess({
    projectIdSources: [{ source: "body", key: "projectId" }],
    action,
    requireBrowserOrigin: true,
    maxPerMinute,
  });
```

Use it on:

```ts
chatRouter.post("/feedback", ...widgetBodyGate("feedback", 30), async (req, res) => {
  // existing handler
});

chatRouter.post("/ensure-conversation", ...widgetBodyGate("ensure-conversation", 30), async (req, res) => {
  // existing handler
});
```

- [ ] **Step 5: Gate lead capture routes**

In `apps/api/src/routes/lead-capture.ts`, import `requirePublicWidgetAccess` and replace `chatRateLimiter` on write routes with:

```ts
const leadBodyGate = (action: string, maxPerMinute = 30) =>
  requirePublicWidgetAccess({
    projectIdSources: [{ source: "body", key: "projectId" }],
    action,
    requireBrowserOrigin: true,
    maxPerMinute,
  });

const leadQueryGate = (action: string, maxPerMinute = 60) =>
  requirePublicWidgetAccess({
    projectIdSources: [{ source: "query", key: "projectId" }],
    action,
    requireBrowserOrigin: true,
    maxPerMinute,
  });
```

Apply:

```ts
leadCaptureRouter.post("/lead-capture/submit-form", ...leadBodyGate("lead-submit-form"), handler);
leadCaptureRouter.post("/lead-capture/submit-inline", ...leadBodyGate("lead-submit-inline"), handler);
leadCaptureRouter.post("/lead-capture/skip", ...leadBodyGate("lead-skip"), handler);
leadCaptureRouter.get("/lead-capture/status", ...leadQueryGate("lead-status"), handler);
leadCaptureRouter.post("/lead-capture/defer", ...leadBodyGate("lead-defer"), handler);
leadCaptureRouter.post("/lead-capture/visit", ...leadBodyGate("lead-visit"), handler);
```

- [ ] **Step 6: Gate pulse widget routes**

In `apps/api/src/routes/pulse.ts`, apply:

```ts
pulseWidgetRouter.get(
  "/campaigns/:projectId",
  ...requirePublicWidgetAccess({
    projectIdSources: [{ source: "params", key: "projectId" }],
    action: "pulse-campaigns",
    requireBrowserOrigin: true,
    maxPerMinute: 120,
  }),
  handler
);

pulseWidgetRouter.post(
  "/responses",
  ...requirePublicWidgetAccess({
    projectIdSources: [{ source: "body", key: "project_id" }],
    action: "pulse-response",
    requireBrowserOrigin: true,
    maxPerMinute: 30,
  }),
  handler
);
```

Inside the response handler, normalize:

```ts
const project_id = req.publicWidgetAccess?.projectId;
```

- [ ] **Step 7: Gate widget conversation routes**

In `apps/api/src/routes/conversations.ts`, apply `requirePublicWidgetAccess` to:

- `POST /`
- `GET /:id/status`
- `GET /:id/messages/public`
- `POST /:id/typing`
- `POST /:id/presence`
- `GET /:id/presence`

For routes where `projectId` is not in the path, require it in query/body and verify the conversation belongs to `(projectId, visitorId)` before returning data.

- [ ] **Step 8: Gate handoff and customer public routes**

Apply `requirePublicWidgetAccess` to:

- `GET /api/projects/:id/handoff-availability`
- `POST /api/conversations/:id/handoff`
- `POST /api/customers/identify`

For conversation ID routes, fetch `project_id` and `visitor_id` first with `supabaseAdmin.select("project_id, visitor_id")`, then reject if the request project or visitor does not match.

- [ ] **Step 9: Run route inventory and API tests**

Run:

```bash
pnpm test -- tests/api/security-route-inventory.test.ts tests/api/public-widget-gate.test.ts
pnpm --filter @frontface/api type-check
```

Expected: tests pass and API type-check passes.

- [ ] **Step 10: Review diff**

Run:

```bash
git diff -- apps/api/src/routes apps/api/src/middleware tests/api
```

Expected: public routes consistently use `requirePublicWidgetAccess`; legacy public chat session endpoints are gone. Do not stage or commit.

---

### Task 4: Add Visitor-Bound Tokens for Conversation Reads/Writes

**Files:**
- Create: `apps/api/src/services/widget-session-token.ts`
- Modify: `apps/api/src/routes/chat.ts`
- Modify: `apps/api/src/routes/conversations.ts`
- Modify: `apps/widget/src/utils/request.ts`
- Modify: `apps/widget/src/utils/storage.ts`
- Modify: `apps/widget/src/components/chat-window.ts`
- Test: `tests/api/widget-session-token.test.ts`
- Test: `tests/widget/widget-request.test.ts`

**Interfaces:**
- Produces: `signWidgetSessionToken(payload): string`
- Produces: `verifyWidgetSessionToken(token): WidgetSessionClaims`
- Produces: `x-frontface-session` header on widget requests after conversation creation.

- [ ] **Step 1: Write token tests**

Create `tests/api/widget-session-token.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import {
  signWidgetSessionToken,
  verifyWidgetSessionToken,
} from "../../apps/api/src/services/widget-session-token.ts";

test("widget session token verifies matching project, visitor, and conversation", () => {
  const token = signWidgetSessionToken(
    {
      projectId: "project-1",
      visitorId: "visitor-1",
      conversationId: "conversation-1",
      exp: Math.floor(Date.now() / 1000) + 60,
    },
    "test-secret"
  );

  assert.deepEqual(verifyWidgetSessionToken(token, "test-secret"), {
    projectId: "project-1",
    visitorId: "visitor-1",
    conversationId: "conversation-1",
    exp: JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString("utf8")).exp,
  });
});

test("widget session token rejects tampering", () => {
  const token = signWidgetSessionToken(
    {
      projectId: "project-1",
      visitorId: "visitor-1",
      conversationId: "conversation-1",
      exp: Math.floor(Date.now() / 1000) + 60,
    },
    "test-secret"
  );

  assert.throws(() => verifyWidgetSessionToken(`${token}x`, "test-secret"), /Invalid widget session token/);
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
pnpm test -- tests/api/widget-session-token.test.ts
```

Expected: FAIL because the service does not exist.

- [ ] **Step 3: Implement token signing**

Create `apps/api/src/services/widget-session-token.ts`:

```ts
import crypto from "node:crypto";

export interface WidgetSessionClaims {
  projectId: string;
  visitorId: string;
  conversationId: string;
  exp: number;
}

function secret(provided?: string): string {
  const value = provided || process.env.WIDGET_SESSION_SECRET || process.env.ENCRYPTION_KEY;
  if (!value) throw new Error("WIDGET_SESSION_SECRET is required");
  return value;
}

function sign(data: string, key: string): string {
  return crypto.createHmac("sha256", key).update(data).digest("base64url");
}

export function signWidgetSessionToken(
  claims: WidgetSessionClaims,
  providedSecret?: string
): string {
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${payload}.${sign(payload, secret(providedSecret))}`;
}

export function verifyWidgetSessionToken(
  token: string | undefined,
  providedSecret?: string
): WidgetSessionClaims {
  if (!token) throw new Error("Missing widget session token");
  const [payload, signature] = token.split(".");
  if (!payload || !signature) throw new Error("Invalid widget session token");
  const expected = sign(payload, secret(providedSecret));
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error("Invalid widget session token");
  }
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as WidgetSessionClaims;
  if (!claims.exp || claims.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Expired widget session token");
  }
  return claims;
}
```

- [ ] **Step 4: Return the token from conversation creation**

In `chat.ts` `ensure-conversation` and `conversations.ts` widget `POST /`, return:

```ts
sessionToken: signWidgetSessionToken({
  projectId,
  visitorId,
  conversationId,
  exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
})
```

- [ ] **Step 5: Require the token on public conversation read/write routes**

For `GET /:id/status`, `GET /:id/messages/public`, `POST /:id/typing`, `POST /:id/presence`, `GET /:id/presence`, and feedback updates, verify:

```ts
const claims = verifyWidgetSessionToken(req.headers["x-frontface-session"] as string | undefined);
if (
  claims.projectId !== req.publicWidgetAccess?.projectId ||
  claims.conversationId !== req.params.id ||
  claims.visitorId !== req.query.visitorId && claims.visitorId !== req.body?.visitorId
) {
  return res.status(403).json({
    error: { code: "SESSION_MISMATCH", message: "Invalid widget session" },
  });
}
```

- [ ] **Step 6: Store and send the token from the widget**

Create `apps/widget/src/utils/request.ts`:

```ts
export interface WidgetRequestContext {
  projectId: string;
  visitorId?: string;
  clientKey?: string | null;
  sessionToken?: string | null;
}

export function widgetHeaders(context: WidgetRequestContext): HeadersInit {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (context.visitorId) headers["X-Visitor-Id"] = context.visitorId;
  if (context.clientKey) headers["X-FrontFace-Key"] = context.clientKey;
  if (context.sessionToken) headers["X-FrontFace-Session"] = context.sessionToken;
  return headers;
}
```

Update widget API calls to use `widgetHeaders(...)`, persist returned `sessionToken`, and include it on conversation status/messages/typing/presence/feedback.

- [ ] **Step 7: Run tests**

Run:

```bash
pnpm test -- tests/api/widget-session-token.test.ts tests/widget/widget-request.test.ts
pnpm --filter @frontface/widget type-check
pnpm --filter @frontface/api type-check
```

Expected: all pass.

- [ ] **Step 8: Review diff**

Run:

```bash
git diff -- apps/api/src/services apps/api/src/routes apps/widget/src tests/api tests/widget
```

Expected: session token is created once and reused by widget API calls. Do not stage or commit.

---

### Task 5: Harden Voice API

**Files:**
- Create: `apps/api/src/services/voice-session-token.ts`
- Modify: `apps/api/src/routes/voice.ts`
- Modify: `apps/widget/src/utils/elevenlabs-voice.ts`
- Modify: `apps/widget/src/components/chat-window.ts`
- Test: `tests/api/voice-session-token.test.ts`

**Interfaces:**
- Produces: `signVoiceSessionToken(payload): string`
- Produces: `verifyVoiceSessionToken(token): VoiceSessionClaims`
- Consumes: `requirePublicWidgetAccess` from Task 2.

- [ ] **Step 1: Write voice token tests**

Create `tests/api/voice-session-token.test.ts` with the same tamper/expiry pattern as `widget-session-token.test.ts`, using claims:

```ts
{
  projectId: "project-1",
  visitorId: "visitor-1",
  sessionId: "conversation-1",
  exp: Math.floor(Date.now() / 1000) + 300
}
```

Expected verified result: same project, visitor, session, and expiry.

- [ ] **Step 2: Implement voice token service**

Create `apps/api/src/services/voice-session-token.ts` using HMAC SHA-256 and `VOICE_SESSION_SECRET || WIDGET_SESSION_SECRET || ENCRYPTION_KEY`. Token format is `base64url(json).base64url(hmac)`.

- [ ] **Step 3: Gate voice config and issue a token**

In `apps/api/src/routes/voice.ts`, add `requirePublicWidgetAccess` to:

```ts
router.get(
  "/config/:projectId",
  ...requirePublicWidgetAccess({
    projectIdSources: [{ source: "params", key: "projectId" }],
    action: "voice-config",
    requireBrowserOrigin: true,
    maxPerMinute: 20,
  }),
  async (req, res) => {
    // existing handler
  }
);
```

Return:

```ts
voiceSessionToken: signVoiceSessionToken({
  projectId,
  visitorId: String(req.query.visitorId || ""),
  sessionId: typeof req.query.sessionId === "string" ? req.query.sessionId : undefined,
  exp: Math.floor(Date.now() / 1000) + 10 * 60,
})
```

- [ ] **Step 4: Require voice token on LLM callback**

In `/api/voice/llm/chat/completions`, read `voiceSessionToken` from `elevenlabs_extra_body` and reject missing/tampered/expired tokens before `processChat`:

```ts
const claims = verifyVoiceSessionToken(extraBody?.voiceSessionToken);
if (claims.projectId !== projectId || claims.visitorId !== visitorId) {
  return res.status(403).json({ error: "Invalid voice session" });
}
if (claims.sessionId && sessionId && claims.sessionId !== sessionId) {
  return res.status(403).json({ error: "Invalid voice session" });
}
```

- [ ] **Step 5: Send token through ElevenLabs extra body**

In `apps/widget/src/utils/elevenlabs-voice.ts`, after config fetch, pass `voiceSessionToken` in the ElevenLabs extra body alongside `projectId`, `visitorId`, and `sessionId`.

- [ ] **Step 6: Gate voice session-end**

Apply `requirePublicWidgetAccess` to `/api/voice/session-end`, require `X-FrontFace-Session` or `voiceSessionToken`, and keep the existing `(projectId, visitorId, conversation)` check.

- [ ] **Step 7: Run tests and type checks**

Run:

```bash
pnpm test -- tests/api/voice-session-token.test.ts
pnpm --filter @frontface/api type-check
pnpm --filter @frontface/widget type-check
```

Expected: all pass.

- [ ] **Step 8: Review diff**

Run:

```bash
git diff -- apps/api/src/services/voice-session-token.ts apps/api/src/routes/voice.ts apps/widget/src
```

Expected: voice config is gated, callback requires a signed token, and session-end is bound to project/visitor. Do not stage or commit.

---

### Task 6: Update Embed Code and Widget Request Headers

**Files:**
- Modify: `apps/web/lib/widget-embed.ts`
- Modify: dashboard callers that use `buildWidgetEmbedCode`
- Modify: `apps/widget/src/widget.ts`
- Modify: `apps/widget/src/loader.ts`
- Modify: `apps/widget/src/utils/api.ts`
- Modify: `apps/widget/src/utils/handoff.ts`
- Modify: `apps/widget/src/utils/pulse-manager.ts`
- Modify: `apps/widget/src/utils/request.ts`
- Test: `tests/web/widget-embed.test.ts`
- Test: `tests/widget/widget-request.test.ts`

**Interfaces:**
- Produces: optional `data-client-key` in embed snippets.
- Produces: `WidgetConfig.clientKey?: string`.
- Consumes: `widgetHeaders(...)` from Task 4.

- [ ] **Step 1: Update embed-code test**

Modify `tests/web/widget-embed.test.ts` expected snippet:

```ts
buildWidgetEmbedCode({
  projectId: "project-123",
  apiUrl: "http://localhost:3001",
  scriptUrl: DEPLOYED_WIDGET_URL,
  clientKey: "pk_test_123",
})
```

Expected:

```html
<script
  src="https://hynaqwwofkpaafvlckdm.supabase.co/storage/v1/object/public/assets/widget.js"
  data-project-id="project-123"
  data-api-url="http://localhost:3001"
  data-client-key="pk_test_123"
  async>
</script>
```

- [ ] **Step 2: Extend embed options**

Modify `apps/web/lib/widget-embed.ts`:

```ts
export interface WidgetEmbedCodeOptions {
  projectId: string;
  apiUrl: string;
  scriptUrl: string;
  clientKey?: string | null;
}
```

Build the optional line:

```ts
const clientKeyLine = clientKey
  ? `\n  data-client-key="${escapeAttribute(clientKey)}"`
  : "";
```

Insert before `async`.

- [ ] **Step 3: Read client key in widget bootstrap**

Modify `apps/widget/src/widget.ts`:

```ts
export interface WidgetConfig {
  projectId: string;
  apiUrl?: string;
  clientKey?: string | null;
}
```

Read:

```ts
clientKey: script.getAttribute("data-client-key") || undefined,
```

Pass `clientKey` into `ChatWindow`, `PulseManager`, voice utilities, and API helpers.

- [ ] **Step 4: Copy attribute in loader**

Modify `apps/widget/src/loader.ts`:

```ts
const attrsToCopy = [
  "data-project-id",
  "data-api-url",
  "data-client-key",
  "data-position",
  "data-primary-color",
  "data-title",
  "data-greeting",
];
```

- [ ] **Step 5: Use `widgetHeaders` on every widget fetch**

Replace inline header objects for chat, lead capture, pulse, handoff, feedback, voice, presence, and typing with:

```ts
headers: widgetHeaders({
  projectId: this.options.projectId,
  visitorId: this.visitorId,
  clientKey: this.options.clientKey,
  sessionToken: this.sessionToken,
})
```

- [ ] **Step 6: Run widget/web tests**

Run:

```bash
pnpm test -- tests/web/widget-embed.test.ts tests/widget/widget-request.test.ts tests/widget/widget-config.test.ts
pnpm --filter @frontface/web type-check
pnpm --filter @frontface/widget type-check
```

Expected: all pass.

- [ ] **Step 7: Review diff**

Run:

```bash
git diff -- apps/web apps/widget tests/web tests/widget
```

Expected: embed snippets include optional client key and widget fetches send consistent headers. Do not stage or commit.

---

### Task 7: Replace Forgeable In-Memory Rate Limits for Production

**Files:**
- Modify: `apps/api/src/middleware/rate-limit.ts`
- Modify: `apps/api/package.json`
- Modify: `.env.example` files
- Test: `tests/api/rate-limit.test.ts`

**Interfaces:**
- Produces: `RateLimitStore` interface with `memory` and `redis` implementations.
- Produces: rate keys based on project/action/client-key-or-IP, not visitor ID alone.

- [ ] **Step 1: Write rate-limit store tests**

Create `tests/api/rate-limit.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { MemoryRateLimitStore } from "../../apps/api/src/middleware/rate-limit.ts";

test("MemoryRateLimitStore increments and expires a key", async () => {
  const store = new MemoryRateLimitStore();
  assert.equal(await store.increment("k", 1000), 1);
  assert.equal(await store.increment("k", 1000), 2);
});
```

- [ ] **Step 2: Extract store interface**

In `rate-limit.ts`, add:

```ts
export interface RateLimitStore {
  increment(key: string, ttlMs: number): Promise<number>;
}

export class MemoryRateLimitStore implements RateLimitStore {
  async increment(key: string, ttlMs: number): Promise<number> {
    const now = Date.now();
    const entry = rateLimitStore.get(key);
    if (!entry || entry.resetAt < now) {
      rateLimitStore.set(key, { count: 1, resetAt: now + ttlMs });
      return 1;
    }
    entry.count += 1;
    return entry.count;
  }
}
```

- [ ] **Step 3: Add Redis implementation**

Install a single Redis client already approved by the team. If none is present, use `ioredis`:

```bash
pnpm --filter @frontface/api add ioredis
```

Add:

```ts
class RedisRateLimitStore implements RateLimitStore {
  constructor(private readonly redis: import("ioredis").Redis) {}

  async increment(key: string, ttlMs: number): Promise<number> {
    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.pexpire(key, ttlMs);
    return count;
  }
}
```

Initialize Redis only when `REDIS_URL` is set. Keep memory store for local dev/tests.

- [ ] **Step 4: Update env examples**

Add:

```dotenv
REDIS_URL=
WIDGET_SESSION_SECRET=
VOICE_SESSION_SECRET=
```

- [ ] **Step 5: Run tests and audit**

Run:

```bash
pnpm test -- tests/api/rate-limit.test.ts tests/api/public-widget-gate.test.ts
pnpm --filter @frontface/api type-check
pnpm audit --prod
```

Expected: tests/type-check pass and audit reports `No known vulnerabilities found`.

- [ ] **Step 6: Review diff**

Run:

```bash
git diff -- apps/api/src/middleware/rate-limit.ts apps/api/package.json pnpm-lock.yaml .env.example apps/api/.env.example
```

Expected: durable rate-limit support with memory fallback. Do not stage or commit.

---

### Task 8: SSRF, Extensions, Storage, and Auth Settings

**Files:**
- Modify: `apps/api/src/services/firecrawl.ts`
- Modify: `apps/api/src/lib/url-guard.ts`
- Modify: `apps/api/src/routes/endpoints.ts`
- Modify: `apps/api/src/services/tool-executor.ts`
- Create or modify: `supabase/migrations/<timestamp>_security_hardening.sql`
- Test: `tests/api/url-guard.test.ts`

**Interfaces:**
- Produces: one URL safety helper used by Firecrawl, endpoint tests, and tool execution.
- Produces: documented manual dashboard steps for leaked-password protection and extension relocation.

- [ ] **Step 1: Write SSRF tests**

Create `tests/api/url-guard.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { isUrlSafeForFetch } from "../../apps/api/src/lib/url-guard.ts";

for (const url of [
  "http://localhost",
  "http://127.0.0.1",
  "http://169.254.169.254/latest/meta-data",
  "http://172.20.0.1",
  "http://[::1]/",
  "file:///etc/passwd",
]) {
  test(`blocks ${url}`, () => {
    assert.equal(isUrlSafeForFetch(url).ok, false);
  });
}

test("allows public https URL", () => {
  assert.equal(isUrlSafeForFetch("https://example.com/webhook").ok, true);
});
```

- [ ] **Step 2: Replace Firecrawl's local URL checks**

In `apps/api/src/services/firecrawl.ts`, import `isUrlSafeForFetch` and replace the custom localhost/private-IP block with:

```ts
const safety = isUrlSafeForFetch(normalizedUrl);
if (!safety.ok) {
  return { valid: false, error: safety.reason || "URL is not allowed" };
}
```

- [ ] **Step 3: Add DNS-resolution validation**

Extend `url-guard.ts` with:

```ts
export async function isResolvedUrlSafeForFetch(rawUrl: string): Promise<{ ok: boolean; reason?: string }> {
  const literal = isUrlSafeForFetch(rawUrl);
  if (!literal.ok) return literal;
  const { hostname } = new URL(rawUrl);
  const { lookup } = await import("node:dns/promises");
  const records = await lookup(hostname, { all: true, verbatim: true });
  if (records.some((record) => !isUrlSafeForFetch(`http://${record.address}`).ok)) {
    return { ok: false, reason: "Resolved host points to a private, loopback, or link-local address" };
  }
  return { ok: true };
}
```

Use `isResolvedUrlSafeForFetch` immediately before outbound `fetch` in `tool-executor.ts` and endpoint testing.

- [ ] **Step 4: Move extension relocation to a scheduled maintenance item**

Add to `docs/security/security-hardening-2026-06-26.md`:

```md
Supabase extension relocation:
- `vector` and `pg_net` are installed in `public`.
- Schedule a maintenance window to move them to `extensions` or recreate them there.
- Before moving, search SQL/functions/types for unqualified `vector` and `net` references.
- After moving, run Supabase Security Advisor and API type-check.
```

Do not move extensions in the same migration as RLS/API fixes unless staging verification proves no generated type or function breakage.

- [ ] **Step 5: Document manual Auth setting**

Add:

```md
Supabase Auth:
- Enable leaked-password protection in Supabase Dashboard > Authentication > Security.
- Keep password minimum length and complexity aligned with current product policy.
- Re-run Security Advisor and capture the leaked-password finding disappearing.
```

- [ ] **Step 6: Run tests**

Run:

```bash
pnpm test -- tests/api/url-guard.test.ts
pnpm --filter @frontface/api type-check
```

Expected: tests/type-check pass.

- [ ] **Step 7: Review diff**

Run:

```bash
git diff -- apps/api/src/lib/url-guard.ts apps/api/src/services/firecrawl.ts apps/api/src/services/tool-executor.ts apps/api/src/routes/endpoints.ts tests/api/url-guard.test.ts docs/security/security-hardening-2026-06-26.md
```

Expected: one shared SSRF guard and documented manual Supabase settings. Do not stage or commit.

---

### Task 9: Advisor Cleanup and Least-Privilege Grants

**Files:**
- Modify: latest `supabase/migrations/<timestamp>_security_hardening.sql`
- Document: `docs/security/security-hardening-2026-06-26.md`

**Interfaces:**
- Produces: explicit Supabase grants for only the tables/functions intentionally reached from client roles.
- Produces: advisor findings reduced to accepted/manual items only.

- [ ] **Step 1: Inventory current anon/auth grants**

Run via Supabase MCP SQL:

```sql
select grantee, table_schema, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;
```

Expected: after Task 1, critical server-only tables no longer have anon/auth grants.

- [ ] **Step 2: Revoke broad default grants from server-only tables**

For each table not directly queried by browser Supabase clients, add SQL:

```sql
revoke all privileges on table public.agent_availability from anon, authenticated;
revoke all privileges on table public.api_endpoints from anon, authenticated;
revoke all privileges on table public.api_keys from anon, authenticated;
revoke all privileges on table public.chat_sessions from anon, authenticated;
revoke all privileges on table public.conversation_insights from anon, authenticated;
revoke all privileges on table public.conversations from anon, authenticated;
revoke all privileges on table public.crawl_jobs from anon, authenticated;
revoke all privileges on table public.customers from anon, authenticated;
revoke all privileges on table public.handoff_settings from anon, authenticated;
revoke all privileges on table public.knowledge_chunks from anon, authenticated;
revoke all privileges on table public.knowledge_sources from anon, authenticated;
revoke all privileges on table public.lead_captures from anon, authenticated;
revoke all privileges on table public.message_feedback from anon, authenticated;
revoke all privileges on table public.messages from anon, authenticated;
revoke all privileges on table public.project_client_keys from anon, authenticated;
revoke all privileges on table public.project_members from anon, authenticated;
revoke all privileges on table public.projects from anon, authenticated;
revoke all privileges on table public.pulse_campaigns from anon, authenticated;
revoke all privileges on table public.pulse_responses from anon, authenticated;
revoke all privileges on table public.pulse_summaries from anon, authenticated;
revoke all privileges on table public.qualified_leads from anon, authenticated;
```

If a table is proven to be directly used by the dashboard Supabase client, replace the revoke with exact `grant select` plus an ownership RLS policy. The target architecture is API-owned access for tenant data.

- [ ] **Step 3: Re-run probes and advisors**

Run:

```bash
pnpm security:probe:supabase
pnpm audit --prod
```

Use Supabase MCP:

- `get_advisors` with `type: "security"`
- `get_advisors` with `type: "performance"`

Expected:

- No `rls_policy_always_true` for tenant data.
- No public `conversation_insights` read.
- No direct client execution for mutating `SECURITY DEFINER` RPCs.
- Remaining extension/auth/manual findings are documented in `docs/security/security-hardening-2026-06-26.md`.

- [ ] **Step 4: Review diff**

Run:

```bash
git diff -- supabase/migrations docs/security/security-hardening-2026-06-26.md
```

Expected: least-privilege grants are explicit and documented. Do not stage or commit.

---

### Task 10: Full Local and Browser Verification

**Files:**
- Use: `apps/widget/test.html`
- Use: existing app files from prior tasks

**Interfaces:**
- Produces: verified local widget chat, lead capture, pulse, handoff, and voice flows under the new gate.

- [ ] **Step 1: Run all tests**

Run:

```bash
pnpm test
pnpm --filter @frontface/api type-check
pnpm --filter @frontface/web type-check
pnpm --filter @frontface/widget type-check
pnpm audit --prod
```

Expected: tests and type-checks pass; production audit reports no known vulnerabilities.

- [ ] **Step 2: Start local services**

Run:

```bash
pnpm run dev
```

Expected: API, web, and widget dev servers start without type/runtime errors.

- [ ] **Step 3: Serve widget test page**

In a second shell:

```bash
pnpm --filter @frontface/widget dev
python3 -m http.server 8080 --directory apps/widget
```

Expected: `http://localhost:8080/test.html` loads the local widget bundle.

- [ ] **Step 4: Verify in Chrome DevTools**

Open `http://localhost:8080/test.html` and check:

- Widget config loads.
- Chat message request includes `Origin`, `projectId`, `visitorId`, and any configured `X-FrontFace-Key`.
- Lead capture submit includes the same gate headers.
- Pulse campaign read and response submit include the same gate headers.
- Conversation status/messages/typing/presence include `X-FrontFace-Session`.
- Voice config returns a signed URL only when the origin/key gate passes.
- Direct requests without `Origin`, client key, or session token receive 403.

- [ ] **Step 5: Run Supabase verification one last time**

Run:

```bash
pnpm security:probe:supabase
```

Then run Supabase MCP advisors:

- Security advisor
- Performance advisor

Expected: no critical/high security advisor findings remain. Performance findings like missing FK indexes can be handled in a separate performance plan unless they block security rollout.

- [ ] **Step 6: Final review**

Run:

```bash
git status --short
git diff --stat
```

Expected: only planned files changed. Do not stage or commit.

---

## Rollout Notes

- Apply database hardening to staging first.
- Deploy API/widget changes to staging before revoking broad grants in production.
- Add `WIDGET_SESSION_SECRET`, `VOICE_SESSION_SECRET`, and `REDIS_URL` in staging before testing.
- Enable Supabase leaked-password protection manually in the dashboard.
- Keep a rollback SQL file ready for grants only; do not roll back vulnerable PUBLIC RLS policies.
- After staging passes, repeat probes against production using production anon keys without printing secrets.

## Self-Review

- Spec coverage: Covers critical RLS leak, `SECURITY DEFINER` RPCs, public GraphQL/Data API grants, public widget routes, voice LLM endpoint, rate limiting, embed code, SSRF, storage bucket limits, auth leaked-password setting, advisors, and browser verification.
- Placeholder scan: No unresolved placeholders are intentionally left; generated migration timestamp is created by the Supabase CLI at execution time.
- Type consistency: `requirePublicWidgetAccess`, `widgetHeaders`, `signWidgetSessionToken`, `verifyWidgetSessionToken`, `signVoiceSessionToken`, and `verifyVoiceSessionToken` are defined before later tasks consume them.
