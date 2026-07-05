# Channel Foundation Specification

## Metadata
- **Feature ID**: CHAN-001
- **Feature Name**: Channel Foundation (multi-channel data model)
- **Category**: Channels
- **Priority**: P0
- **Complexity**: Low–Medium
- **Target Version**: Omnichannel v1 (Week 1)
- **Dependencies**: Existing `conversations` / `customers` / `messages` tables; `encryption.ts`
- **Owner**: Backend
- **Status**: Approved — ready to build

## Summary
Establish the provider-agnostic data layer that every channel (WhatsApp first, Instagram/Messenger later)
plugs into: a new `whatsapp` value on the existing `conversations.source` enum, a `channel_connections`
table to store per-project channel credentials (encrypted) and the routing key, a `phone` column on
`customers` for WhatsApp identity, and a DB-level idempotency guard for inbound provider messages. This is
purely additive — it changes no existing behavior — and unblocks CHAN-002/003/004.

## User Story
As a FrontFace operator, I want a clean channel data model so that connecting a WhatsApp number stores its
credentials securely, inbound messages resolve to the right project, and the same agent + inbox + analytics
work across channels without per-channel forks.

## Functional Requirements

### FR-001: `whatsapp` conversation source
- Add `'whatsapp'` to the `conversations.source` CHECK constraint.
- **Verified live** (dev `gjotktstaruezfjnslup`, 2026-06-26): the constraint is currently
  `('widget','playground','mcp','api','voice','public','mobile')`.
- Thread `'whatsapp'` through every code-level source list (see FR-005).
- The legacy `chat_sessions_source_check` is stale (old 5 values) **but `chat_sessions` is a dead table**
  (0 rows on dev; no inserts anywhere in the codebase — only legacy *read* fallbacks in `handoff.ts` /
  `chat.ts`). The WhatsApp write path uses `conversations` + `messages` only, so fixing it is optional
  cosmetic cleanup, **not** a blocker.

### FR-002: `channel_connections` table
- One row = one project's connection to one channel provider.
- **v1 constraint:** at most one *active* connection per `(project_id, provider)` — enforce in the API/UI
  (the table may physically hold more, e.g. a disabled prior connection).
- Routing key: `external_id` holds the WhatsApp **`phone_number_id`**; it must be globally unique per
  provider so an inbound webhook resolves to exactly one project.
- Credentials are encrypted at rest (FR-004).
- Column set is **forward-compatible with Embedded Signup** — the self-serve fast-follow returns the same
  `waba_id` / `phone_number_id` / token shape, so it writes the *same* rows the manual form does (no schema
  churn between v1 and the fast-follow).

### FR-003: `customers.phone`
- Add nullable `phone text` to `customers` for WhatsApp contact identity (the table currently has
  `visitor_id`, `email`, `name`, `merged_visitor_ids[]` — **no phone**, verified live).
- Populated from the inbound `wa_id` on first WhatsApp contact (CHAN-002).
- `merged_visitor_ids[]` (already present) is reserved for later identity unification — out of scope here.

### FR-004: Credential encryption (reuse, do not reinvent)
- Encrypt the credentials blob with the **existing** `apps/api/src/services/encryption.ts`
  (`encryptAuthConfig` / `decryptAuthConfig`, AES-256-GCM, `ENCRYPTION_KEY` env). This is the same
  mechanism `api_endpoints.auth_config` already uses — do **not** add a new crypto system.
- Credentials never appear in env or in API responses (write-only from the dashboard; status read-back
  only).

### FR-005: Source-enum threading (all sites)
Add `'whatsapp'` to every place the source set is enumerated (grep-confirmed):
- `ChatSource` union — `apps/api/src/services/chat-engine.ts:69`
- `validateChatInput` `validSources` — `apps/api/src/services/chat-engine.ts:1181`
- `ensure-conversation` `validSources` — `apps/api/src/routes/chat.ts:488`
- zod enum — `apps/api/src/routes/conversations.ts:35`
- analytics source list — `apps/api/src/routes/analytics.ts:96`
- lead-capture source list — `apps/api/src/routes/lead-capture.ts:35`
- DB CHECK — the FR-001 migration

### FR-006: Inbound idempotency guard
- A partial unique index on `messages ((metadata->>'wa_message_id'))` (where present) so a Meta webhook
  retry of the same `wa_message_id` cannot create a duplicate message even under a race. Belt-and-braces
  with the app-level dedupe check in CHAN-002.

### FR-007: Security — `channel_connections` grants & policies *(added 2026-06-28, security baseline)*
The June 2026 hardening round revoked all `anon` access on tenant tables and tightened `authenticated`
write grants to owner-only. `channel_connections` stores encrypted credentials — the browser has **no
legitimate read path** (credential decrypt happens in the API via service role; the dashboard Channels tab
reads connection *status* through an authenticated API endpoint, not a direct Supabase query). Therefore:

- **Revoke ALL from anon** — matching the blanket `20260626000001` revoke.
- **Revoke ALL from authenticated** — stricter than most tables because *no* browser query needs this
  table. Dashboard reads go through `authMiddleware`-protected API routes using `supabaseAdmin` (service
  role). This avoids the class of issue where a mis-scoped `authenticated` policy accidentally exposes
  credentials via the data API.
- **Revoke TRUNCATE, REFERENCES, TRIGGER from anon, authenticated** — matching `20260627174410`.
- **RLS enabled** with owner-only policies gated on `projects.user_id = auth.uid()` as defense-in-depth
  (following the post-hardening `project_client_keys` pattern from `20260627120415`), even though
  `authenticated` has no grants. This ensures that if grants are ever re-added (e.g. for realtime), the
  RLS fence is already in place.

### FR-008: Security — no new `SECURITY DEFINER` functions *(added 2026-06-28)*
This spec introduces no SQL functions. If any are added during implementation, they must pin
`search_path = public, pg_temp` (matching the 18-function fix in `20260626000001`).

### FR-009: Typed provider config in `channel_connections.config` *(added 2026-06-29)*
The `config` JSONB column carries per-connection behavioral settings that govern how FrontFace handles
inbound messages, AI replies, and human handoff for that connection. The schema is provider-agnostic —
future channels (Instagram, Messenger) use the same shape with provider-appropriate defaults.

```typescript
interface ChannelConnectionConfig {
  /** Enable AI auto-replies for inbound messages on this connection. Default: true. */
  aiAutoReply: boolean;

  /**
   * How to resolve an existing conversation for an inbound message.
   * - "latest_open": Reuse the latest conversation for project + source + visitorId where
   *   status ∈ {ai_active, waiting, agent_active}. Only create new when all prior conversations
   *   are resolved/closed. Correct for phone-number-based channels (WhatsApp, future SMS) where
   *   the phone number IS the session — prevents AI from creating a parallel conversation while
   *   a human is handling one.
   * - "ai_active_only": Only reuse ai_active conversations; other statuses start fresh.
   *   Correct for widget/web where the user can intentionally start a new chat.
   * Default: "latest_open" for whatsapp; "ai_active_only" for widget-like channels.
   */
  resolutionStrategy: "latest_open" | "ai_active_only";

  /**
   * What happens when a human agent takes over the conversation.
   * - "pause_ai": AI stops replying but resumes automatically per resumePolicy.
   * - "stop_ai": AI stops replying permanently for this conversation (agent must manually re-enable).
   * Default: "pause_ai".
   */
  humanTakeoverPolicy: "pause_ai" | "stop_ai";

  /**
   * When AI resumes after a handoff is resolved (conversation returns to ai_active).
   * Only applies when humanTakeoverPolicy is "pause_ai".
   * - "on_new_inbound": AI resumes on the next customer message after status returns to ai_active.
   * - "manual": AI only resumes when an agent explicitly re-enables it.
   * Default: "on_new_inbound".
   */
  resumePolicy: "on_new_inbound" | "manual";
}
```

**WhatsApp defaults** (applied when `config` is `{}` or keys are missing):
`{ aiAutoReply: true, resolutionStrategy: "latest_open", humanTakeoverPolicy: "pause_ai", resumePolicy: "on_new_inbound" }`

These defaults are resolved at read time in the inbound orchestrator (CHAN-002) and dispatcher (CHAN-003),
not stored — so existing rows with `config: {}` automatically get correct behavior.

## UI Mockup
No UI in this spec (data layer only). The connection-management UI lives in CHAN-004 (Channels settings
tab). For reference, the row a successful manual connect produces:

```
channel_connections row (after manual WhatsApp connect):
+--------------------------------------------------------------+
| id            | 7f3a...                                       |
| project_id    | proj_123abc                                   |
| provider      | whatsapp                                      |
| external_id   | 109876543210987   (phone_number_id, UNIQUE)   |
| display_name  | +1 555 010 0042                               |
| credentials   | <AES-256-GCM blob: access_token, app_secret,  |
|               |  verify_token, waba_id>                       |
| config        | {} (defaults resolved at read time; see FR-009)|
| status        | active                                        |
+--------------------------------------------------------------+
```

## Technical Approach

### Migrations (mirror `supabase/migrations/` conventions)

**1. `<ts>_add_whatsapp_source.sql`** — clone `20260610000008_add_mobile_source.sql`:
```sql
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_source_check;
ALTER TABLE conversations ADD CONSTRAINT conversations_source_check
  CHECK (source IN ('widget','playground','mcp','api','voice','public','mobile','whatsapp'));
-- (Optional cosmetic) chat_sessions is dead; only re-add its constraint if doing cleanup.
```

**2. `<ts>_create_channel_connections.sql`**
```sql
CREATE TABLE channel_connections (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  provider     text NOT NULL CHECK (provider IN ('whatsapp')),   -- extensible later
  external_id  text NOT NULL,                                     -- WhatsApp phone_number_id (routing key)
  display_name text,                                              -- phone string for UI
  credentials  text NOT NULL,                                     -- AES-256-GCM blob (see FR-004)
  config       jsonb NOT NULL DEFAULT '{}'::jsonb,
  status       text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled','error')),
  last_error   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_id)
);
CREATE INDEX idx_channel_connections_project ON channel_connections(project_id);

-- Security: RLS + lockdown (matching June 2026 hardening end-state).
ALTER TABLE channel_connections ENABLE ROW LEVEL SECURITY;

-- No browser query path — revoke both anon and authenticated (service-role-only table).
REVOKE ALL ON TABLE public.channel_connections FROM anon;
REVOKE ALL ON TABLE public.channel_connections FROM authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.channel_connections FROM anon, authenticated;

-- Owner-only defense-in-depth policies (active only if authenticated grants are re-added later).
CREATE POLICY "Project owners can read channel connections"
  ON public.channel_connections FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = channel_connections.project_id
      AND p.user_id = (SELECT auth.uid()) AND p.deleted_at IS NULL
  ));

CREATE POLICY "Project owners can manage channel connections"
  ON public.channel_connections FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = channel_connections.project_id
      AND p.user_id = (SELECT auth.uid()) AND p.deleted_at IS NULL
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = channel_connections.project_id
      AND p.user_id = (SELECT auth.uid()) AND p.deleted_at IS NULL
  ));
```

**3. `<ts>_add_customer_phone.sql`**
```sql
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone text;
```

**4. `<ts>_add_wa_message_id_idempotency.sql`**
```sql
CREATE UNIQUE INDEX IF NOT EXISTS uniq_messages_wa_message_id
  ON messages ((metadata->>'wa_message_id'))
  WHERE metadata ? 'wa_message_id';
```

### Data Model (TypeScript)
```typescript
type ChannelProvider = 'whatsapp'; // extensible: | 'instagram' | 'messenger'

interface ChannelConnection {
  id: string;
  projectId: string;
  provider: ChannelProvider;
  externalId: string;          // WhatsApp phone_number_id
  displayName?: string;
  status: 'active' | 'disabled' | 'error';
  lastError?: string;
  config: ChannelConnectionConfig;  // see FR-009; stored as JSONB, defaults resolved at read time
  createdAt: string;
  updatedAt: string;
}

// Decrypted credentials shape (never returned to the client)
interface WhatsAppCredentials {
  accessToken: string;   // permanent system-user token
  appSecret: string;     // for X-Hub-Signature-256 HMAC
  verifyToken: string;   // webhook GET verification
  wabaId: string;
}
```

### Service (new) — `apps/api/src/services/channels/connections.ts`
```
getConnectionByExternalId(provider, externalId)  // webhook → project resolution (CHAN-002)
getActiveConnection(projectId, provider)         // dashboard read + outbound send (CHAN-003)
upsertConnection(projectId, provider, { externalId, displayName, credentials })  // encrypts via encryption.ts
setConnectionStatus(id, status, lastError?)
```

## Acceptance Criteria

### AC-001: Source accepted
- Inserting a `conversations` row with `source='whatsapp'` succeeds; an unknown source still fails the
  CHECK.

### AC-002: Connection round-trips encrypted
- `upsertConnection` stores credentials such that the raw row's `credentials` column is **not** plaintext;
  `getActiveConnection` + decrypt returns the original `WhatsAppCredentials`.
- `ENCRYPTION_KEY` unset → encryption throws (matches existing behavior); no silent plaintext fallback.

### AC-003: Routing key uniqueness
- Two `channel_connections` with the same `(provider, external_id)` cannot coexist (unique violation).
- `getConnectionByExternalId('whatsapp', phoneNumberId)` returns exactly one project or null.

### AC-004: One active connection per project
- Attempting to activate a second WhatsApp connection for a project is rejected at the API with a clear
  error (or supersedes the prior one, per chosen policy) — never two `status='active'` rows for the pair.

### AC-005: Idempotency index
- Inserting two `messages` rows with the same `metadata->>'wa_message_id'` raises a unique violation;
  rows without `wa_message_id` are unaffected.

### AC-006: Customer phone
- A WhatsApp customer row carries `phone`; widget/web customers keep `phone = NULL` with no regression.

### AC-007: No behavior change for existing channels
- Widget/public/voice/mobile flows are byte-for-byte unchanged (additive enum + columns only).

### AC-008: Anon cannot access `channel_connections` *(security baseline)*
- An unauthenticated Supabase client (`anon` key) querying `channel_connections` via PostgREST/GraphQL
  receives zero rows / permission denied. Verified by the same `security:probe:supabase` script used in
  the hardening round.

### AC-009: Authenticated non-owner cannot access `channel_connections` *(security baseline)*
- A signed-in user who is NOT the project owner receives zero rows from `channel_connections` for that
  project via direct Supabase query. All CRUD goes through `authMiddleware`-protected API routes.

## Out of Scope
- Connection-management UI (→ CHAN-004).
- Inbound parsing / webhook (→ CHAN-002).
- Identity unification via `merged_visitor_ids` (fast-follow).
- Multi-number-per-project, per-channel routing (fast-follow).

## Success Metrics
- Zero regressions in existing source flows (existing test suite green).
- A pilot WhatsApp connection stored and resolvable by `phone_number_id` in < 1 min from form submit.

## Questions & Decisions
- **Q**: Generic `channel_connections` vs WhatsApp-specific table?
  - **A**: Generic with a `provider` column — IG/Messenger reuse it; KISS, one table.
- **Q**: Store `last_inbound_at` / `wa_message_id` as columns?
  - **A**: No — keep them in `conversations.metadata` / `messages.metadata` (jsonb, both `NOT NULL` live).
    Promote to columns only if query needs grow.
- **Q**: Fix the stale `chat_sessions` constraint?
  - **A**: Optional. Verified dead table (0 rows, no inserts) — not on the WhatsApp path.

## References
- [CHAN-002 WhatsApp Inbound](../02-whatsapp-inbound/spec.md)
- [CHAN-004 Dashboard Channel-Awareness](../04-dashboard-channel-awareness/spec.md)
- `apps/api/src/services/encryption.ts` (AES-256-GCM, reuse target)
- `supabase/migrations/20260610000008_add_mobile_source.sql` (migration pattern)
- `project_client_keys` table (per-project credential precedent)
