# WhatsApp Inbound Specification

## Metadata
- **Feature ID**: CHAN-002
- **Feature Name**: WhatsApp Inbound (Cloud API adapter + webhook + shared orchestrator)
- **Category**: Channels
- **Priority**: P0
- **Complexity**: Medium
- **Target Version**: Omnichannel v1 (Week 1–2)
- **Dependencies**: CHAN-001 (foundation); `processChat`, `getOrCreateConversation`, `getConversationHistory`
- **Owner**: Backend
- **Status**: Approved — ready to build

## Summary
Receive inbound WhatsApp messages via the Meta Cloud API webhook, resolve them to a project + conversation,
run them through the **same** `processChat` engine the widget uses (KB, persona, handoff, lead capture),
and send the AI reply back over WhatsApp. The webhook is thin and Meta-specific; all channel-independent
orchestration lives in a shared `handleInbound(source, parsed)` so future channels are *just an adapter*.
Includes the engine-level fix that prevents an amnesiac bot on server-side channels.

## User Story
As an end customer, I message a business's WhatsApp number and get an immediate, knowledge-grounded answer
from the same AI agent that powers their website chat — and if I ask for a human, my messages reach a live
agent in the FrontFace inbox.

## Functional Requirements

### FR-001: Webhook verification (GET)
- `GET /api/channels/whatsapp/webhook` handles Meta's subscription handshake: echo `hub.challenge` when
  `hub.mode=subscribe` and `hub.verify_token` matches the connection's stored `verify_token`.

### FR-002: Signature verification (POST)
- Every `POST` is authenticated by `X-Hub-Signature-256` = HMAC-SHA256(rawBody, `app_secret`).
- **Raw body required.** `express.json()` is mounted globally (`apps/api/src/index.ts` ~`:82`) and
  consumes the stream, so add a `verify: (req,_res,buf) => { req.rawBody = buf }` callback to the JSON
  parser and HMAC over `req.rawBody`. (One mechanism — do not also add a scoped raw parser.)
- **Use `crypto.timingSafeEqual`** for the HMAC comparison — matching the pattern established by
  `widget-session-token.ts` and `voice-session-token.ts` during the security hardening.
- Invalid signature → `401`, no processing.

### FR-003: Fast ACK + async processing
- After signature check, **respond `200` immediately**, then process via `void handleInbound(...)` with
  Sentry capture on rejection.
- Rationale: `processChat` runs RAG + LLM inline (~30s timeout) which exceeds Meta's webhook-retry window;
  holding the connection (as `/api/chat/message` does for the browser) would cause Meta retries.
- **Unknown `phone_number_id` → still ACK `200`** (do not 4xx/5xx) to avoid Meta retry storms; log + drop.

### FR-004: Inbound parsing
- `parseInbound(payload)` extracts `{ phoneNumberId, waId (phone), waMessageId, text, type }` from the
  Cloud API `messages` change. Ignore `statuses` (delivery/read) events in v1.
- **Text-only v1.** Non-text inbound (image/audio/location/etc.) → send a graceful
  "I can read text messages right now — please type your question" reply and do not call the LLM.

### FR-005: Project & conversation resolution *(revised 2026-06-29 — channel-aware strategy)*
- `phoneNumberId` → project via `getConnectionByExternalId('whatsapp', phoneNumberId)` (CHAN-001).
- `visitorId = "whatsapp:" + waId`.
- Read `resolutionStrategy` from `connection.config` (CHAN-001 FR-009); defaults to `"latest_open"` for
  WhatsApp.
- **`latest_open` strategy (WhatsApp default):** Find the latest conversation for
  `project_id + source + visitor_id` where `status IN ('ai_active', 'waiting', 'agent_active')`. Only
  create a new conversation when **no open conversation exists** (all prior are `resolved`/`closed`).
  This prevents the critical bug where AI creates a parallel `ai_active` conversation while a human agent
  is already handling the customer on the same phone number — the phone number IS the session for WhatsApp.
- **`ai_active_only` strategy (widget default):** Existing `getOrCreateConversation` behavior — only reuse
  `ai_active` conversations; other statuses start fresh. Correct for widget where users intentionally start
  new chats.
- **Implementation:** Either extend `getOrCreateConversation` with a `strategy` parameter, or build a
  separate `resolveConversation(projectId, visitorId, source, strategy)` that the orchestrator calls before
  `processChat`. The latter is cleaner — keeps the existing widget path untouched.
- Upsert the customer with `phone = waId` (CHAN-001 FR-003).
- Stamp `conversations.metadata.last_inbound_at = now()` (consumed by CHAN-003's 24h window).

### FR-006: Idempotency — durable inbound reservation *(revised 2026-06-29)*
- A simple "check then insert" has a TOCTOU race: two concurrent Meta retries can both check before
  either writes the message row, and both proceed to run `processChat` (double LLM call, double reply).
- **Fix: early durable reservation.** Before any processing, attempt an INSERT of a lightweight
  reservation row keyed on `wa_message_id` (using the partial unique index from CHAN-001 FR-006). Only
  the winning INSERT proceeds; the loser gets a unique-violation and returns immediately.
- Implementation options (choose one):
  1. **Reserve via the message row itself:** INSERT the customer message row early (with `wa_message_id`
     in metadata, message text, conversation_id). The unique index makes concurrent inserts safe. Then
     `processChat` skips its own customer-message insert (flag or check). This is the simplest path but
     couples the reservation to the message schema.
  2. **Separate reservation table/row:** INSERT into a small `inbound_reservations` table (or use
     `pg_advisory_xact_lock` on a hash of `wa_message_id`). Cleaner separation but adds a table.
- The DB unique index (CHAN-001 FR-006) is the ultimate backstop regardless — even if app-level logic
  has a bug, duplicate message rows cannot exist.

### FR-007: Engine history fix (prevents amnesiac bot)
- `processChat` currently reads conversation history **only** from `input.conversationHistory`
  (`chat-engine.ts:465`) and never loads from the DB. Server-side channels (WhatsApp) have no
  client-supplied history → the bot would forget context between messages.
- **Fix in the engine, not per-webhook:** when `conversationHistory` is absent/empty and `sessionId` is
  present, `processChat` loads it via `getConversationHistory(sessionId)` (`conversation.ts:440`).
- **Verified safe:** the widget always passes its own history (`apps/widget/src/components/chat-window.ts:744-756`),
  so widget/playground are unaffected. Voice already does this inline (`apps/api/src/routes/voice.ts:327-330`);
  this consolidates that workaround and makes the engine correct-by-default for all server-side channels.

### FR-008: Run the engine + guarded AI persistence *(revised 2026-06-29)*
- **Problem with naive approach:** `processChat` currently persists both the customer message and the AI
  reply in a single `logConversationMessages` call. If the stale-state guard (FR-014) runs only *after*
  `processChat` returns, a stale AI reply is already written to the `messages` table — suppressing the
  outbound send still leaves a phantom AI message in the inbox history.
- **Required split:** Separate customer-message persistence from AI-reply persistence so the guard can
  run between them. Two implementation paths (choose one):
  1. **Split `processChat` into phases:** `processChat` persists the customer message and runs RAG+LLM,
     but returns the AI draft **without persisting it**. The orchestrator then runs the stale-state guard
     (FR-014), and only if the guard passes, persists the AI message and dispatches. This requires a new
     `ChatInput` flag (e.g. `deferAiPersistence: true`) so the widget path is unchanged.
  2. **Pre-persist guard hook:** Add a `beforeAiPersist?: (conversationId) => Promise<boolean>` callback
     to `ChatInput`. The engine calls it after generating the AI response but before writing it. If the
     hook returns `false`, the AI message is not persisted and `result.response` is set to `""`. This
     keeps the split internal to the engine.
- Thread `inboundMessageMetadata` through `ChatInput` so the engine stamps `wa_message_id` onto the
  customer-message row it **already** writes. **Do not insert the inbound message separately** — that
  would double-log.
- Handoff is handled by the engine: when the conversation is `agent_active`/`waiting`, `processChat`
  (`chat-engine.ts:212`) stores the customer message, broadcasts to the dashboard, and returns `""`.
- **Key invariant:** The customer message is always persisted (it's evidence the customer wrote). Only
  the AI reply is conditionally suppressed.

### FR-009: Send the AI reply
- If `result.response` is non-empty → `sendText(phoneNumberId, waId, result.response, accessToken)`.
- Empty response (handoff/lead-capture-interceptor) → send nothing; the inbox/human path takes over.
- Outbound send is the **only** genuinely new transport — see CHAN-003 for the unified dispatcher that
  also serves agent replies.

### FR-010: Shared orchestrator
- FR-005…FR-009 live in `handleInbound(source, parsed)` (`apps/api/src/services/channels/inbound.ts`),
  channel-independent. The WhatsApp route only verifies + parses, then calls it. Adding IG/Messenger later
  = a new adapter + route, no re-implementation of orchestration.

### FR-011: Security — webhook is HMAC-gated, NOT widget-gated *(added 2026-06-28, security baseline)*
- The webhook callback (`/api/channels/whatsapp/webhook`) is the **one deliberately-public endpoint** in
  this cut. It is called by Meta's servers, not by a browser — it has no Origin header, no client key,
  and no widget session. **Do NOT wrap it in `requirePublicWidgetAccess`** (the public-widget gate
  introduced in the security hardening). The HMAC signature (FR-002) is the sole gate.
- Rationale: the security hardening introduced `requirePublicWidgetAccess` for all browser-facing public
  endpoints. The webhook is a machine-to-machine callback from Meta; the gate is inappropriate and would
  reject every legitimate request.

### FR-012: Security — rate-limit the webhook by sender, not by IP *(added 2026-06-28, security baseline)*
- Apply a processing-level rate limit inside `handleInbound` to cap LLM/send cost per sender. Key by
  `wa_id` (sender phone) or `phoneNumberId` (project) — **not** by source IP. Meta sends all webhook
  traffic from a small set of IPs; a per-IP limiter would throttle all tenants simultaneously.
- **Critical: the webhook must still ACK `200` even when the rate limit is exceeded** (FR-003 invariant).
  A `429` response would trigger Meta retry storms. The limiter drops *processing* (skips `processChat`
  and the outbound reply) but does not change the HTTP response. Unsigned junk traffic is already
  cheaply rejected at the HMAC stage (FR-002 → 401); the limiter governs only signed, valid traffic
  where the cost is the LLM call.
- The security hardening's per-IP ceiling (preventing visitorId cycling) does not apply here — there is
  no client-supplied visitorId in the webhook flow.

### FR-013: Security — no widget session token for server-side channels *(added 2026-06-28)*
- WhatsApp conversations are created server-side by `handleInbound` — there is no browser to receive a
  session token. Do NOT issue a `widgetSessionToken` for WhatsApp conversations. The conversation data
  is not exposed to any public per-conversation endpoint (status/messages reads are widget-only).
- If a future feature exposes WhatsApp conversation data publicly (e.g. a customer-facing transcript
  link), it must introduce its own authentication mechanism.

### FR-014: AI reply guard — stale-state suppression *(added 2026-06-29, revised for pre-persist)*
- The guard must run **before both AI-reply persistence and outbound dispatch** (see FR-008). A stale AI
  reply that is persisted but not sent is still harmful — it pollutes the conversation history and confuses
  both human agents and future LLM context.
- Suppress the AI reply (do not persist, do not send) if:
  1. Conversation status is no longer `ai_active` (human claimed it while LLM was running), OR
  2. An agent or business message was recorded with a timestamp **after** the inbound customer message
     that triggered this AI job.
- The customer's inbound message is always persisted (FR-008 invariant) — suppression only affects the
  AI response. The customer message remains visible in the inbox for the human agent.
- This handles the race condition: customer sends message → AI job starts (~seconds of RAG+LLM) →
  human agent claims conversation and replies → AI job finishes. Without this guard, both the human
  reply and the AI reply would reach the customer (or at minimum, a phantom AI message appears in history).
- Check `aiAutoReply` from `connection.config` (CHAN-001 FR-009); if `false`, skip `processChat`
  entirely — store only the customer message and broadcast to the inbox.

### FR-015: v1 ownership scope — FrontFace-owned inbox only *(added 2026-06-29)*
- v1 operates under a **declared ownership model**: FrontFace is the sole system sending and receiving
  on the connected WhatsApp number. Under this model there is no blind spot — every inbound message
  arrives via the webhook, and every outbound message (AI or human) goes through `dispatchToChannel`.
- **External inbox coexistence is NOT supported in v1.** If another system (Chatwoot, WhatsApp Business
  App, a third-party BSP) independently sends messages on the same number, FrontFace has no way to
  detect those outbound messages. AI may continue replying because the conversation still appears
  `ai_active` to us. This produces interleaved replies.
- **Future path for WhatsApp Business App coexistence:** Process `smb_message_echoes` webhook events as
  `business_message_echo` events — when detected, pause AI on the affected conversation (transition to
  `agent_active`) until the conversation is explicitly returned to AI. This is a post-v1 integration.
- **Future path for external inbox (Chatwoot etc.):** Either (a) FrontFace acts as the AI responder
  inside the external inbox via their API/webhooks (Chatwoot is source of truth for assignment), or
  (b) explicitly disable `aiAutoReply` for connections where an external system manages the inbox.
- The connection form (CHAN-004) should display a clear notice: "FrontFace will be the only system
  managing this WhatsApp number. If you use another inbox tool on this number, disable AI auto-reply."

## UI Mockup
No UI (server-side ingestion). Sequence:

```
Customer (WhatsApp)        Meta Cloud API            FrontFace API
   |  "do you ship to EU?"   |                          |
   |------------------------>|  POST .../webhook        |
   |                         |------------------------->| verify sig → 200 (ACK)
   |                         |                          |  handleInbound (async):
   |                         |                          |   resolve project by phone_number_id
   |                         |                          |   reserve wa_message_id (idempotency)
   |                         |                          |   resolveConversation(latest_open strategy)
   |                         |                          |   persist customer msg → processChat (RAG+LLM)
   |                         |                          |   guard: re-check status (FR-014)
   |                         |   POST /{pnid}/messages   |   persist AI reply + dispatchToChannel
   |                         |<-------------------------|
   |  "Yes — we ship to ..." |                          |
   |<------------------------|                          |
```

## Technical Approach

### New files
```
apps/api/src/services/channels/whatsapp/adapter.ts   // verify, HMAC, parse, sendText
apps/api/src/services/channels/inbound.ts            // handleInbound(source, parsed) orchestrator
apps/api/src/routes/channels/whatsapp.ts             // GET/POST webhook routes
```

### Adapter — `channels/whatsapp/adapter.ts`
```typescript
export function verifyWebhook(query, verifyToken): string | null;       // returns hub.challenge or null
export function verifySignature(rawBody: Buffer, header: string, appSecret: string): boolean;
  // Implementation MUST use crypto.timingSafeEqual (see voice-session-token.ts / widget-session-token.ts).
export function parseInbound(payload): ParsedInbound | null;            // null if not a text message event
export async function sendText(phoneNumberId, to, text, accessToken): Promise<{ waMessageId: string }>;

interface ParsedInbound {
  phoneNumberId: string;
  waId: string;            // customer phone
  waMessageId: string;
  text: string;
  type: 'text' | 'unsupported';
}
```
`sendText` → `POST https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages` with
`{ messaging_product: 'whatsapp', to, type: 'text', text: { body } }` and
`Authorization: Bearer <accessToken>`.

### Webhook route — `routes/channels/whatsapp.ts` (mount in `apps/api/src/index.ts`)
```typescript
router.get('/webhook', (req, res) => {
  const challenge = verifyWebhook(req.query, /* per-connection or env verify token */);
  return challenge ? res.status(200).send(challenge) : res.sendStatus(403);
});

router.post('/webhook', async (req, res) => {
  const parsed = parseInbound(req.body);
  const conn = parsed && await getConnectionByExternalId('whatsapp', parsed.phoneNumberId);
  if (!conn || !verifySignature(req.rawBody, req.header('x-hub-signature-256'), conn.appSecret))
    return res.sendStatus(parsed && !conn ? 200 : 401);   // unknown number → ACK 200, bad sig → 401
  res.sendStatus(200);                                     // FAST ACK
  void handleInbound('whatsapp', { conn, parsed }).catch(captureException);
});
```

### Orchestrator — `channels/inbound.ts`
```typescript
export async function handleInbound(source, { conn, parsed }) {
  if (parsed.type === 'unsupported') return sendUnsupportedNotice(conn, parsed);

  // FR-006: durable reservation — only the winning INSERT proceeds; losers return immediately.
  const reserved = await reserveInbound(parsed.waMessageId);           // INSERT or unique-violation
  if (!reserved) return;                                               // duplicate — already processing

  const visitorId = `whatsapp:${parsed.waId}`;
  const config = resolveConnectionConfig(conn.config);                 // FR-009 defaults

  // FR-005: channel-aware conversation resolution
  const conversationId = await resolveConversation(
    conn.projectId, visitorId, source, config.resolutionStrategy       // "latest_open" for WhatsApp
  );

  await upsertCustomerPhone(conn.projectId, visitorId, parsed.waId);
  await stampLastInboundAt(conversationId);
  const inboundTs = Date.now();

  // FR-014: skip AI entirely if aiAutoReply is disabled
  if (!config.aiAutoReply) {
    await persistCustomerMessage(conversationId, parsed);              // store + broadcast to inbox only
    return;
  }

  // FR-008: processChat persists customer message + generates AI draft WITHOUT persisting the AI reply
  const result = await processChat({
    projectId: conn.projectId, visitorId, message: parsed.text,
    sessionId: conversationId, source,
    inboundMessageMetadata: { wa_message_id: parsed.waMessageId, phone: parsed.waId },
    deferAiPersistence: true,                                          // NEW: don't write AI msg yet
  });

  // FR-014: AI reply guard — runs BEFORE AI persistence and dispatch
  if (result.response) {
    const fresh = await getConversationState(conversationId);
    const agentRepliedAfter = await hasAgentMessageAfter(conversationId, inboundTs);
    if (fresh.status !== 'ai_active' || agentRepliedAfter) return;     // suppress — no persist, no send

    await persistAiMessage(conversationId, result.response);           // only now write the AI message
    await dispatchToChannel(conversationId, result.response);          // CHAN-003
  }
}
```

### Engine change — `apps/api/src/services/chat-engine.ts`
- `ChatInput` gains `inboundMessageMetadata?: Record<string, unknown>` (stamped onto the customer message).
- Before building the LLM messages (around `:463`): if `!input.conversationHistory?.length && input.sessionId`,
  set history via `getConversationHistory(input.sessionId)`.

### Config
- `GRAPH_API_VERSION` (default `v25.0`) in `apps/api/.env.example` — see CHAN-006. App secrets are
  per-connection only, encrypted in `channel_connections`; there is no global `WHATSAPP_APP_SECRET` fallback.

## Acceptance Criteria

### AC-001: GET verification
- Correct `verify_token` → echoes `hub.challenge` (200); wrong token → 403.

### AC-002: Signature
- Valid `X-Hub-Signature-256` → processed; tampered body or bad signature → 401, no processing.

### AC-003: Fast ACK
- POST returns 200 within the ACK budget (no waiting on RAG/LLM); processing continues async.

### AC-004: Unknown number
- POST for a `phone_number_id` with no `channel_connections` row → 200 ACK, logged, dropped (no retry storm).

### AC-005: Inbound creates a WhatsApp conversation
- A text message creates/updates a `source='whatsapp'` conversation keyed on `whatsapp:<phone>`, with the
  customer `phone` set and `metadata.last_inbound_at` stamped.

### AC-006: Agent answers from KB with memory
- The reply is knowledge-grounded; a follow-up message in the same conversation reflects prior context
  (history loaded from DB), proving the engine fix.

### AC-007: Handoff respected
- When the conversation is `agent_active`/`waiting`, an inbound message is stored + broadcast to the
  dashboard and **no** AI reply is sent.

### AC-008: Idempotency (durable reservation)
- Re-delivering the same `wa_message_id` produces no duplicate message and no duplicate reply.
- Two concurrent webhook deliveries for the same `wa_message_id` result in exactly one processing run
  (the reservation INSERT is the serialization point, not a check-then-insert query).

### AC-009: Single-log
- Exactly one customer-message row per inbound (no double-insert); it carries `metadata.wa_message_id`.

### AC-010: Unsupported media
- A non-text inbound yields the graceful text notice and no LLM call.

### AC-011: HMAC uses timing-safe comparison *(security baseline)*
- `verifySignature` uses `crypto.timingSafeEqual` — not `===` — for the HMAC comparison, preventing
  timing side-channel attacks on the signature.

### AC-012: Webhook not widget-gated *(security baseline)*
- The webhook route is NOT wrapped in `requirePublicWidgetAccess`. A request without Origin/client-key
  headers (like Meta's) is processed normally after HMAC verification.

### AC-013: Webhook rate-limited by sender *(security baseline)*
- Rate limiting on the webhook is keyed by `wa_id` or `phoneNumberId`, not by source IP. A burst from
  one sender/project does not throttle others.

### AC-014: AI reply guard suppresses stale replies — no persist, no send *(revised 2026-06-29)*
- Given: customer sends message → AI job starts → human agent claims conversation (status → `agent_active`)
  → AI job finishes. The AI reply is **neither persisted nor sent**. No phantom AI message row exists in
  the conversation history. The customer's inbound message is preserved in the inbox.

### AC-015: `latest_open` resolution reuses agent_active conversations *(added 2026-06-29)*
- Given an existing `agent_active` WhatsApp conversation for `project + whatsapp:<phone>`, a new inbound
  message from the same phone reuses that conversation (no new conversation created). The message appears
  in the agent's inbox thread, and no AI reply is sent (conversation is not `ai_active`).

### AC-016: `aiAutoReply: false` stores without AI *(added 2026-06-29)*
- Given a connection with `config.aiAutoReply = false`, an inbound message is persisted and broadcast to
  the inbox, but `processChat` is never called and no AI reply is sent.

### AC-017: v1 ownership documented *(added 2026-06-29)*
- The connection form (CHAN-004) displays a notice about FrontFace-owned inbox mode. API docs or inline
  help text clarify that external inbox coexistence requires disabling AI auto-reply.

## Out of Scope
- Outbound dispatcher abstraction + agent-reply routing + 24h window (→ CHAN-003; v1 inbound just calls
  `sendText` for the AI reply).
- Media ingestion/sending beyond the text notice.
- Delivery/read status (`statuses` events).
- Multi-message batching within one webhook payload beyond simple iteration.
- External inbox coexistence (Chatwoot, WhatsApp Business App) — requires `smb_message_echoes` integration
  or Chatwoot webhook bridge (post-v1).

## Success Metrics
- Inbound→AI-reply round-trip < a few seconds on the pilot number.
- 0 duplicate replies under Meta retries.
- Webhook ACK well within Meta's timeout (no retry-induced duplicates in logs).

## Questions & Decisions
- **Q**: Per-connection or env verify token / app secret?
  - **A**: Prefer per-connection (stored in `channel_connections.credentials`); env `WHATSAPP_APP_SECRET`
    is a single-tenant fallback for the pilot.
- **Q**: Queue vs fire-and-forget for async processing?
  - **A**: Fire-and-forget (`void handleInbound`) + Sentry for v1 (KISS). A durable queue is a hardening
    fast-follow if volume grows.
- **Q**: Where does history loading belong?
  - **A**: In `processChat` (engine), not the webhook — correct-by-default for every server-side channel.

## References
- [CHAN-001 Channel Foundation](../01-channel-foundation/spec.md)
- [CHAN-003 Outbound Dispatcher](../03-outbound-dispatcher/spec.md)
- `apps/api/src/services/chat-engine.ts:187` (`processChat`), `:212` (handoff short-circuit), `:465` (history)
- `apps/api/src/services/conversation.ts:41` (`getOrCreateConversation`), `:440` (`getConversationHistory`)
- `apps/api/src/routes/voice.ts:327-330` (existing DB-history workaround being consolidated)
- [Meta WhatsApp Cloud API — Webhooks](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)
