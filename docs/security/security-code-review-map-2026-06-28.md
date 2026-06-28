# Security Code Review Map - 2026-06-28

This document explains the current security-hardening worktree in review terms:
what changed, why it changed, what threat each change addresses, how the pieces
fit together, and what still deserves reviewer attention.

It is based on the current local git state, including staged, unstaged, and
untracked files. It intentionally does not quote secrets from local config files.

## Executive Summary

The security work is broader than the two late Phase B/C fixes. It contains:

1. Supabase database hardening:
   - Remove anon access to tenant tables.
   - Remove unsafe always-true policies.
   - Revoke client-role execution on privileged SECURITY DEFINER functions.
   - Restrict direct client-key lifecycle writes to project owners.
   - Remove dangerous table privileges such as TRUNCATE.
   - Backfill widget allowed domains.

2. Public widget/API hardening:
   - Add a shared public widget gate.
   - Authorize public service-role-backed widget routes by either:
     - a project-bound publishable client key, or
     - a browser Origin/Referer matching the project's allowed domains.
   - Add monitor mode for rollout, and fail-closed mode via WIDGET_GATE_ENFORCE.

3. Public conversation IDOR hardening:
   - Remove legacy unauthenticated chat-history list/read endpoints.
   - Issue HMAC widget session tokens bound to a conversation.
   - Require those tokens on public per-conversation read/action endpoints.

4. Voice callback hardening:
   - Issue a short-lived voice session token from voice config.
   - Require the token on the ElevenLabs LLM callback when enforcement is on.

5. SSRF hardening:
   - Replace basic URL validation with shared URL/IP/DNS checks.
   - Block private, loopback, link-local, metadata, reserved TLD, and DNS-rebinding
     cases before crawl/scrape jobs are created.

6. Rate-limit hardening:
   - Replace single-process visitorId-only limiter with a pluggable store.
   - Use Redis when REDIS_URL is set.
   - Add a per-IP ceiling so forged visitor IDs do not bypass limits.
   - Only trust X-Forwarded-For when TRUST_PROXY is enabled.

7. Client propagation:
   - Widget, hosted public page, mobile docs, and embed code now understand:
     - X-FrontFace-Key
     - X-FrontFace-Session
     - returned sessionToken values

Current verification on the full filesystem:

- pnpm test: 168/168 passing.
- pnpm type-check: 6/6 package tasks successful.

Important git/index caveat:

- The current filesystem passes, but the git index is split. Many runtime source
  files are unstaged or untracked while their tests are staged. A staged-only
  commit would not represent a working change.

## Current Git State

### Staged Files

These are currently staged:

- apps/api/.env.example
- apps/api/package.json
- docs/bugs/e2e-test-blockers-2026-06-22.md
- docs/bugs/e2e-test-report-2026-06-22.md
- docs/security/security-hardening-2026-06-26.md
- docs/superpowers/plans/2026-06-26-security-hardening.md
- docs/superpowers/specs/2026-06-22-posthog-consent-fix-design.md
- mobile-sdk/INTEGRATION_GUIDE.md
- mobile-sdk/openapi.yaml
- package.json
- scripts/security/probe-supabase-anon.mjs
- scripts/security/probe-supabase-rpc.mjs
- supabase/migrations/20260626000001_security_hardening.sql
- supabase/migrations/20260627120415_owner_only_project_client_keys.sql
- supabase/migrations/20260627174410_revoke_dangerous_public_table_privileges.sql
- supabase/migrations/20260627181311_backfill_allowed_domains.sql
- tests/api/posthog-consent.test.ts
- tests/api/project-client-keys-rls.test.ts
- tests/api/public-widget-gate.test.ts
- tests/api/rate-limit.test.ts
- tests/api/security-route-inventory.test.ts
- tests/api/url-guard.test.ts
- tests/api/voice-session-token.test.ts
- tests/api/widget-session-token.test.ts
- tests/web/widget-embed.test.ts
- tests/widget/widget-storage.test.ts

Reviewer meaning:

- This staged set contains many tests and migrations.
- It does not contain the runtime source files those tests import.
- Do not review or commit the staged set alone.

### Unstaged Tracked Files

These are modified but unstaged:

- .mcp.json
- apps/api/src/index.ts
- apps/api/src/lib/url-guard.ts
- apps/api/src/middleware/domain-whitelist.ts
- apps/api/src/middleware/rate-limit.ts
- apps/api/src/routes/chat.ts
- apps/api/src/routes/conversations.ts
- apps/api/src/routes/handoff.ts
- apps/api/src/routes/knowledge.ts
- apps/api/src/routes/lead-capture.ts
- apps/api/src/routes/onboarding.ts
- apps/api/src/routes/pulse.ts
- apps/api/src/routes/voice.ts
- apps/api/src/services/firecrawl.ts
- apps/web/app/c/[handle]/lib/elevenlabs-voice.ts
- apps/web/app/c/[handle]/lib/public-api.ts
- apps/web/app/c/[handle]/lib/public-storage.ts
- apps/web/app/c/[handle]/public-chat.tsx
- apps/web/app/c/[handle]/use-public-handoff.ts
- apps/web/lib/widget-embed.ts
- apps/widget/src/components/chat-window.ts
- apps/widget/src/loader.ts
- apps/widget/src/utils/api.ts
- apps/widget/src/utils/elevenlabs-voice.ts
- apps/widget/src/utils/handoff.ts
- apps/widget/src/utils/pulse-manager.ts
- apps/widget/src/utils/storage.ts
- apps/widget/src/widget.ts
- pnpm-lock.yaml

Reviewer meaning:

- Most of the runtime implementation is here.
- pnpm-lock.yaml is required because apps/api/package.json adds ioredis.
- .mcp.json should be treated separately because it contains credentials in the
  diff. Do not commit it as part of this security patch unless sanitized.

### Untracked Files

Security-relevant untracked source files:

- apps/api/src/middleware/public-widget-gate.ts
- apps/api/src/middleware/require-widget-session.ts
- apps/api/src/services/voice-session-token.ts
- apps/api/src/services/widget-session-token.ts
- apps/widget/src/utils/request.ts

Other untracked docs/artifacts:

- analysis.md
- reddit-traction-guide.md
- summary.md
- docs/marketing/reddit/playbook.md
- docs/marketing/reddit/postdrafts.md
- docs/marketing/seo/organic-growth-execution.md
- docs/product/whatsapp-omnichannel/*

Reviewer meaning:

- The five untracked source files are not optional. They are core runtime code.
- The docs/artifacts look unrelated to this security patch and should be
  reviewed separately or excluded.

## Major Security Themes

### Theme 1: Public service-role-backed routes must have an app-layer gate

The API uses supabaseAdmin/service-role in many public widget endpoints. That is
normal for the widget architecture because anonymous site visitors do not have
Supabase Auth sessions. But it also means database RLS does not protect those
routes. The Express route must enforce tenant/project authorization itself.

The key danger pattern was:

- open CORS
- no user auth
- route accepts projectId or conversationId
- route reads/writes using supabaseAdmin

Open CORS is not the actual security boundary. CORS only limits browser reads.
curl, server-to-server requests, malicious scripts on allowed pages, and native
clients are not stopped by CORS alone.

The new design adds a shared gate for public widget routes and session tokens for
conversation-specific routes.

### Theme 2: Keep dashboard Supabase reads working

The database migrations revoke anon privileges but intentionally leave many
authenticated grants in place. This is because the dashboard still reads some
tables directly through Supabase client libraries under per-user RLS.

That is why Phase A does not blindly revoke authenticated SELECT everywhere. It
hardens the anon/public path first and removes privileges that browser clients
should never need.

### Theme 3: Rollout without breaking existing embeds

The gate and session-token middleware support monitor mode:

- WIDGET_GATE_ENFORCE not true:
  - log would-deny decisions
  - allow the request
- WIDGET_GATE_ENFORCE=true:
  - fail closed

This exists because historical projects may not have allowed_domains populated,
and old widgets may not yet send X-FrontFace-Session. The codebase can deploy
the instrumentation first, backfill/configure domains and client keys, then
enable enforcement.

You said enforcement is already enabled in your environment, so the client-side
token/header propagation is not optional for real use.

## Supabase Migrations

### 20260626000001_security_hardening.sql

File:

- supabase/migrations/20260626000001_security_hardening.sql

What it changes:

1. Drops an always-true conversation_insights policy:
   - "Service role full access to insights"
   - The issue is that a policy with USING(true) and no TO clause applies to
     PUBLIC, not just service_role.
   - service_role bypasses RLS anyway, so a service-role policy is unnecessary.

2. Drops public insert policies:
   - message_feedback: "anyone_can_submit_feedback"
   - pulse_responses: "Anyone can submit pulse responses"
   - The widget now writes through Express API routes using supabaseAdmin.
   - Direct anon/authenticated Data API inserts are no longer needed.

3. Revokes all anon privileges on tenant tables:
   - conversations, messages, customers, projects, project_client_keys,
     knowledge tables, pulse tables, leads, and others.
   - This closes the Supabase REST/GraphQL anon exposure class.

4. Revokes EXECUTE from public/anon/authenticated on privileged helper functions:
   - append_late_answer
   - mark_late_answer_promoted
   - get_available_agents
   - get_queue_position
   - get_project_role
   - has_project_access
   - is_project_agent
   - is_project_owner

5. Pins search_path on first-party functions:
   - This prevents search_path hijack issues, especially around SECURITY DEFINER
     functions.

6. Sets a 5 MB limit on the public assets bucket:
   - Defense in depth against unbounded public bucket uploads.
   - Does not set MIME restrictions yet because the bucket serves widget assets
     and tenant images.

Why this approach:

- It focuses on removing public/anon exposure while preserving dashboard
  authenticated flows.
- It avoids SECURITY DEFINER "allow all" patterns and relies on service_role
  bypass where the backend genuinely needs admin access.
- It is declarative/idempotent enough to apply across databases with some
  migration-history drift.

Review notes:

- Confirm prod migration history before applying to prod.
- Confirm no client code uses anon Supabase .from() calls for the revoked tables.
- Confirm storage upload/deploy content types before adding MIME restrictions.

### 20260627120415_owner_only_project_client_keys.sql

File:

- supabase/migrations/20260627120415_owner_only_project_client_keys.sql

What it changes:

- Revokes INSERT, UPDATE, DELETE on project_client_keys from authenticated.
- Drops broad create/update policies.
- Recreates create/update policies allowing only the owning project user.

Why this approach:

- Publishable client keys are meant to be visible to project members, but key
  lifecycle is an owner control.
- Even if the API enforces owner-only create/revoke, direct Supabase REST/GraphQL
  should not let project members bypass that API contract.

Review notes:

- The migration revokes authenticated DML grants. This means browser-side direct
  DML cannot create/revoke keys even if a permissive RLS policy exists later.
- service_role API paths continue to work.

### 20260627174410_revoke_dangerous_public_table_privileges.sql

File:

- supabase/migrations/20260627174410_revoke_dangerous_public_table_privileges.sql

What it changes:

- Revokes TRUNCATE, REFERENCES, and TRIGGER on all public schema tables from anon
  and authenticated.
- Also revokes those privileges from future tables via default privileges.

Why this approach:

- RLS does not protect TRUNCATE.
- Browser/client roles should not create triggers or FK references.
- Ordinary DML grants are left untouched to avoid breaking existing RLS-backed
  dashboard flows.

Review notes:

- This is low-risk compared with revoking SELECT/INSERT/UPDATE/DELETE because
  normal app clients should not need these privileges.

### 20260627181311_backfill_allowed_domains.sql

File:

- supabase/migrations/20260627181311_backfill_allowed_domains.sql

What it changes:

- For projects with empty allowed_domains and an onboarding company_website,
  derives:
  - domain
  - *.domain
- Stores both in allowed_domains.

Why this approach:

- The new public widget gate needs allowed_domains populated before enforcement.
- Onboarding already captured the tenant website, so it is the lowest-friction
  source of truth for existing projects.

Review notes:

- The extraction is regex-based. It handles normal http/https URLs with paths.
- If unusual values exist in settings, reviewers should spot-check the resulting
  allowed_domains after migration.

## Public Widget Gate

Files:

- apps/api/src/middleware/public-widget-gate.ts
- apps/api/src/middleware/domain-whitelist.ts
- apps/api/src/index.ts
- apps/api/src/routes/chat.ts
- apps/api/src/routes/lead-capture.ts
- apps/api/src/routes/pulse.ts
- apps/api/src/routes/handoff.ts
- apps/api/src/routes/conversations.ts
- apps/api/src/routes/voice.ts

### Threat

Public widget routes run with supabaseAdmin. Without a gate, anyone who knows or
guesses a projectId can call public routes from anywhere. Some routes only write
data, but others disclose configuration, conversation state, messages, handoff
settings, or voice capability.

The previous design used domain whitelist middleware in some places, but it was
not consistently applied. It also had an "empty allowed_domains means allow all"
behavior for backward compatibility, which is not good enough once enforcement
is desired.

### New Model

Each public widget request is authorized by one of two paths:

1. Client key path:
   - X-FrontFace-Key is resolved by clientKeyMiddleware.
   - req.clientKey.projectId must match the project being accessed.
   - This supports native/mobile SDKs and embeds where Origin is absent or not
     useful.

2. Browser origin path:
   - Extract hostname from Origin first, then Referer.
   - Allow first-party/dev hosts.
   - Otherwise require the hostname to match the project's allowed_domains.

The pure decision function is:

- evaluatePublicWidgetAccess()

It returns either:

- allow: true with a normalized access mode
- allow: false with a denial code and reason

Denial codes include:

- MISSING_ORIGIN
- DOMAIN_NOT_CONFIGURED
- DOMAIN_NOT_ALLOWED

### Why a shared gate instead of route-by-route checks

This is a DRY/SOLID decision:

- Domain parsing and wildcard matching happen in one place.
- Client key vs browser origin logic is single-sourced.
- Monitor/enforce rollout behavior is consistent.
- Tests can cover the pure decision function without Supabase.
- Routes are easier to inventory with static tests.

### Why keep domain-whitelist.ts

domain-whitelist.ts is retained as a compatibility wrapper. It now imports the
pure domain helpers from public-widget-gate.ts.

Important distinction:

- isDomainAllowed() keeps legacy behavior:
  - empty allowed_domains allows all
- matchesConfiguredDomain() does not:
  - empty allowed_domains matches nothing

The new gate needs the stricter function to distinguish "unconfigured project"
from "configured but origin not allowed".

### Why lazy-import getProjectAllowedDomains

public-widget-gate.ts lazily imports domain-whitelist.ts only when the default
resolver is used.

Why:

- Pure unit tests can import the gate without loading Supabase env/client code.
- The decision logic stays testable and side-effect-light.
- Tests can inject resolveAllowedDomains.

### Route changes

chat.ts:

- POST /api/chat/message now uses requirePublicWidgetAccess before
  chatRateLimiter.
- POST /api/chat/feedback now uses requirePublicWidgetAccess.
- POST /api/chat/ensure-conversation now uses requirePublicWidgetAccess.
- Legacy GET /api/chat/conversations and GET /api/chat/conversations/:id were
  removed because they were unauthenticated service-role-backed chat history
  reads keyed only by projectId.

lead-capture.ts:

- submit-form, submit-inline, skip, defer, visit, and status now run through the
  gate.
- submit-form and submit-inline can return sessionToken when they create or
  continue a conversation.

pulse.ts:

- GET /api/pulse/campaigns/:projectId uses the gate.
- POST /api/pulse/responses uses the gate plus chatRateLimiter.

handoff.ts:

- GET /api/projects/:id/handoff-availability uses the gate.
- POST /api/projects/:id/offline-messages uses the gate.
- POST /api/conversations/:id/handoff is now session-token gated.

conversations.ts:

- POST /api/widget/conversations creates or returns a conversation and issues a
  session token.
- GET /api/widget/conversations/:id/status is session-token gated.
- GET /api/widget/conversations/:id/messages/public is session-token gated.

voice.ts:

- GET /api/voice/config/:projectId uses the public widget gate.

index.ts:

- widget CORS allowed headers now include X-FrontFace-Session.
- clientKeyMiddleware remains globally mounted before public routers so the gate
  can use req.clientKey.

### Review notes

1. ~~GET /api/chat/feedback was public and ungated.~~ **FIXED 2026-06-28.**
   - File: apps/api/src/routes/chat.ts
   - Now gated with `requirePublicWidgetAccess({ action: "feedback-read", projectIdSource: "query" })`.
   - Widget updated to send `projectId` query param + auth headers (`X-FrontFace-Key`, `X-FrontFace-Session`).

2. The gate trusts Origin/Referer for browser-origin authorization.
   - This is appropriate for browser embeds, but not a secret.
   - That is why native/non-browser traffic should use X-FrontFace-Key.

3. First-party hosts and dev hosts are always allowed.
   - This protects hosted public pages and local dev.
   - Review FIRST_PARTY_HOST in production if domains change.

4. WIDGET_GATE_ENFORCE=true changes behavior.
   - Missing Origin on browser-origin routes fails unless a valid client key is
     present.
   - Old widgets that do not send session tokens will fail on session-token
     protected routes.

## Widget Session Tokens

Files:

- apps/api/src/services/widget-session-token.ts
- apps/api/src/middleware/require-widget-session.ts
- apps/api/src/routes/chat.ts
- apps/api/src/routes/conversations.ts
- apps/api/src/routes/lead-capture.ts
- apps/api/src/routes/handoff.ts
- apps/widget/src/utils/storage.ts
- apps/widget/src/components/chat-window.ts
- apps/widget/src/utils/handoff.ts
- apps/web/app/c/[handle]/lib/public-storage.ts
- apps/web/app/c/[handle]/lib/public-api.ts
- apps/web/app/c/[handle]/public-chat.tsx
- apps/web/app/c/[handle]/use-public-handoff.ts
- mobile-sdk/INTEGRATION_GUIDE.md
- mobile-sdk/openapi.yaml

### Threat

Conversation UUIDs are not authorization. Before this change, a public route
could read conversation state/messages if the caller knew a conversation ID.
UUIDs are hard to guess, but they can leak through logs, URLs, browser storage,
support screenshots, or other bugs. A service-role route should not rely on
"unguessable ID" alone.

### Token Format

widget-session-token.ts implements:

- payload: base64url(JSON claims)
- signature: base64url(HMAC-SHA256(payload, secret))
- token: payload.signature

Claims:

- projectId
- visitorId
- conversationId
- exp

Default TTL:

- 24 hours

Secret resolution:

- WIDGET_SESSION_SECRET
- fallback to ENCRYPTION_KEY

### Issuing Tokens

Tokens are returned from:

- POST /api/chat/message
- POST /api/chat/ensure-conversation
- POST /api/widget/conversations
- lead-capture submit-form when a conversation is created/continued
- lead-capture submit-inline when sessionId exists

Reason:

- A visitor may enter a conversation through multiple paths:
  - normal chat
  - voice preflight
  - lead capture before first chat message
  - conversation creation endpoint
- Every path that can establish a conversation needs to hand the client a token.

### Enforcing Tokens

requireWidgetSession reads:

- X-FrontFace-Session

It verifies:

- token exists
- HMAC is valid
- token is not expired
- claims.conversationId matches req.params.id

If invalid:

- monitor mode: logs and allows
- enforcement mode: 403

### Why not query the database on every read

The token is self-contained and signed. That avoids:

- a database lookup before every poll
- extra latency during 2-second polling loops
- N+1 load during active handoff sessions

The tradeoff is that token revocation is TTL-based. If a token leaks, it is a
bearer credential until expiry or secret rotation.

### Client Storage

Widget:

- stores sessionId per project
- stores sessionToken per project
- clears both in clearProjectData()

Hosted public page:

- stores sessionId per project
- stores sessionToken per conversationId

Why the hosted page differs:

- The hosted public page has a "recent conversations" style flow.
- A visitor may switch between conversations.
- Token-per-conversation avoids using the wrong token after switching threads.

### Review notes

1. Tokens are bearer tokens stored in localStorage.
   - This matches existing widget persistence patterns.
   - It means XSS on the host page can steal the token.
   - This is acceptable only if we treat widget host-page XSS as out of scope
     and keep token TTL limited.

2. issueWidgetSessionToken returns undefined if no secret is configured.
   - This prevents conversation creation from crashing during rollout.
   - With WIDGET_GATE_ENFORCE=true, missing token issuance will cause later
     reads/actions to fail.
   - Recommendation: production should explicitly set WIDGET_SESSION_SECRET, or
     at minimum ensure ENCRYPTION_KEY is present and strong.

3. The middleware currently only compares conversationId from token to route.
   - Because the token is signed, projectId/visitorId are protected claims.
   - If a future route includes projectId/visitorId, compare those too.

4. Dashboard usage:
   - The handoff trigger comment still says it can be called by dashboard or
     widget.
   - Current search showed widget/public page callers, but if dashboard later
     calls POST /api/conversations/:id/handoff, the session middleware will
     block it unless dashboard uses a different authenticated route or branch.

## Voice Session Tokens

Files:

- apps/api/src/services/voice-session-token.ts
- apps/api/src/routes/voice.ts
- apps/widget/src/utils/elevenlabs-voice.ts
- apps/web/app/c/[handle]/lib/elevenlabs-voice.ts

### Threat

POST /api/voice/llm/chat/completions is called by ElevenLabs. It cannot use the
normal browser Origin gate because the caller is ElevenLabs infrastructure.
Before this hardening, a caller could drive the callback for an arbitrary
projectId if they knew the endpoint shape. That can cause LLM spend and
potentially create/continue conversations.

### New Flow

1. Widget calls GET /api/voice/config/:projectId.
2. That route is protected by requirePublicWidgetAccess.
3. If voice is enabled, API returns:
   - signedUrl
   - greeting
   - voiceSessionToken
4. Widget passes voiceSessionToken into ElevenLabs extra_body.
5. ElevenLabs calls POST /api/voice/llm/chat/completions.
6. API verifies voiceSessionToken before processing.

### Token Claims

- projectId
- visitorId
- optional sessionId
- exp

Default TTL:

- 10 minutes

Secret resolution:

- VOICE_SESSION_SECRET
- fallback to WIDGET_SESSION_SECRET
- fallback to ENCRYPTION_KEY

### Why verify only projectId today

The callback processing always needs projectId. visitorId and sessionId may be
absent or evolve because voice can begin before a text conversation exists.

That said, if future voice behavior stabilizes around a known visitor/session,
the callback should also compare visitorId and sessionId when present.

### Review notes

1. With WIDGET_GATE_ENFORCE=true, missing/invalid voice session token returns
   403.

2. If no signing secret exists, config returns voiceSessionToken undefined.
   - That preserves config delivery in monitor/rollout.
   - It will break enforced callback processing.
   - Recommendation: explicitly configure VOICE_SESSION_SECRET or
     WIDGET_SESSION_SECRET in production.

3. The callback still accepts projectId from headers as fallback.
   - Token verification is what protects the route under enforcement.
   - If enforcement is off, the route is still monitor-only.

## Rate Limiting

Files:

- apps/api/src/middleware/rate-limit.ts
- apps/api/package.json
- pnpm-lock.yaml
- apps/api/.env.example
- tests/api/rate-limit.test.ts

### Threat

The original limiter keyed primarily on visitorId, which is client supplied.
An attacker could send a new visitorId each request and bypass rate limits.

The original limiter was also in-memory:

- resets on restart
- not shared across replicas
- not suitable as the only production limiter

### New Store Model

rate-limit.ts now defines:

- RateLimitStore interface
- MemoryStore default
- RedisStore when REDIS_URL is set

Redis uses a Lua script:

- INCR key
- set PEXPIRE only on first increment
- return count and TTL

Why Lua:

- Avoids race conditions between increment and expire.
- Keeps sliding-ish fixed-window behavior atomic per key.

### Visitor Limit

The existing user-facing limits remain:

- per minute
- per hour
- per day

The visitor key is:

- visitorId
- or X-Visitor-Id
- or req.ip
- optionally namespaced by client key:
  - key:<keyId>:<visitorId>

Why client-key namespacing:

- Mobile/native SDK traffic can be separated by key/app.
- A shared visitorId across different apps does not collide.
- It avoids keying solely on keyId, which would throttle a whole mobile app as
  one visitor.

### Per-IP Ceiling

After visitor limits pass, the middleware applies a second set of limits:

- ip:minute
- ip:hour
- ip:day

Each is visitor limit multiplied by RATE_LIMIT_IP_MULTIPLIER.

Default multiplier:

- 5

Why:

- Honest visitors behind a NAT should not hit the same tiny per-visitor limit.
- A single network still cannot forge infinite visitor IDs.

### TRUST_PROXY

extractClientIp uses X-Forwarded-For only when:

- TRUST_PROXY is one of 1, true, yes

Otherwise it uses req.ip.

Why:

- If the API is directly reachable and trusts X-Forwarded-For, an attacker can
  spoof a different IP per request.
- Behind nginx/Cloudflare, TRUST_PROXY=true is correct only if nginx sanitizes
  X-Forwarded-For.

Your production nginx/Cloudflare setup should:

- trust Cloudflare IP ranges
- restore real client IP from CF-Connecting-IP
- set X-Forwarded-For to $remote_addr, not $proxy_add_x_forwarded_for
- keep the API port private

### Fail-open behavior

If the rate-limit store throws, the middleware logs and calls next().

Why:

- A Redis outage should not make the whole product unavailable.
- Rate limiting is protective control, not core application correctness.

Tradeoff:

- During Redis failure, abuse protection is weakened.
- This should be monitored.

### Review notes

1. Redis initializes asynchronously at module load.
   - There may be a short startup window using MemoryStore until Redis connects.
   - That is acceptable for dev and usually acceptable in prod, but worth noting.

2. apps/api/.env.example sets REDIS_URL=redis://localhost:6379.
   - If copied blindly to prod without Redis, the app falls back to memory after
     a connection warning.
   - Consider documenting "unset if not using Redis" or use a commented example.

3. apps/api/.env.example sets TRUST_PROXY=true.
   - Correct for your Cloudflare/nginx origin if nginx is configured safely.
   - Dangerous for direct API exposure.

## SSRF Hardening

Files:

- apps/api/src/lib/url-guard.ts
- apps/api/src/services/firecrawl.ts
- apps/api/src/routes/onboarding.ts
- apps/api/src/routes/knowledge.ts
- tests/api/url-guard.test.ts

### Threat

User-controlled crawl/scrape URLs eventually cause server-side fetches through
Firecrawl. The old validateCrawlUrl blocked only some obvious private/local
cases. It missed:

- IPv6 loopback/private forms
- IPv4-mapped IPv6
- cloud metadata IPs
- 169.254.169.254
- CGNAT range
- .internal hostnames
- DNS names resolving to private IPs

### New Static Guard

isUrlSafeForFetch checks:

- URL parse validity
- protocol is http or https
- blocked hostnames:
  - localhost
  - metadata
  - metadata.google.internal
  - instance-data
- blocked suffixes:
  - .internal
  - .local
  - .localhost
- IPv4 private/special ranges:
  - 0.0.0.0/8
  - 10.0.0.0/8
  - 127.0.0.0/8
  - 169.254.0.0/16
  - 172.16.0.0/12
  - 192.168.0.0/16
  - 100.64.0.0/10
- IPv6:
  - loopback
  - unspecified
  - link-local
  - unique local
  - IPv4-mapped private addresses

### New DNS Guard

resolveAndValidateUrl:

1. Runs the static guard.
2. If host is an IP literal, returns ok after static guard.
3. Resolves A and AAAA records.
4. Blocks if no addresses are returned.
5. Blocks if any returned address is private/special.

Why block if any IP is private:

- Mixed DNS answers are suspicious.
- A fetch library may choose any returned address.

### Application Points

onboarding.ts:

- validates URL
- resolves DNS before:
  - extracting domain
  - creating scrape job
  - updating onboarding settings
  - backfilling allowed_domains

knowledge.ts:

- validates URL
- resolves DNS before:
  - capacity check
  - scrape job creation

firecrawl.ts:

- crawlWebsite
- crawlWebsiteLive
- scrapePage
- validateCrawlUrl

The service-level guard is defense in depth. Even if a future route calls
Firecrawl directly, the service still blocks unsafe URLs.

### Review notes

1. DNS rebinding cannot be perfectly solved when Firecrawl performs the final
   fetch externally.
   - We resolve before handing the URL to Firecrawl.
   - Firecrawl may resolve again later.
   - The best full fix would require Firecrawl-side protections or a fetch layer
     where we control DNS/IP pinning.

2. Blocking NXDOMAIN/no-address is safe.
   - A non-resolving URL cannot be fetched successfully.

3. The guard may block some internal dev/test URLs.
   - That is intentional for server-side crawl/scrape endpoints.

## Widget And Hosted Public Page Client Changes

Files:

- apps/widget/src/utils/request.ts
- apps/widget/src/components/chat-window.ts
- apps/widget/src/utils/api.ts
- apps/widget/src/utils/handoff.ts
- apps/widget/src/utils/pulse-manager.ts
- apps/widget/src/utils/elevenlabs-voice.ts
- apps/widget/src/utils/storage.ts
- apps/widget/src/widget.ts
- apps/widget/src/loader.ts
- apps/web/app/c/[handle]/lib/public-api.ts
- apps/web/app/c/[handle]/lib/public-storage.ts
- apps/web/app/c/[handle]/public-chat.tsx
- apps/web/app/c/[handle]/use-public-handoff.ts
- apps/web/app/c/[handle]/lib/elevenlabs-voice.ts
- apps/web/lib/widget-embed.ts

### Shared widgetHeaders helper

apps/widget/src/utils/request.ts adds widgetHeaders().

It centralizes:

- Content-Type
- X-Visitor-Id
- X-FrontFace-Key
- X-FrontFace-Session

Why:

- Reduces inconsistent header propagation.
- Keeps future route/header changes in one helper.
- Prevents bugs where some widget call forgets the client key or session token.

### Client key propagation

The widget now supports:

- WidgetConfig.clientKey
- data-client-key in embed code
- loader copying data-client-key
- ChatWindow receiving clientKey
- PulseManager receiving clientKey
- ElevenLabsVoiceManager receiving clientKey

Routes that now send X-FrontFace-Key include:

- chat message
- feedback submit
- lead capture
- lead status
- handoff availability
- offline messages
- pulse campaign load
- pulse response submit
- voice config

Why:

- Native/mobile clients and some embeds may not have a meaningful Origin.
- A publishable client key gives the API a project-bound credential.
- It also provides a revocation handle.

### Session token propagation

ChatWindow:

- loads existing sessionToken from localStorage
- stores sessionToken returned by message/lead/ensure flows
- sends token for:
  - conversation status
  - messages/public
  - handoff trigger
  - polling during handoff

Hosted public page:

- stores session tokens by conversationId
- sends tokens when hydrating/polling/triggering handoff

Mobile SDK docs:

- document sessionToken returned alongside sessionId/conversationId
- document X-FrontFace-Session for read routes

### Review notes

1. The widget stores token per project, while hosted public page stores token per
   conversation.
   - Widget appears to have one active conversation per project.
   - Hosted page may support switching conversations.

2. Any route newly protected by requireWidgetSession must have a token issuance
   path before it is called.
   - This is why lead-first and voice ensure-conversation paths issue tokens.

3. Old deployed widgets will fail on protected reads/actions when
   WIDGET_GATE_ENFORCE=true.
   - Deploy widget bundle before or with API enforcement.

## Embed And Mobile SDK Contract

Files:

- apps/web/lib/widget-embed.ts
- tests/web/widget-embed.test.ts
- mobile-sdk/INTEGRATION_GUIDE.md
- mobile-sdk/openapi.yaml

### Embed code

buildWidgetEmbedCode() now optionally includes:

- data-client-key="..."

Only when a client key is provided.

Why:

- Avoids forcing all legacy embeds to include a key immediately.
- Allows new/recommended snippets to work even where allowed_domains is missing
  or origin is absent/not useful.

### Mobile SDK docs

Docs now explain:

- sessionToken is returned with sessionId/conversationId.
- sessionToken should be persisted.
- X-FrontFace-Session must be sent to:
  - status
  - messages/public

Why:

- Mobile/native clients are outside browser Origin security.
- They need both:
  - X-FrontFace-Key for project access
  - X-FrontFace-Session for conversation-specific reads

## Environment And Deployment Settings

Files:

- apps/api/.env.example

New/changed settings:

- WIDGET_GATE_ENFORCE=true
- REDIS_URL=redis://localhost:6379
- RATE_LIMIT_MESSAGES_PER_MINUTE=15
- RATE_LIMIT_MESSAGES_PER_HOUR=100
- RATE_LIMIT_MESSAGES_PER_DAY=500
- TRUST_PROXY=true

Existing relevant settings:

- ENCRYPTION_KEY

Implicit settings used by new code:

- WIDGET_SESSION_SECRET
- VOICE_SESSION_SECRET
- RATE_LIMIT_IP_MULTIPLIER
- FIRST_PARTY_HOST

Review notes:

1. WIDGET_SESSION_SECRET and VOICE_SESSION_SECRET are used but not documented in
   apps/api/.env.example.
   - The code falls back to ENCRYPTION_KEY.
   - Recommendation: document explicit secrets anyway.

2. TRUST_PROXY=true is correct only behind sanitized nginx/Cloudflare.
   - Your production setup should overwrite X-Forwarded-For with the restored
     real visitor IP.

3. REDIS_URL should be real in production if you want distributed limits.
   - If unset, the app uses MemoryStore.

## Tests

New and updated tests:

- tests/api/public-widget-gate.test.ts
- tests/api/security-route-inventory.test.ts
- tests/api/widget-session-token.test.ts
- tests/api/voice-session-token.test.ts
- tests/api/rate-limit.test.ts
- tests/api/url-guard.test.ts
- tests/api/project-client-keys-rls.test.ts
- tests/api/posthog-consent.test.ts
- tests/web/widget-embed.test.ts
- tests/widget/widget-storage.test.ts

### What the tests prove

public-widget-gate:

- first-party/dev hosts are always allowed
- configured domains and wildcards match
- empty allowlist does not match in strict gate path
- client key path skips allowlist lookup
- monitor mode logs/allows
- enforce mode blocks
- lookup failure fails open in monitor and closed in enforce

security-route-inventory:

- key public route files reference requirePublicWidgetAccess
- chat message route no longer uses the legacy domain shortcut
- legacy public chat-history endpoints stay removed
- conversation reads and handoff trigger use requireWidgetSession

widget-session-token and voice-session-token:

- valid tokens round-trip
- tampering is rejected
- wrong secret is rejected
- expired token is rejected
- missing/malformed token is rejected
- issuance returns undefined rather than throwing when no secret exists

rate-limit:

- per-visitor limits still work
- per-IP ceiling blocks forged visitor IDs
- X-Forwarded-For is ignored when TRUST_PROXY is not set
- store failures fail open
- client-key namespacing works

url-guard:

- private IPv4 ranges blocked
- private IPv6 and IPv4-mapped IPv6 blocked
- metadata hosts blocked
- reserved TLDs blocked
- non-HTTP schemes blocked
- DNS resolution to private IP blocked
- mixed DNS answers with any private IP blocked

widget/web:

- embed code includes data-client-key only when provided
- CORS allows X-FrontFace-Session
- widget clearProjectData clears session token

### Test limitations

1. Several tests are static source tests.
   - Useful as guardrails.
   - They do not prove runtime route behavior end-to-end.

2. No browser E2E is encoded for:
   - old widget under enforcement
   - hosted public page conversation switching
   - agent handoff after session token enforcement
   - voice call callback under enforcement

3. No Redis integration test runs against an actual Redis server.
   - Store interface is unit-tested through TestStore.
   - Redis Lua path is not live-tested.

## Security Review Findings And Follow-ups

### Finding 1: .mcp.json contains credentials in the diff

Severity:

- High for repository hygiene.

Why:

- The file is tracked and modified.
- The diff includes API/MCP credentials.

Recommendation:

- Do not include .mcp.json in this security commit.
- Sanitize or move secrets out of tracked config.
- Rotate any exposed keys if this repo is shared beyond your local machine.

### Finding 2: Current staged state is incomplete

Severity:

- High for review/commit safety.

Why:

- Staged tests import untracked source files.
- apps/api/package.json is staged but pnpm-lock.yaml is unstaged.
- Runtime implementation is mostly unstaged.

Recommendation:

- Before commit/review, either:
  - stage the full coherent security patch, or
  - unstage everything and restage intentionally by topic.

Suggested commit grouping:

1. Supabase migrations and probe scripts.
2. API public gate/session-token/SSRF/rate-limit implementation.
3. Widget/web/mobile client contract updates.
4. Tests.
5. Docs.

Do not commit unrelated marketing/product docs with the security patch unless
that is intentional.

### Finding 3: GET /api/chat/feedback remains ungated — **FIXED 2026-06-28**

Severity:

- Medium. (Resolved)

Fix applied:

- GET /api/chat/feedback now gated with
  `requirePublicWidgetAccess({ action: "feedback-read", projectIdSource: "query" })`.
- Widget (`chat-window.ts`) updated to send `projectId` as a query param and
  include auth headers via `widgetHeaders()` (`X-FrontFace-Key`,
  `X-FrontFace-Session`, `X-Visitor-Id`).
- Both POST and GET /api/chat/feedback are now gated consistently.

### Finding 4: Explicit token secrets are not documented

Severity:

- Medium.

Why:

- New code supports WIDGET_SESSION_SECRET and VOICE_SESSION_SECRET.
- apps/api/.env.example does not list them.
- Fallback to ENCRYPTION_KEY works but mixes purposes.

Recommendation:

- Add WIDGET_SESSION_SECRET and VOICE_SESSION_SECRET to .env.example.
- Use separate high-entropy values in production.

### Finding 5: Enforced gate requires deploy sequencing

Severity:

- Medium operational risk.

Why:

- Old widget/public-page clients do not send X-FrontFace-Session.
- Enforcement will fail protected public conversation reads/actions.

Recommendation:

- Deploy API and widget bundle together.
- Smoke test:
  - new text chat
  - reload and rehydrate messages
  - handoff trigger
  - handoff polling
  - lead-first flow
  - public hosted page flow

### Finding 6: Firecrawl DNS rebinding defense is best-effort

Severity:

- Medium, inherent limitation.

Why:

- The app resolves before handing URL to Firecrawl.
- Firecrawl performs the actual fetch and may resolve independently later.

Recommendation:

- Keep current app-level checks.
- If Firecrawl offers SSRF allow/deny controls, enable equivalent protections
  there too.
- Consider logging blocked reasons and monitoring attempted private URLs.

### Finding 7: Rate-limit Redis path needs production validation

Severity:

- Low/Medium.

Why:

- Unit tests prove limiter behavior through the store interface.
- They do not run a real Redis instance.

Recommendation:

- In staging/prod, confirm startup logs show Redis connected.
- Run an operational smoke test that reaches 76 requests from same IP with
  unique visitor IDs and sees a 429.

### Finding 8: Conversation ownership not verified on resume/handoff — **FIXED 2026-06-28**

Severity:

- High (conversation hijack / token minting / handoff message injection).

Why (three gaps):

1. `getOrCreateConversation` in `apps/api/src/services/conversation.ts` looked
   up an existing conversation by `(id, project_id)` only — it did not verify
   `visitor_id`. The retry path after insert-conflict had only `id`.
2. `checkConversationHandoffState` in `apps/api/src/services/chat-engine.ts`
   looked up by `id` only — no `project_id`, no `visitor_id`. If the
   conversation was in `waiting` or `agent_active`, `storeCustomerMessageOnly`
   would insert a message into that conversation with no ownership check, and
   `chatRouter` would mint a fresh session token for the returned sessionId.
3. `createHandoffConversation` in `apps/api/src/services/handoff-trigger.ts`
   looked up by `id` only (line 564), and all subsequent updates (reassign at
   line 594, queue-previous-unavailable at line 686, queue-no-agent at line 722,
   conflict-update at line 799) used `.eq("id", sessionId)` without ownership
   predicates. An attacker could mutate another visitor's conversation status
   to `waiting`/`agent_active`, trigger broadcasts, and insert system messages
   into a live handoff.

Attack: an attacker who knew a handoff conversation UUID could send
`POST /api/chat/message` with that sessionId and a different visitorId to
inject messages into a live agent conversation and obtain a session token.
The handoff-trigger path could additionally mutate conversation status and
broadcast to agent channels.

Fix applied:

- `getOrCreateConversation`: added `.eq("visitor_id", visitorId)` to the primary
  lookup (line 55). Added `.eq("project_id", projectId)` and
  `.eq("visitor_id", visitorId)` to the insert-conflict retry (line 86–89).
  If the supplied id is unusable (belongs to another visitor), the function now
  **falls through** to the normal create/reuse path instead of throwing 500.
- `checkConversationHandoffState`: now requires `(sessionId, projectId,
  visitorId)` and queries with all three. A conversation that does not belong
  to this visitor returns `isInHandoff: false`, so the request falls through to
  the now-fixed `getOrCreateConversation` path — no injection, no token minting.
- `createHandoffConversation`: added `.eq("project_id", projectId)` and
  `.eq("visitor_id", visitorId)` to the initial lookup and all update queries.
  On the 23505 conflict path, the ownership-checked update now uses
  `.select("id").maybeSingle()` to confirm a row was actually matched. If the
  UUID belongs to another visitor (zero rows matched), the supplied sessionId is
  discarded and a fresh waiting conversation is created with a new UUID — no
  broadcast or return of the foreign conversation id.

### Finding 9: POST /api/chat/message continuation did not require session token — **FIXED 2026-06-28**

Severity:

- Medium (defense-in-depth; visitor_id checks in Finding 8 are the primary
  gate, but visitorId is still client-supplied).

Why:

- `POST /api/chat/message` accepted a `sessionId` in the body to continue an
  existing conversation. The ownership checks added in Finding 8 use
  `visitor_id`, but `visitorId` is a client-supplied value — an attacker can
  set it to any string.
- The session token (`X-FrontFace-Session`) is an HMAC-signed bearer that binds
  `(projectId, visitorId, conversationId)` — it cannot be forged.
- Without requiring the session token on continuation, the visitor_id checks
  are the only gate, and they trust client input.

Fix applied:

- `apps/api/src/routes/chat.ts`: when `input.sessionId` is present, verifies
  `X-FrontFace-Session` and checks `claims.conversationId === input.sessionId`.
  First messages (no sessionId) skip this — they create a new conversation.
  Follows the same monitor/enforce pattern (`WIDGET_GATE_ENFORCE`).
- `apps/widget/src/utils/api.ts`: `SendMessageOptions` now accepts
  `sessionToken`; `sendMessage` passes it via `widgetHeaders`.
- `apps/widget/src/components/chat-window.ts`: both `sendMessage` call sites
  now pass `this.sessionToken`.
- `apps/web/app/c/[handle]/public-chat.tsx`: sends `X-FrontFace-Session` header
  from stored session token when continuing a conversation.

## Suggested Reviewer Checklist

Database:

- Confirm Phase A migration applied to staging.
- Run Supabase advisors after migrations.
- Run security:probe:supabase with anon key.
- Run RPC probe with anon and authenticated JWT.
- Confirm dashboard authenticated reads still work.

API:

- Confirm WIDGET_GATE_ENFORCE=true in staging.
- Confirm WIDGET_SESSION_SECRET or ENCRYPTION_KEY exists.
- Confirm TRUST_PROXY and nginx/Cloudflare real-IP settings are correct.
- Confirm REDIS_URL points at real Redis or is intentionally unset.
- ~~Confirm GET /api/chat/feedback is addressed.~~ Done — gated with requirePublicWidgetAccess.

Widget:

- Confirm embed code includes data-client-key for newly generated snippets.
- Confirm test.html uses local bundle/API when doing local smoke.
- Confirm sessionToken persists across reload.
- Confirm clear/new chat clears sessionToken.

Hosted public page:

- Confirm initial chat stores token.
- Confirm refresh rehydrates with token.
- Confirm recent conversation switching still fetches the right token.

Handoff:

- Confirm handoff availability loads.
- Confirm trigger handoff succeeds with session token.
- Confirm polling status/messages succeeds.
- Confirm offline message submits through the public gate.

Voice:

- Confirm voice config returns voiceSessionToken.
- Confirm ElevenLabs extra_body includes voiceSessionToken.
- Confirm callback rejects without token when WIDGET_GATE_ENFORCE=true.

SSRF:

- POST onboarding crawl with metadata IP returns 400.
- POST knowledge scrape with metadata IP returns 400.
- POST both with 127.0.0.1.nip.io returns 400 before creating crawl job.
- Confirm crawl_jobs count does not increase for blocked probes.

Rate limit:

- Confirm normal chat works.
- Confirm unique visitor IDs from same IP eventually hit IP ceiling.
- Confirm X-Forwarded-For cannot be spoofed through nginx config.

## Verification Evidence From Current Filesystem

Commands run on 2026-06-28:

```bash
pnpm test
```

Result:

- 168 tests
- 168 passed
- 0 failed

```bash
pnpm type-check
```

Result:

- 6 successful package tasks
- 0 failed package tasks

Earlier smoke evidence from this security review:

- Dashboard loaded without 401/403 loops.
- Knowledge page loaded.
- SSRF probes returned INVALID_URL on current-code API.
- crawl_jobs count did not increase after blocked SSRF probes.
- Per-IP rate limiter returned 429 on request 76 with unique visitor IDs.

## Bottom Line

The implementation direction is sound:

- database exposure is reduced,
- public service-role-backed routes get a shared gate,
- conversation reads get bearer session tokens,
- voice callback gets a short-lived token,
- SSRF coverage is significantly better,
- rate limiting now resists visitorId forgery and can use Redis.

The main items to resolve before a clean commit/review are:

1. Do not commit .mcp.json with credentials.
2. Stage the coherent source/test/lockfile set together.
3. ~~Gate GET /api/chat/feedback.~~ Done — gated with requirePublicWidgetAccess (2026-06-28).
4. Document WIDGET_SESSION_SECRET and VOICE_SESSION_SECRET.
5. Keep the unrelated marketing/product docs out of the security patch unless
   they are intentionally part of this review.
