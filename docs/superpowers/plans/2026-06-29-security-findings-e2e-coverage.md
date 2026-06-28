# Security Findings And E2E Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the remaining security findings from the Phase B E2E pass, validate each fix, and complete the handoff/voice/onboarding coverage that was not fully exercised.

**Architecture:** Keep public browser/mobile access behind API-owned gates: origin/client-key gates for project-level public routes, HMAC session tokens for per-conversation routes, and server-side Supabase access for protected data. Remove avoidable public Supabase exposure, improve stale-token recovery in clients, and use targeted E2E data under `E2E-SEC-2026-06-29` so verification is repeatable and auditable.

**Tech Stack:** Express API, Next.js dashboard/public page, embeddable widget, Supabase Postgres/Auth/Realtime/Storage, Node test runner, Chrome DevTools MCP, `frontface_staging` Supabase MCP.

## Global Constraints

- Do not auto-stage, commit, or push. The user reviews all changes manually.
- Use TDD for code fixes: write/extend tests first, verify they fail, implement minimal code, then run focused and full test suites.
- Do not expose service-role secrets or secret API keys to widget, public page, mobile SDK, or dashboard client code.
- Preserve local widget and dashboard developer ergonomics: `localhost`, `127.0.0.1`, `*.localhost`, and first-party hosted pages must keep working.
- `WIDGET_GATE_ENFORCE=true` is the target security posture.
- Use `frontface_staging` Supabase MCP for logs and read-only evidence. Supabase advisor flags are explicitly out of scope for this pass and should be recorded only if checked.
- Created staging data must use `E2E-SEC-2026-06-29` or a newer dated prefix.
- For Supabase schema/config changes, verify current Supabase docs/changelog before implementation.

---

## File Map

- `apps/api/src/routes/embed.ts`
  - Switch `/api/embed/config/:projectId` from legacy empty-allowlist behavior to the shared public widget gate.
  - Continue returning field-limited widget config only.

- `apps/api/src/middleware/public-widget-gate.ts`
  - Reuse existing gate decision logic; only extend if embed config needs a route-specific option.

- `tests/api/public-widget-gate.test.ts`
  - Extend route/gate tests to cover embed config semantics, or create a focused embed config gate test if route-level mocking is cleaner.

- `apps/web/app/c/[handle]/lib/public-api.ts`
  - Add a typed way to detect `SESSION_INVALID`, `SESSION_CONVERSATION_MISMATCH`, `SESSION_PROJECT_MISMATCH`, and `SESSION_VISITOR_MISMATCH` 403s.
  - Return an explicit stale-session result instead of silently returning `null`/`[]`.

- `apps/web/app/c/[handle]/lib/public-storage.ts`
  - Add helpers to clear a specific public conversation token and clear the active session for a project.

- `apps/web/app/c/[handle]/public-chat.tsx`
  - On stale/expired session-token responses, clear stale storage, stop polling that conversation, and show a clean new-chat state without console errors.

- `apps/widget/src/utils/api.ts`, `apps/widget/src/utils/handoff.ts`, `apps/widget/src/utils/storage.ts`, `apps/widget/src/components/chat-window.ts`
  - Apply the same stale-session recovery behavior to widget resume/status reads.

- `apps/web/app/(dashboard)/embed/page.tsx`
  - Remove `allow-same-origin` from the preview iframe sandbox, or replace `srcDoc` sandboxing with a safer preview route if widget storage/origin behavior requires same-origin.

- `apps/widget/src/utils/realtime.ts` or equivalent Realtime subscription code
  - Short-term: make polling the default when no client-safe realtime config is provided.
  - Long-term: replace public Supabase Realtime exposure with a token-gated API event stream.

- `apps/api/src/routes/conversations.ts`, `apps/api/src/services/realtime.ts`
  - If implementing the long-term Realtime fix, add a server-side SSE endpoint gated by `requireWidgetSession`.

- `mobile-sdk/openapi.yaml`, `mobile-sdk/INTEGRATION_GUIDE.md`
  - Update if config/session/realtime contract changes.

- `supabase/migrations/*`
  - No advisor-driven migrations in this pass. Only add migrations if a non-advisor security fix explicitly requires schema changes.

---

## Task 1: Gate `/api/embed/config/:projectId` With The Shared Public Widget Gate

**Purpose:** Close the observed config leak where `GET /api/embed/config/:projectId` returns `200` for `Origin: https://evil.example` when `allowed_domains` is empty.

**Files:**
- Modify: `apps/api/src/routes/embed.ts`
- Test: `tests/api/public-widget-gate.test.ts` or new `tests/api/embed-config-gate.test.ts`

**Interfaces:**
- Consumes: `requirePublicWidgetAccess({ action, projectIdSource, projectIdParam })`
- Produces: `/api/embed/config/:projectId` behavior:
  - localhost/first-party origin: `200`
  - valid `X-FrontFace-Key`: `200`
  - disallowed origin with `WIDGET_GATE_ENFORCE=true`: `403`
  - no origin/no client key with enforce: `403`

### Steps

- [ ] Write a failing test for config deny behavior.
  - Arrange `WIDGET_GATE_ENFORCE=true`.
  - Simulate project `allowed_domains=[]`.
  - Request `GET /api/embed/config/:projectId` with `Origin: https://evil.example`.
  - Expected: `403` with `DOMAIN_NOT_CONFIGURED`.

- [ ] Write a passing-allowed test for localhost.
  - Same project with `allowed_domains=[]`.
  - Request with `Origin: http://localhost:8080`.
  - Expected: `200`.

- [ ] Write a passing-allowed test for client-key mode.
  - Simulate `req.clientKey.projectId === projectId`.
  - No origin required.
  - Expected: `200`.

- [ ] Replace the legacy middleware in `apps/api/src/routes/embed.ts`.

```ts
import { requirePublicWidgetAccess } from "../middleware/public-widget-gate";

embedRouter.get(
  "/config/:projectId",
  requirePublicWidgetAccess({
    action: "embed-config",
    projectIdSource: "params",
    projectIdParam: "projectId",
  }),
  async (req, res) => {
    // existing handler body unchanged
  }
);
```

- [ ] Confirm the route still runs after `clientKeyMiddleware` in `apps/api/src/index.ts`.
  - It already does: `app.use(clientKeyMiddleware)` is registered before `/api/embed`.

- [ ] Run focused tests.
  - `node --experimental-strip-types --test tests/api/public-widget-gate.test.ts`
  - Or the new embed config test file.

- [ ] Live validation.
  - `curl -H 'Origin: http://localhost:8080' http://localhost:3001/api/embed/config/9b5cdc6f-d3a3-4098-bb5a-af65fb86221d`
    - Expected: `200`.
  - `curl -H 'Origin: https://evil.example' http://localhost:3001/api/embed/config/9b5cdc6f-d3a3-4098-bb5a-af65fb86221d`
    - Expected: `403`.

---

## Task 2: Recover Cleanly From Expired/Stale Public Session Tokens

**Purpose:** Fix the public page/browser UX caveat where an expired stored `X-FrontFace-Session` causes visible `403` console/network noise on `/status` and `/messages/public`.

**Files:**
- Modify: `apps/web/app/c/[handle]/lib/public-api.ts`
- Modify: `apps/web/app/c/[handle]/lib/public-storage.ts`
- Modify: `apps/web/app/c/[handle]/public-chat.tsx`
- Modify: `apps/web/app/c/[handle]/use-public-handoff.ts`
- Test: `tests/web/public-chat-session-token.test.ts`

**Interfaces:**
- Produces: `isWidgetSessionDenied(responseBody, status): boolean`
- Produces: `clearStoredSessionToken(conversationId: string): void`
- Produces: `clearPublicConversationState(projectId: string, conversationId?: string): void`

### Steps

- [ ] Add tests for public API stale-token detection.
  - Mock `fetch` returning `403` with:

```json
{
  "error": {
    "code": "SESSION_INVALID",
    "message": "Invalid or missing widget session"
  }
}
```

  - Expected: helper returns a distinct stale-session result, not an unhandled error.

- [ ] Add storage tests.
  - Seed:
    - `ff_public_session_<projectId>`
    - `ff_public_session_token_<conversationId>`
  - Call clear helper.
  - Expected: both active session id and token are removed.

- [ ] Implement session-denied parsing in `public-api.ts`.

```ts
const SESSION_DENY_CODES = new Set([
  "SESSION_INVALID",
  "SESSION_PROJECT_MISMATCH",
  "SESSION_VISITOR_MISMATCH",
  "SESSION_CONVERSATION_MISMATCH",
]);
```

- [ ] Change `getConversationStatus` and `fetchMessages` to return a typed result.
  - Suggested shape:

```ts
type SessionAwareResult<T> =
  | { ok: true; data: T }
  | { ok: false; staleSession: true }
  | { ok: false; staleSession: false };
```

- [ ] Update `public-chat.tsx` and `use-public-handoff.ts`.
  - On `{ staleSession: true }`:
    - clear active session id/token
    - stop polling that conversation
    - remove selected recent conversation if necessary
    - render fresh new-chat state
    - do not `console.error`

- [ ] Run focused tests.
  - `node --experimental-strip-types --test tests/web/public-chat-session-token.test.ts`

- [ ] Browser validation.
  - Manually seed an expired token in localStorage for `/c/acme-<uuid>`.
  - Reload public page.
  - Expected:
    - no console error
    - no repeated 403 loop
    - user can start a fresh chat

---

## Task 3: Apply Stale-Session Recovery To The Embeddable Widget

**Purpose:** Keep widget behavior consistent with the public page. A returning widget visitor with an expired token should fail closed at the API but recover cleanly in the client.

**Files:**
- Modify: `apps/widget/src/utils/storage.ts`
- Modify: `apps/widget/src/utils/handoff.ts`
- Modify: `apps/widget/src/components/chat-window.ts`
- Test: `tests/widget/widget-storage.test.ts`
- Test: add or extend widget API tests if practical

**Interfaces:**
- Produces: `clearSessionToken(projectId: string): void`
- Produces: stale-session handling path for status/messages/handoff failures.

### Steps

- [ ] Extend `tests/widget/widget-storage.test.ts`.
  - Seed `chatbot_session_<projectId>`, `chatbot_session_token_<projectId>`, and `chatbot_messages_<projectId>`.
  - Call the stale-session clear helper.
  - Expected: session id, token, and stale messages are removed.

- [ ] Add a widget API helper for session-denied response detection.
  - Reuse the same deny codes as Task 2.

- [ ] Update widget status/message resume logic.
  - If status/messages return session-denied:
    - clear local session id/token/messages for that project
    - show greeting/lead gate/new-chat state
    - do not continue polling the invalid conversation

- [ ] Update `triggerHandoff` handling.
  - If handoff returns session-denied:
    - return a typed stale-session result rather than generic offline fallback
    - UI clears stale state and prompts visitor to start again

- [ ] Run focused tests.
  - `node --experimental-strip-types --test tests/widget/widget-storage.test.ts`

- [ ] Browser validation.
  - Seed expired widget session data for `http://localhost:8080/test`.
  - Reload.
  - Expected:
    - no repeated 403 loop
    - widget opens into a clean recoverable state

---

## Task 4: Remove The Embed Preview Sandbox Warning

**Purpose:** Fix Chrome warning: an iframe with both `allow-scripts` and `allow-same-origin` can escape sandboxing.

**Files:**
- Modify: `apps/web/app/(dashboard)/embed/page.tsx`
- Test: `tests/web/widget-embed.test.ts` or add a dashboard embed page static test

### Preferred Fix

- [ ] Remove `allow-same-origin` from the preview iframe:

```tsx
<iframe
  key={previewKey}
  srcDoc={previewHtml}
  className="w-full h-full border-0"
  title="Widget Preview"
  sandbox="allow-scripts"
/>
```

- [ ] Verify the preview still loads the local widget script and config.
  - If localStorage/origin behavior breaks because `srcDoc` receives an opaque origin, use the fallback below.

### Fallback Fix

- [ ] Create a dedicated preview route with a restricted CSP and no user-controllable HTML injection.
  - Candidate: `apps/web/app/embed-preview/page.tsx`
  - Load widget from local/preview script URL and pass project id via query.
  - Use iframe `src="/embed-preview?projectId=..."` with no sandbox or with a sandbox that does not combine scripts and same-origin.

- [ ] Run browser validation.
  - Open `/embed`.
  - Expected:
    - preview iframe renders
    - no Chrome sandbox warning
    - widget preview still calls local API in development

---

## Task 5: Plan And Implement The Realtime Privacy Fix

**Purpose:** Stop returning a Supabase anon key to unauthenticated public clients unless/until the Realtime authorization model is explicit and token-bound.

**Files:**
- Modify: `apps/api/src/routes/embed.ts`
- Modify: `apps/api/src/routes/public-page.ts`
- Modify: widget/public Realtime utilities
- Potential create: `apps/api/src/routes/widget-events.ts`
- Potential modify: `apps/api/src/index.ts`
- Test: widget/public fallback tests

### Short-Term Fix

- [ ] Stop including `realtime.supabaseAnonKey` in public config responses when `WIDGET_GATE_ENFORCE=true`.
  - Keep `realtime` absent or `{ enabled: false }`.
  - Public clients must fall back to polling.

- [ ] Update widget/public clients to treat missing realtime config as normal.
  - No console warning.
  - Poll `/api/widget/conversations/:id/status` and `/messages/public` with `X-FrontFace-Session`.

- [ ] Update tests to assert:
  - config response does not expose `supabaseAnonKey`
  - polling fallback starts cleanly
  - per-conversation polling still sends `X-FrontFace-Session`

### Long-Term Fix

- [ ] Add a token-gated server event stream:

```http
GET /api/widget/conversations/:id/events
X-FrontFace-Session: <token>
```

- [ ] Gate it with `requireWidgetSession()`.

- [ ] Server subscribes/broadcasts using trusted backend credentials only.

- [ ] Browser receives SSE events; no Supabase key needed client-side.

- [ ] Tests:
  - no token -> `403`
  - wrong token -> `403`
  - correct token -> event stream opens
  - dashboard agent message appears in widget/public through SSE or polling

---

## Task 6: Deferred Supabase Advisor Flags

**Purpose:** Keep this remediation pass focused on the app-level security findings and missing E2E coverage. Supabase advisor flags are not release-blocking for this pass.

**Files:**
- No files.
- No migrations.

### Deferred Items

- [ ] Do not fix advisor-only findings in this pass:
  - `extension_in_public` for `vector` / `pg_net`
  - GraphQL authenticated table visibility warnings
  - leaked password protection disabled
  - performance advisor items such as missing FK indexes, RLS initplan, and multiple permissive policies

- [ ] If advisors are run during validation, record their output as non-blocking context only.

- [ ] Revisit advisor remediation in a separate, dedicated database hardening plan after this pass is complete.

---

## Task 7: Complete Handoff E2E Coverage

**Purpose:** Cover the largest untested area: human handoff happy path, queue/claim race, offline form, and return-to-AI.

**Data Setup:**
- Use a dedicated staging project named `E2E-SEC-2026-06-29-Handoff`.
- Configure:
  - widget enabled
  - allowed domains: `localhost`, `127.0.0.1`
  - handoff enabled
  - trigger mode `both`
  - show human button enabled
  - business hours initially disabled
  - lead capture enabled if testing lead + handoff interaction

### Steps

- [ ] Create or select the dedicated project.

- [ ] Ensure at least two users can act as agents.
  - Owner session already exists in Chrome.
  - Create/invite one temp agent using a dated test email.
  - Mark both agents online where needed.

- [ ] Widget happy path.
  - Open `http://localhost:8080/test`.
  - Start chat and complete lead gate if shown.
  - Trigger handoff by button.
  - Expected:
    - request includes `X-FrontFace-Session`
    - conversation becomes `waiting` or `agent_active`
    - inbox shows it

- [ ] Text-trigger path.
  - Send phrase: `I want to talk to a human`.
  - Expected:
    - handoff trigger records keyword/customer request
    - no tokenless handoff accepted

- [ ] Claim race.
  - Put conversation in `waiting`.
  - Fire two claim requests within the same second from two authenticated sessions.
  - Expected:
    - exactly one `200`
    - one `409 ALREADY_CLAIMED` or `CLAIM_FAILED`
    - DB has exactly one `assigned_agent_id`

- [ ] Offline form.
  - Set no agents online or force outside business hours.
  - Trigger handoff.
  - Submit offline form.
  - Expected:
    - API creates conversation/message with offline metadata
    - dashboard has a visible route to the offline submission
    - no silent disappearance

- [ ] Return-to-AI.
  - Agent resolves with `returnToAI=true`.
  - Customer sends another message from widget/public page.
  - Expected:
    - AI resumes
    - no reuse of agent-owned conversation in an invalid state

- [ ] Validation commands/queries.
  - Check conversations for statuses: `waiting`, `agent_active`, `resolved`, `ai_active`.
  - Check messages for system handoff/agent/offline/return-to-AI events.
  - Check browser console/network for no unexpected 401/403/500 loops.

---

## Task 8: Complete Voice E2E Coverage

**Purpose:** Cover one real browser voice call, while keeping the existing direct API/token validations.

### Steps

- [ ] Keep direct API checks from the prior run:
  - voice config returns signed URL + voice session token
  - no/invalid LLM callback token -> `403`
  - session-end wrong visitor -> `403`
  - session-end matching visitor persists transcript

- [ ] Browser mic call.
  - Use Chrome with the authenticated/local widget or public page.
  - Grant microphone permission.
  - Start one call.
  - Speak: `This is a short FrontFace security smoke test.`
  - End within 30-60 seconds.

- [ ] Validate:
  - `GET /api/voice/config/:projectId` `200`
  - ElevenLabs connection starts without console errors
  - `POST /api/voice/session-end` `200`
  - transcript appears in DB messages with `voice_message`
  - summary appears with `voice_summary`
  - reloading conversation shows transcript/summary

- [ ] Record:
  - project id
  - visitor id
  - conversation id
  - voice call duration

---

## Task 9: Complete Onboarding/SSRF Browser And API Coverage

**Purpose:** We have unit coverage for SSRF. Add authenticated browser/API proof that onboarding and knowledge scrape reject unsafe URLs and still accept safe public URLs.

### Steps

- [ ] Create a temp owner account or use the existing Codex account.

- [ ] In dashboard/onboarding or knowledge add-source flow, attempt:
  - `http://169.254.169.254/latest/meta-data/`
  - `http://127.0.0.1:3001`
  - `http://[::1]`
  - `http://example.internal`
  - a DNS-rebinding test hostname if available in test fixtures

- [ ] Expected:
  - API rejects before Firecrawl fetch
  - error is user-readable
  - no server-side 500

- [ ] Safe URL:
  - Use a stable public HTTPS URL with tiny content.
  - Expected:
    - crawl/scrape starts
    - status appears on knowledge page

- [ ] Validate:
  - `tests/api/url-guard.test.ts`
  - browser console/network
  - API logs around rejected attempts

---

## Task 10: Low-Cost Live Rate-Limit E2E

**Purpose:** Prove live per-IP limiting without repeatedly invoking LLM chat.

### Steps

- [ ] Use a rate-limited, non-LLM endpoint such as:
  - `POST /api/chat/lead-capture/visit`
  - `POST /api/chat/lead-capture/defer`

- [ ] Set test-only low limits if the middleware supports env overrides; otherwise use unit tests as primary evidence.

- [ ] Same IP, same visitor id.
  - Expected: limit eventually returns `429`.

- [ ] Same IP, rotating visitor ids.
  - Expected: per-IP ceiling still returns `429`.

- [ ] Proxy behavior.
  - Local `TRUST_PROXY=false`: `X-Forwarded-For` ignored.
  - Staging/prod behind trusted reverse proxy: verify configured `TRUST_PROXY=true` and only trusted Cloudflare/Nginx path can set client IP.

- [ ] Do not use `/api/chat/message` for high-volume limit testing unless LLM calls are mocked or disabled.

---

## Task 11: Final Regression Pass

**Purpose:** Establish the release verdict after fixes.

### Commands

- [ ] `git status --short`
  - Expected: only intentional working-tree changes, no staged changes unless user staged manually.

- [ ] `pnpm type-check`
  - Expected: pass.

- [ ] `pnpm test`
  - Expected: pass.

- [ ] Focused security tests:

```bash
node --experimental-strip-types --test \
  tests/api/url-guard.test.ts \
  tests/api/rate-limit.test.ts \
  tests/api/public-widget-gate.test.ts \
  tests/api/widget-session-token.test.ts \
  tests/api/voice-session-token.test.ts \
  tests/web/public-chat-session-token.test.ts \
  tests/mobile-sdk/session-token-contract.test.ts \
  tests/widget/widget-storage.test.ts
```

- [ ] Supabase probe:

```bash
SUPABASE_URL='https://gjotktstaruezfjnslup.supabase.co' \
SUPABASE_ANON_KEY='<publishable-or-legacy-anon-key>' \
pnpm security:probe:supabase
```

- [ ] Supabase MCP:
  - `list_migrations`
  - `get_logs(service="api")` after failures
  - Optional record-only: `get_advisors(type="security")`, `get_advisors(type="performance")`

- [ ] Browser smoke:
  - `http://localhost:3000/dashboard`
  - `http://localhost:3000/knowledge`
  - `http://localhost:3000/inbox`
  - `http://localhost:3000/leads`
  - `http://localhost:3000/analytics`
  - `http://localhost:3000/team`
  - `http://localhost:3000/settings`
  - `http://localhost:3000/settings/handoff`
  - `http://localhost:3000/embed`
  - `http://localhost:3000/pulse`
  - `http://localhost:8080/test`
  - canonical public page `/c/<slug>-<projectId>`

### Acceptance Criteria

- [ ] Evil origin cannot read widget config or perform public writes.
- [ ] Public/widget stale session token recovers cleanly without repeated console/network errors.
- [ ] Public clients do not receive Supabase anon key unless a reviewed Realtime auth design is implemented.
- [ ] Handoff happy path, queue, claim race, offline form, and return-to-AI are covered.
- [ ] One browser voice call is completed and transcript persistence is verified.
- [ ] SSRF is covered by unit tests plus authenticated unsafe/safe URL smoke.
- [ ] Rate-limit per-IP ceiling is covered without costly LLM spam.
- [ ] Supabase advisor warnings are not part of this pass; no advisor-only warning blocks acceptance.
