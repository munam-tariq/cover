# Outbound Dispatcher Specification

## Metadata
- **Feature ID**: CHAN-003
- **Feature Name**: Source-Aware Outbound Dispatcher (agent + AI replies → channel)
- **Category**: Channels
- **Priority**: P0
- **Complexity**: Medium
- **Target Version**: Omnichannel v1 (Week 2)
- **Dependencies**: CHAN-001, CHAN-002; agent reply route `conversations.ts POST /:id/messages`
- **Owner**: Backend
- **Status**: Approved — ready to build

## Summary
Introduce one choke point — `dispatchToChannel(conversationId, text)` — that routes an outbound message to
the right transport based on `conversation.source`: WhatsApp Cloud API for `whatsapp`, Supabase Realtime
broadcast (unchanged) for widget/public. This closes the omnichannel loop for **human-agent** replies (an
agent typing in the FrontFace inbox reaches the customer on WhatsApp) and enforces the WhatsApp **24-hour
service window** as a backend invariant. It's the abstraction that makes every future channel trivial.

## User Story
As a support agent, when I reply from the FrontFace inbox to a WhatsApp conversation, my message is
delivered to the customer on WhatsApp — and if the 24-hour window has closed, I'm clearly told I can't send
a free-form message yet, rather than the message silently failing.

## Functional Requirements

### FR-001: Unified dispatcher
- `dispatchToChannel(conversationId, text, opts?)` loads the conversation's `source` (+ metadata) and:
  - `whatsapp` → WhatsApp Cloud API `sendText` (via CHAN-002 adapter + CHAN-001 connection lookup).
  - `widget` / `public` → existing Supabase Realtime broadcast path (unchanged).
- Both AI replies (CHAN-002 FR-009) and agent replies (FR-003) flow through this single function.

### FR-002: 24-hour service window enforcement
- For `whatsapp`, free-form sends are only allowed when `now - conversation.metadata.last_inbound_at < 24h`.
- Outside the window → return a typed `WINDOW_CLOSED` result (no send). Re-engagement templates are a
  fast-follow; v1 does **not** send templates.
- Inside the window, the AI reply and agent replies are free service messages ($0).

### FR-003: Agent-reply routing
- Wire into the agent send path: `apps/api/src/routes/conversations.ts` `POST /:id/messages`
  (handler ~`:706`, `senderType==='agent'` branch ~`:797`).
- After the existing message insert + `broadcastNewMessage` (which keeps the dashboard live view working
  for **every** channel), call `dispatchToChannel` for non-widget sources.
- **Select fix (required):** the handler's conversation `select` (~`:740`) currently fetches only
  `id, project_id, status, assigned_agent_id, first_response_at`. Add `source` and `visitor_id` so the
  dispatcher knows the channel and destination phone (`visitor_id` = `whatsapp:<phone>`).

### FR-004: No ghost messages (ordering) + AI reply guard *(expanded 2026-06-29)*
- For WhatsApp agent replies, **validate the window before persisting** the message — not after.
- Current naive ordering (insert → broadcast → dispatch) would, on a closed window, leave a message shown
  as "sent" in the inbox that was never delivered.
- v1 approach: check the window at the API boundary first; if `WINDOW_CLOSED`, reject with a clear error so
  the composer reacts (CHAN-004) and nothing is persisted as delivered. (Alternative/fast-follow: a
  per-message `delivery_status` column so undelivered messages render distinctly.)
- **AI reply guard (mirrors CHAN-002 FR-014):** The same stale-state check applies in the dispatcher path.
  Before calling `dispatchToChannel` for an AI reply, the caller (inbound orchestrator) must re-read the
  conversation state and suppress if status is no longer `ai_active` or an agent message arrived after the
  inbound. The guard runs **before** the dispatcher, not inside it — so `dispatchToChannel` itself remains
  a pure send primitive. This separation keeps the dispatcher testable and channel-agnostic.

### FR-005: Failure handling
- A Cloud API send failure (network/4xx/5xx) is captured to Sentry and surfaced as a non-2xx from the agent
  send endpoint (so the agent sees it failed); it does not crash the request path.
- AI-reply send failures (async path) are logged/captured but never block the webhook ACK (already 200).

### FR-006: Extensibility
- Adding a channel = one new branch in `dispatchToChannel` + that channel's adapter `sendText`. No changes
  to callers.

### FR-007: Security — service-role-only credential access *(added 2026-06-28, security baseline)*
- `dispatchToChannel` calls `getActiveConnection` which decrypts `channel_connections.credentials` using
  `encryption.ts`. This runs on the API server via `supabaseAdmin` (service role). The decrypted
  credentials (access token, app secret) must **never** be returned to the client or logged.
- The `channel_connections` table has no `anon` or `authenticated` grants (CHAN-001 FR-007) — the
  dispatcher's service-role path is the only way to access credentials.

### FR-008: Security — hardcoded Meta endpoint, no SSRF vector *(added 2026-06-28)*
- `sendText` posts to `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`.
  `graph.facebook.com` is hardcoded — the `phoneNumberId` (path segment) comes from the trusted
  `channel_connections` row, and the `to` phone (request body) is the customer's `wa_id` extracted from
  Meta's verified webhook payload. Neither value is tenant-configurable or user-influenced in a way that
  creates an SSRF risk. Document this explicitly so a future reviewer does not reflexively add an SSRF
  check to a hardcoded outbound URL.
- If a future extension allows tenant-configured outbound webhook URLs (e.g. event hooks), those MUST go
  through `resolveAndValidateUrl` (the DNS-rebinding guard added in the security hardening).

### FR-009: v1 ownership scope — FrontFace is the sole sender *(added 2026-06-29)*
- `dispatchToChannel` assumes FrontFace is the **only** system sending on the connected number. Under this
  declared-ownership model, every outbound message (AI or human) flows through the dispatcher, so delivery
  ordering and window tracking are reliable.
- If an external system (Chatwoot, WhatsApp Business App, another BSP) independently sends messages on the
  same number, FrontFace cannot detect those sends. Consequences:
  - `last_inbound_at` may not reflect the true window state (external reply resets Meta's window but
    FrontFace doesn't know).
  - AI may reply in parallel with the external agent, producing interleaved messages.
- v1 documents this constraint clearly. The connection form (CHAN-004) and API responses should surface
  the ownership expectation. Users who share a number with another inbox must set `aiAutoReply: false`
  (CHAN-001 FR-009) to prevent AI from replying.

## UI Mockup
Backend service; the user-visible surface is the inbox composer (owned by CHAN-004). Window-closed state:

```
Inbox composer — WhatsApp conversation, window closed:
+----------------------------------------------------------+
|  [ 24h window closed — you can't send a free-form reply.  |
|    Re-engagement templates are coming soon. ]            |
|  [ message input disabled ]                  [Send] (off)|
+----------------------------------------------------------+
```

## Technical Approach

### New file — `apps/api/src/services/outbound-dispatcher.ts`
```typescript
type DispatchResult =
  | { ok: true; transport: 'whatsapp' | 'realtime' }
  | { ok: false; reason: 'WINDOW_CLOSED' | 'SEND_FAILED'; detail?: string };

export async function dispatchToChannel(conversationId: string, text: string): Promise<DispatchResult> {
  const convo = await getConversationForDispatch(conversationId); // selects source, visitor_id, metadata
  switch (convo.source) {
    case 'whatsapp': {
      const lastInbound = convo.metadata?.last_inbound_at;
      if (!lastInbound || Date.now() - Date.parse(lastInbound) >= 24 * 3600_000)
        return { ok: false, reason: 'WINDOW_CLOSED' };
      const conn = await getActiveConnection(convo.projectId, 'whatsapp');
      const to = convo.visitorId.replace(/^whatsapp:/, '');
      try {
        await sendText(conn.externalId, to, text, conn.credentials.accessToken);
        return { ok: true, transport: 'whatsapp' };
      } catch (e) {
        captureException(e);
        return { ok: false, reason: 'SEND_FAILED', detail: String(e) };
      }
    }
    default:
      return { ok: true, transport: 'realtime' }; // existing broadcast path unchanged
  }
}

// Used by the API boundary (FR-004) before persisting an agent message:
export async function canSendFreeForm(conversationId: string): Promise<boolean>;
```

### Agent send path change — `apps/api/src/routes/conversations.ts`
```typescript
// ~:740  add source + visitor_id to the select
.select('id, project_id, status, assigned_agent_id, first_response_at, source, visitor_id')

// before insert (FR-004): if source !== 'widget'/'public' and !canSendFreeForm(id) → 409 WINDOW_CLOSED
// after insert + broadcastNewMessage (~:797 .. :825):
if (conversation.source !== 'widget' && conversation.source !== 'public') {
  const r = await dispatchToChannel(id, content);
  if (!r.ok) return res.status(502).json({ error: { code: r.reason, message: '...' } });
}
```

### AI reply path (from CHAN-002)
- `handleInbound` calls `dispatchToChannel(conversationId, result.response)` for the AI reply — same choke
  point, so the AI reply also respects the window and uses the same send code.
- **The AI reply guard (CHAN-002 FR-014) runs in the orchestrator before calling `dispatchToChannel`.**
  The dispatcher is a pure send primitive — it does not re-check conversation status. This keeps the
  dispatcher testable and avoids coupling it to conversation lifecycle logic.

## Acceptance Criteria

### AC-001: Agent reply reaches WhatsApp
- Given an `agent_active` WhatsApp conversation inside the window, an inbox reply is delivered to the
  customer on WhatsApp and persisted + broadcast to the dashboard.

### AC-002: Window enforced
- Given `last_inbound_at` > 24h ago, a free-form WhatsApp send is rejected with `WINDOW_CLOSED`; no Cloud
  API call is made.

### AC-003: No ghost message
- A `WINDOW_CLOSED` rejection leaves **no** persisted "sent" agent message in the inbox (validated before
  insert).

### AC-004: Widget unchanged
- Widget/public agent replies still deliver via Supabase Realtime exactly as before (no WhatsApp code path).

### AC-005: Select carries channel
- The agent send handler reads `source` + `visitor_id`; dispatcher derives the destination phone correctly.

### AC-006: Send failure surfaced
- A simulated Cloud API 500 yields a non-2xx to the agent and a Sentry event; the request path doesn't crash.

### AC-007: AI reply uses the dispatcher
- The CHAN-002 inbound AI reply path routes through `dispatchToChannel` (same window + send logic), not a
  direct `sendText`.

### AC-008: Credentials never leaked *(security baseline)*
- The dispatcher's response and logs contain **no** decrypted credential material (access token, app
  secret). The `DispatchResult` type carries only transport/status/error detail — never secrets.

### AC-009: Agent send path remains auth-gated *(security baseline)*
- The agent send handler (`POST /:id/messages`) remains behind `authMiddleware` (dashboard JWT). The
  dispatcher is called from within the authenticated handler — no new public endpoint is introduced.

### AC-010: v1 ownership assumption documented *(added 2026-06-29)*
- Connection form and/or API docs clearly state FrontFace must be the sole sender on the number. Users
  sharing a number with an external inbox are directed to disable `aiAutoReply`.

## Out of Scope
- Outbound re-engagement **templates** + template management UI (fast-follow).
- `delivery_status` per-message column (optional hardening).
- Per-channel retry/backoff queue (hardening).
- Non-text outbound (media, interactive messages).
- External inbox coexistence detection (`smb_message_echoes`, Chatwoot webhook bridge) — post-v1.

## Success Metrics
- 100% of in-window agent replies to WhatsApp delivered.
- 0 ghost messages on window-closed attempts.
- Single send-code path shared by AI + agent replies (measured by code review, not two implementations).

## Questions & Decisions
- **Q**: Reject vs persist-then-mark on window-closed?
  - **A**: Reject before insert in v1 (no ghosts); revisit with `delivery_status` if product wants a record
    of the attempt.
- **Q**: Should widget replies also pass through `dispatchToChannel`?
  - **A**: Yes — it's the single choke point; the widget branch just returns the existing realtime path, so
    callers are uniform.

## References
- [CHAN-002 WhatsApp Inbound](../02-whatsapp-inbound/spec.md)
- [CHAN-004 Dashboard Channel-Awareness](../04-dashboard-channel-awareness/spec.md) (composer state)
- `apps/api/src/routes/conversations.ts` `POST /:id/messages` (~`:706`, select `:740`, agent branch `:797`,
  broadcast `:825`)
- `apps/api/src/services/realtime.ts` (`broadcastNewMessage` — existing transport)
- [Meta WhatsApp — Customer Service Window](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages)
