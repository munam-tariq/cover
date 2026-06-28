# Security Review Findings - 2026-06-28

Living findings tracker for the Phase A/B/C security review. Add new findings here as review
continues. This file is intentionally separate from the full code-review map so each issue can be
triaged, assigned, fixed, and verified independently.

## Finding 1 - Public Supabase Realtime Still Bypasses The New Widget Session Token Model

Status: Open / needs design follow-up

Severity: Medium

Area: Public widget, hosted public page, mobile SDK, Supabase Realtime

### Summary

Phase A removed anon table access from Supabase, and Phase B added `X-FrontFace-Session` tokens for
public per-conversation API reads. However, public Realtime subscriptions still use the Supabase
anon key directly and do not know about the new widget session token. This means the table REST/Data
API exposure is fixed, but conversation broadcast channels remain a separate authorization surface.

The anon key is not a secret in the Supabase model. It is designed to be publishable when RLS and
database privileges are correct. The concern here is narrower: our new app-layer authorization model
protects polling/status/message routes with `X-FrontFace-Session`, while direct Supabase Realtime
subscriptions can still listen to broadcast channels with only the anon key and a channel name.

### Current Behavior

The embeddable widget bootstrap config still returns Realtime credentials:

- `realtime.supabaseUrl`
- `realtime.supabaseAnonKey`

Affected code:

- `apps/api/src/routes/embed.ts`
  - `GET /api/embed/config/:projectId`
  - returns `realtime.supabaseUrl` and `realtime.supabaseAnonKey`
- `apps/widget/src/widget.ts`
  - stores `data.realtime` on `window.__WIDGET_CONFIG__`
- `apps/widget/src/utils/realtime.ts`
  - creates `RealtimeClient(${supabaseUrl}/realtime/v1, { params: { apikey: supabaseAnonKey } })`
  - subscribes to `conversation:${conversationId}`
- `apps/widget/src/components/chat-window.ts`
  - prefers Realtime when `supabaseUrl` and `supabaseAnonKey` exist
  - otherwise falls back to polling

The hosted public page route does not return the anon key:

- `apps/api/src/routes/public-page.ts`
  - explicitly documents `NO anon key`

However, the hosted public page frontend still uses the web app Supabase client for Realtime:

- `apps/web/app/c/[handle]/use-public-handoff.ts`
  - uses `useConversationRealtime`
- `apps/web/hooks/use-inbox-realtime.ts`
  - creates a Supabase client using `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - subscribes to broadcast channels

The mobile SDK docs also still document `realtime.supabaseUrl` and `realtime.supabaseAnonKey` for
Realtime broadcast handoff:

- `mobile-sdk/INTEGRATION_GUIDE.md`
- `mobile-sdk/openapi.yaml`

### Why This Matters

The new protected polling flow requires:

- conversation ID
- `X-FrontFace-Session` token bound to that conversation

The direct Realtime flow requires:

- Supabase URL
- Supabase anon key
- channel name such as `conversation:<conversationId>`

So if a conversation ID leaks, a caller may be able to subscribe to its broadcast channel without
also possessing the `X-FrontFace-Session` token. That undermines part of the IDOR hardening for live
events, even though historical table/message reads are now protected by API session tokens and the
anon Data API table access has been revoked.

This is not the same as the old anon table exposure:

- Fixed: anon REST/GraphQL table access to tenant data.
- Still open for design: direct public Realtime broadcast subscription authorization.

### Current Mitigations

- The widget has a polling fallback that uses the protected API routes.
- Public conversation read routes now require `X-FrontFace-Session` when enforcement is on.
- Supabase anon table privileges were revoked for tenant tables.
- Realtime is broadcast-based in the current code path, not direct table selects.

### Recommended Direction

Short-term safest option:

1. Stop returning `realtime.supabaseAnonKey` and `realtime.supabaseUrl` from
   `GET /api/embed/config/:projectId` for anonymous widget/mobile clients.
2. Let the embeddable widget and mobile SDK use the existing polling fallback.
3. Disable or feature-flag hosted public page Realtime for anonymous visitors so it also uses the
   protected polling path.
4. Update mobile SDK docs/OpenAPI to mark public Supabase Realtime as deprecated or unavailable
   until the authorization model is redesigned.

Longer-term options:

1. Move public visitor Realtime behind a FrontFace-owned SSE/WebSocket endpoint that validates
   `X-FrontFace-Session` before joining a conversation stream.
2. Investigate Supabase Realtime private channels / authorization hooks and whether they can
   validate a per-conversation session token safely.
3. Keep Supabase Realtime only for authenticated dashboard users and agents, where Supabase Auth
   already provides an identity and RLS-backed authorization story.

### Suggested Tests After Fix

- Widget config no longer includes `realtime.supabaseAnonKey` for public embeds.
- Widget handoff still works through polling fallback with `X-FrontFace-Session`.
- Public hosted page handoff still works through polling fallback with `X-FrontFace-Session`.
- Mobile SDK docs no longer instruct public clients to use Supabase anon Realtime unless/until the
  new Realtime authorization design exists.
- Attempting to subscribe to `conversation:<id>` as anon should not be part of the supported public
  visitor flow.

### Review Notes

- Do not confuse "anon key is publishable" with "this Realtime channel is authorized." The key can
  be publishable while a channel authorization model is still too broad for conversation-scoped
  customer data.
- Removing public Realtime may slightly reduce handoff immediacy, but polling already exists and is
  protected by the new session-token model.
- This can be planned as a follow-up rather than blocking the database anon-access fix, as long as
  it is tracked and understood before enabling a stricter public-security posture.
