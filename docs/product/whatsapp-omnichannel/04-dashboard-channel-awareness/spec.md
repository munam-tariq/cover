# Dashboard Channel-Awareness Specification

## Metadata
- **Feature ID**: CHAN-004
- **Feature Name**: Dashboard Channel-Awareness (inbox, analytics, contacts, Channels settings)
- **Category**: Channels
- **Priority**: P0
- **Complexity**: Medium
- **Target Version**: Omnichannel v1 (Week 2)
- **Dependencies**: CHAN-001 (source, `channel_connections`, `customers.phone`), CHAN-003 (window state)
- **Owner**: Frontend (`apps/web`)
- **Status**: Approved — ready to build

## Summary
Make the **existing** dashboard channel-aware, additively: a channel badge + source filter in the inbox, a
`whatsapp` option in analytics, phone surfaced in contacts/leads, and a new **Channels** settings tab to
connect a WhatsApp number (manual form, encrypted server-side). A shared `getChannelMeta(source)` helper
keeps the channel cue consistent everywhere. This is **not** a visual redesign of the dashboard — the
aspirational omnichannel UI in the 10 reference screenshots is a separate track.

## User Story
As an agent/admin, I can tell at a glance which channel each conversation came from, filter to WhatsApp,
see a contact's phone, segment analytics by channel, and connect my WhatsApp number from settings — all
inside the dashboard I already use.

## Functional Requirements

### FR-001: Shared channel helper (net-new)
- `apps/web/lib/channels.ts` → `getChannelMeta(source)` returning `{ label, icon, color }` for every source
  (`widget`, `public`, `whatsapp`, `voice`, ...). Single source of truth; no per-surface label maps (none
  exists today — analytics and leads each roll their own).

### FR-002: Inbox list — badge + filter
- `app/(dashboard)/inbox/page.tsx`: add `source` to the `Conversation` type (the API already returns it —
  `conversations.ts:289`; the type just omits it).
- Render a channel badge/icon in `ConversationListItem` (mirror the existing `Phone`/voice cue at ~`:113`).
- Add a **source filter** (chips or dropdown) alongside the existing status tabs (`mine|active|waiting|all`).

### FR-003: Inbox detail — header badge + composer state
- `app/(dashboard)/inbox/[id]/page.tsx`: channel badge in the conversation header; show the contact phone
  for WhatsApp.
- **Composer reflects backend window state (CHAN-003):** for a WhatsApp conversation whose 24h window is
  closed, disable free-form send and show "24h window closed — re-engagement templates coming soon." The
  server is the source of truth (it rejects `WINDOW_CLOSED`); the UI only reflects it. The template picker
  is a fast-follow.

### FR-004: Analytics — channel dimension
- `app/(dashboard)/analytics/page.tsx`: add `'whatsapp'` to `SourceFilter` and `SOURCE_OPTIONS` (~`:73`).
  The `/api/analytics/*` handlers already filter by `source`, so no backend change beyond CHAN-001's enum.

### FR-005: Contacts / Leads — phone as first-class
- `app/(dashboard)/leads/components/lead-detail-panel.tsx`: show `phone` from `customers.phone`
  (CHAN-001) instead of the current regex-scrape from `formData`.
- "Message on WhatsApp" action is **deferred** (placeholder only).

### FR-006: Channels settings tab (net-new)
- New tab in `app/(dashboard)/projects/[projectId]/page.tsx`, **modeled on**
  `components/public-page-tab.tsx` (the existing non-widget channel-config precedent).
- v1 = a **manual-connect form**: paste `phone_number_id`, WABA id, access token, app secret, verify token
  → encrypted server-side into `channel_connections` (CHAN-001). Plus connection/webhook status and the
  webhook callback URL to register in Meta.
- The self-serve **Embedded Signup** button replaces this form in the fast-follow (same stored row shape).

### FR-007: Security — credentials are write-only *(added 2026-06-28, security baseline)*
- The `POST` endpoint accepts credentials in the request body (over HTTPS) and encrypts immediately via
  `encryption.ts` before storage. The `GET` endpoint returns connection status, display name, and
  external ID — **never** the encrypted blob or any decrypted secret.
- The "Channels" tab UI renders masked placeholder text for secret fields after connection ("••••••••"),
  matching the behavior specified in Q&A: "Show secrets after save? — Never."
- `channel_connections` has no `authenticated` SELECT grant (CHAN-001 FR-007), so even if the dashboard's
  Supabase client attempted a direct `.from('channel_connections').select('credentials')`, it would
  receive zero rows. Defense-in-depth: credential access is API-only, service-role-only.

### FR-008: Security — project ownership on all channel endpoints *(added 2026-06-28)*
- Every channel management endpoint verifies that the requesting user owns the project
  (`projects.user_id = auth.uid()`), matching the post-hardening `project_client_keys` pattern
  (`20260627120415`). A project member who is not the owner cannot create, update, or delete channel
  connections via the API.

## UI Mockup

```
Inbox list (with channel badges + source filter):
+----------------------------------------------------------+
| Conversations            [Status v] [Channel: WhatsApp v]|
+----------------------------------------------------------+
| (W) Ayesha · +1 555 010 0042        2m · agent_active    |
|     "do you ship to the EU?"                             |
| (G) Visitor 8f3a · widget           5m · ai_active       |
|     "what are your hours?"                               |
| (W) Bilal · +44 7700 900123        18m · waiting         |
+----------------------------------------------------------+
   (W)=WhatsApp glyph  (G)=globe/widget glyph  (from getChannelMeta)

Channels settings tab (manual connect):
+----------------------------------------------------------+
|  Channels                                                |
+----------------------------------------------------------+
|  WhatsApp                                  [● Connected] |
|  Display number: +1 555 010 0042                        |
|  Phone Number ID: 109876543210987                       |
|                                                          |
|  Webhook URL (register in Meta):                         |
|  https://api.frontface.app/api/channels/whatsapp/webhook |
|  Verify token: ************              [Regenerate]    |
|                                                          |
|  [ Disconnect ]                          [ Test ]        |
+----------------------------------------------------------+
|  (not connected state → form: Phone Number ID, WABA ID,  |
|   Access token, App secret, Verify token  [Connect])     |
+----------------------------------------------------------+
```

## Technical Approach

### Files
```
apps/web/lib/channels.ts                                          (new — getChannelMeta)
apps/web/app/(dashboard)/inbox/page.tsx                           (badge + source filter + type)
apps/web/app/(dashboard)/inbox/[id]/page.tsx                      (header badge + composer state)
apps/web/app/(dashboard)/analytics/page.tsx                       (SOURCE_OPTIONS + SourceFilter)
apps/web/app/(dashboard)/leads/components/lead-detail-panel.tsx   (phone field)
apps/web/app/(dashboard)/projects/[projectId]/page.tsx            (Channels tab)
apps/web/app/(dashboard)/projects/[projectId]/components/channels-tab.tsx  (new — modeled on public-page-tab.tsx)
```

### API endpoints (consumed by the Channels tab; defined in CHAN-001 service)

All endpoints below are **behind `authMiddleware` + project ownership verification** (the same pattern
used by `POST /api/projects/:id/client-keys` after the security hardening). They use `supabaseAdmin`
(service role) to read/write `channel_connections` — the browser never queries this table directly.

```
GET    /api/projects/:id/channels                 - list project connections (status only, no secrets)
POST   /api/projects/:id/channels/whatsapp        - create/update connection (encrypts credentials)
POST   /api/projects/:id/channels/whatsapp/test   - test connectivity
DELETE /api/projects/:id/channels/whatsapp/:cid   - disconnect
```

### `getChannelMeta`
```typescript
export function getChannelMeta(source: string): { label: string; icon: IconType; color: string } {
  switch (source) {
    case 'whatsapp': return { label: 'WhatsApp', icon: WhatsAppIcon, color: '#25D366' };
    case 'public':   return { label: 'Public page', icon: GlobeIcon, color: 'var(--ink-500)' };
    case 'voice':    return { label: 'Voice', icon: PhoneIcon, color: 'var(--ink-500)' };
    default:         return { label: 'Web widget', icon: ChatIcon, color: 'var(--ink-500)' };
  }
}
```

## Acceptance Criteria

### AC-001: Badge everywhere
- Every conversation in the list and detail header shows the correct channel badge via `getChannelMeta`.

### AC-002: Source filter
- Selecting "WhatsApp" in the inbox filter shows only `source='whatsapp'` conversations; "All" restores.

### AC-003: Composer window state
- A WhatsApp conversation with a closed 24h window disables the composer with the explanatory message; an
  in-window one allows free-form replies. Attempting to send when closed surfaces the server's
  `WINDOW_CLOSED` clearly (never a silent failure).

### AC-004: Analytics channel option
- Analytics shows a `WhatsApp` source option and all four metric calls respect it.

### AC-005: Contact phone
- A WhatsApp lead/contact displays its phone as a first-class field (from `customers.phone`).

### AC-006: Connect a number
- From the Channels tab, submitting valid WhatsApp credentials creates an encrypted `channel_connections`
  row and flips the tab to "Connected" with the webhook URL shown; secrets are never echoed back.

### AC-007: No redesign creep
- Existing inbox/analytics/leads layouts are unchanged except the additive elements above.

### AC-008: Secrets never echoed *(security baseline)*
- `GET /api/projects/:id/channels` response body contains NO credential material (access token, app
  secret, verify token). Only status, display name, external ID, and timestamps are returned.

### AC-009: Non-owner blocked *(security baseline)*
- A signed-in user who is a project *member* (not owner) receives `403` when attempting to create, update,
  or delete a channel connection via the API.

## Out of Scope
- Full dashboard visual redesign (unified inbox channel rail, CRM-style contacts) — separate track.
- "Message on WhatsApp" outbound action from contacts (fast-follow).
- Template picker in the composer (fast-follow).
- Embedded Signup self-serve button (fast-follow; same row shape).
- Per-channel team routing UI.

## Success Metrics
- Operators correctly identify a conversation's channel with no training (badge clarity).
- Pilot WhatsApp number connected end-to-end from the Channels tab in < 5 minutes.

## Questions & Decisions
- **Q**: New top-level "Channels" nav item vs a tab under the agent page?
  - **A**: A tab in `projects/[projectId]` for v1 (matches `public-page-tab.tsx` precedent; least nav
    churn). Promote to top-level nav when multiple channels exist.
- **Q**: Show secrets after save?
  - **A**: Never. Status + verify-token regenerate only; credentials are write-only.

## References
- [CHAN-001 Channel Foundation](../01-channel-foundation/spec.md)
- [CHAN-003 Outbound Dispatcher](../03-outbound-dispatcher/spec.md) (window state the composer reflects)
- `apps/web/app/(dashboard)/projects/[projectId]/components/public-page-tab.tsx` (tab precedent)
- `apps/web/app/(dashboard)/inbox/page.tsx` (~`:30` type, ~`:113` voice cue), `inbox/[id]/page.tsx`
- `apps/web/app/(dashboard)/analytics/page.tsx` (~`:73` `SOURCE_OPTIONS`)
