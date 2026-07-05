# Digital-Card Launcher Specification

## Metadata
- **Feature ID**: CHAN-005
- **Feature Name**: Digital-Card Multi-Channel Widget Launcher
- **Category**: Channels / Widget
- **Priority**: P0
- **Complexity**: Low
- **Target Version**: Omnichannel v1 (Week 1 — ships first)
- **Dependencies**: None (frontend-only; `projects.settings` JSONB; no migration)
- **Owner**: Frontend (`apps/widget` + `apps/web`)
- **Status**: Approved — ready to build

## Summary
Turn the chat widget into a MyAlice/Dalo-style "digital card": alongside the existing chat bubble, render a
set of channel buttons (WhatsApp, Instagram, Facebook, email, etc.) that deep-link to the business's real
channels. For deep-link channels (`https://wa.me/<number>`) this is **frontend-only** — no backend, no DB
migration (config lives in the existing `projects.settings` JSONB). It ships an immediate, visible
"omnichannel" win in week 1, independent of the WhatsApp backend, and once CHAN-002 is live the WhatsApp
button opens the very number the AI agent now answers on.

## User Story
As a business owner, I want my website widget to show all the ways customers can reach me — chat plus
WhatsApp, Instagram, etc. — so visitors pick their preferred channel, and as a visitor I can tap WhatsApp
and continue in the app I already use.

## Functional Requirements

### FR-001: Channel config on widget appearance
- Extend `WidgetDisplayConfig` / `ResolvedWidgetAppearance` (`apps/widget/src/utils/widget-appearance.ts`)
  with `channels?: Array<ChannelButton>` where
  `ChannelButton = { type: 'whatsapp'|'instagram'|'facebook'|'email'|'phone'|'custom'; url: string; label?: string; iconUrl?: string }`.
- Parsed in `parseDisplayConfig`; defaults to empty (no launcher = today's behavior, zero regression).

### FR-002: Launcher rendering
- New `apps/widget/src/components/channel-launcher.ts` renders a stacked/fan set of channel buttons next to
  the chat bubble, inside the existing **closed Shadow DOM** (style isolation preserved).
- Mounted in `apps/widget/src/widget.ts` `init()` alongside `this.bubble` (sibling of `Bubble`,
  `TeaserMessage`, etc.).
- Each button: icon (built-in per `type`, or `iconUrl`), optional label, brand color; opens `url` in a new
  tab (`target="_blank" rel="noopener"`). WhatsApp → `https://wa.me/<number>?text=<prefill>`.
- Respects existing appearance (position `bottom-right|bottom-left`, theme, `hideBranding`).

### FR-003: Server passthrough
- `buildWidgetAppearanceConfig()` (`apps/api/src/routes/embed.ts`) reads `settings.widget_appearance.channels`
  and includes it in the embed config payload served by `GET /api/embed/config/:projectId`. No new endpoint.

### FR-004: Dashboard editor
- In `apps/web/app/(dashboard)/embed/page.tsx` (the widget Style/Content editor), add a "Channels" section:
  add/remove/reorder channel buttons (type, URL/number, optional label/icon). Persist to `projects.settings`
  JSONB via the existing settings PUT (no migration).

### FR-005: Accessibility & UX
- Buttons are keyboard-focusable with aria-labels (channel name); tap targets ≥ 44px; the group is
  collapsible so it doesn't obscure content on mobile.

### FR-006: Security — URL scheme validation *(added 2026-06-28, security baseline)*
- Every channel button `url` must be validated before rendering. Allow only `https:`, `http:`, `mailto:`,
  `tel:` schemes. **Reject `javascript:` and `data:` URIs** — this is the same class of vulnerability as
  the `parseMarkdown` `javascript:` href finding documented in
  `docs/security/stored-content-injection-xss-audit.md` (#4, High severity).
- Validation happens **both** on the dashboard editor save path (server-side, in the settings PUT
  handler) **and** in the widget at render time (client-side, in `channel-launcher.ts`). Server-side
  validation prevents storage; client-side validation is defense-in-depth against pre-existing or
  directly-injected values.
- The `iconUrl` field (for `type: 'custom'`) follows the same validation: `https:` or `http:` only. The
  URL is set as an `<img src>` inside the closed Shadow DOM — an `onerror` handler on a custom icon
  could execute script if the URL were attacker-controlled with a non-http scheme or a data URI
  embedding JS via SVG.

### FR-007: Security — no new public endpoints *(added 2026-06-28)*
- The launcher reads its config from the **existing** `GET /api/embed/config/:projectId` endpoint. No
  new public endpoint is introduced. The embed endpoint is already documented as public-by-design
  (`docs/security/stored-content-injection-xss-audit.md`, Vector 4b) and uses service-role with
  field-limited returns.

## UI Mockup

```
Widget (bottom-right), launcher expanded:
                                   +---------------------+
                                   |  (IG) Instagram     |
                                   |  (WA) WhatsApp      |
                                   |  (✉)  Email us      |
                                   +---------------------+
                                        ( 💬 )  <- chat bubble (existing)

Embed editor — Channels section:
+----------------------------------------------------------+
|  Channels on the widget                       [+ Add]    |
+----------------------------------------------------------+
|  ⠿ WhatsApp   wa.me/15550100042        [edit] [remove]   |
|  ⠿ Instagram  instagram.com/acme       [edit] [remove]   |
|  ⠿ Email      mailto:hi@acme.com        [edit] [remove]   |
+----------------------------------------------------------+
```

## Technical Approach

### Files
```
apps/widget/src/utils/widget-appearance.ts     (add `channels` to config types + parse)
apps/widget/src/components/channel-launcher.ts  (new component)
apps/widget/src/widget.ts                       (mount in init() alongside this.bubble)
apps/widget/src/styles/widget.css               (launcher styles)
apps/api/src/routes/embed.ts                    (buildWidgetAppearanceConfig → include channels)
apps/web/app/(dashboard)/embed/page.tsx         (Channels editor section)
```

### Config shape (stored in `projects.settings.widget_appearance.channels`)
```jsonc
{
  "widget_appearance": {
    "channels": [
      { "type": "whatsapp",  "url": "https://wa.me/15550100042?text=Hi%20Acme" },
      { "type": "instagram", "url": "https://instagram.com/acme", "label": "DM us" },
      { "type": "email",     "url": "mailto:hi@acme.com" }
    ]
  }
}
```

### Build / deploy (unchanged pipeline)
- `apps/widget/build.ts` (esbuild IIFE) → `dist/widget-app.js`; CSS inlined via `__WIDGET_CSS__`.
- Uploaded to Supabase Storage (`apps/widget/upload-to-supabase.ts`); embed via the existing loader.
- ⚠️ Heed the known deploy gotcha: the upload script has historically defaulted to the wrong Supabase
  project — confirm the target before publishing widget assets.

## Acceptance Criteria

### AC-001: Config parsed
- An appearance payload with `channels` parses into `ResolvedWidgetAppearance.channels`; absent/empty →
  no launcher rendered (no regression).

### AC-002: Launcher renders + deep-links
- With one or more channels configured, the launcher renders next to the bubble and each button opens its
  `url` in a new tab; WhatsApp opens `wa.me/<number>` with the prefill text.

### AC-003: Style isolation
- Launcher markup/CSS lives in the closed Shadow DOM; no host-page style bleed; respects position/theme.

### AC-004: Editor round-trip
- Adding/removing/reordering channels in the embed editor persists to `projects.settings` and reflects on
  the live widget after reload.

### AC-005: A11y
- Buttons are keyboard-reachable with channel aria-labels; tap targets ≥ 44px.

### AC-006a: `javascript:` URLs rejected *(security baseline)*
- A channel config with `url: "javascript:alert(1)"` is rejected by the dashboard editor (server-side
  validation error) and, if somehow stored, is NOT rendered as a clickable link by the widget.

### AC-006b: `data:` URLs rejected *(security baseline)*
- Same as AC-006a for `data:` scheme URLs.

### AC-006c: Custom icon URL validated *(security baseline)*
- An `iconUrl` with a non-http(s) scheme is rejected on save and not rendered.

### AC-007: Loop with CHAN-002
- After the WhatsApp backend is live, tapping the WhatsApp launcher opens the same number whose inbound
  messages the AI agent answers (manual verification).

## Out of Scope
- In-widget WhatsApp thread (the deep-link hands off to the WhatsApp app; conversation continues there and
  is handled by CHAN-002 inbound).
- OAuth/connected social accounts (these are simple deep links).
- Per-channel analytics on launcher clicks (nice-to-have, later).

## Success Metrics
- % of widgets configuring ≥ 1 channel button.
- Launcher click-through (if/when click analytics added).
- Time to configure a channel in the editor < 1 min.

## Questions & Decisions
- **Q**: Backend needed for the launcher?
  - **A**: No — deep links only; config in existing JSONB. The WhatsApp *backend* (CHAN-002) is what makes
    the agent answer, but the card itself is frontend-only.
- **Q**: Built-in icons vs custom only?
  - **A**: Built-in per `type` (WhatsApp/IG/FB/email/phone) with `iconUrl` override for `custom`.

## References
- [CHAN-002 WhatsApp Inbound](../02-whatsapp-inbound/spec.md) (closes the loop)
- [Widget Customization spec](../../features/enhanced/widget-customization/spec.md)
- `apps/widget/src/components/bubble.ts` (existing launcher button; already supports custom icon)
- `apps/widget/src/widget.ts` `init()` (mount point), `apps/api/src/routes/embed.ts`
  (`buildWidgetAppearanceConfig`)
