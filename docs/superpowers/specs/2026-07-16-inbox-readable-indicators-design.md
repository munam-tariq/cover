# Inbox Readable Indicators Design

## Problem

Conversation rows currently place two bare glyphs beside the customer name:

- a channel icon for non-widget conversations; and
- a colored dot derived from the conversation status.

Neither glyph has visible text or an accessible name. A user must already know that a Play icon
means Playground and that a blue dot means the AI is handling the chat. The dot also duplicates the
descriptive status badge already rendered on the same row.

The status filter has a related semantics problem. **Closed** returns every row whose database
status is `closed`, while **Closed – inactive** returns the subset whose
`metadata.close_reason` is `inactivity`. Because the broad label does not say "all," users can
reasonably assume the two options are mutually exclusive.

## Desired behavior

- A conversation's channel or voice activity must be understandable without memorizing icons,
  colors, or opening the conversation.
- The existing descriptive status badge remains the single visible status indicator.
- The broad closed filter is visibly inclusive; inactivity-closed conversations intentionally
  continue to appear in it and in the narrower inactivity filter.
- The row remains compact and works in both English and Arabic.
- Channel presentation and configuration remain shared rather than being reimplemented in each
  inbox view.

## Considered approaches

### 1. Add tooltips to the existing glyphs

This is the smallest code change, but it does not solve immediate comprehension. Tooltips require
hover or focus, are weak on touch devices, and still leave the status dot duplicating the status
badge. Rejected.

### 2. Use compact inline chips with visible labels

Render the channel icon together with its localized name in a quiet, neutral chip. Render a second
"Voice used" chip only when a conversation has voice activity and its source is not already Voice.
Remove the status dot. This keeps the row scannable while making every surviving indicator
self-explanatory. Selected.

### 3. Add a full metadata line below every customer name

A dedicated line provides ample room, but increases every row's height and visually competes with
the last-message preview. It is unnecessary for one or two short labels. Rejected.

## Row design

The customer-name line will contain compact, neutral metadata chips after the name:

- one source chip whenever a source is present, including Widget;
- the chip contains the existing channel icon plus a localized visible label such as
  **Playground**, **Public Page**, or **WhatsApp**;
- a **Voice used** chip appears when `hasVoiceActivity` is true and the source is not `voice`; and
- a Voice-source conversation shows only its **Voice** source chip, avoiding duplicate meaning.

The chips may wrap with the name on narrow rows instead of forcing the customer name or right-hand
status badge out of the layout. Their neutral styling communicates metadata rather than another
status. Visible text provides the accessible name, so comprehension does not depend on color or a
tooltip.

The colored status dot will be removed. The existing localized badge on the right remains unchanged:
**AI handling**, **Waiting for agent**, **With agent**, **Resolved by agent**, **Closed**, or
**Closed – inactive**. Since the dot has no remaining consumer, `dotColor` will also be removed
from the shared status metadata instead of leaving dead configuration. The status metadata's
already-unused `icon` field will be removed at the same time rather than preserving a second dead
presentation setting.

## Closed-filter semantics

The broad option will be renamed from **Closed** to **All closed**. This new copy belongs to the
filter namespace, not the status namespace, so an individual conversation badge continues to say
**Closed**.

No API or database behavior changes:

- **All closed** sends `status=closed`;
- **Closed – inactive** sends `status=closed&closeReason=inactivity`; and
- an inactivity-closed conversation therefore appears in both by design.

Keeping the inclusive query preserves access to visitor-ended public chats, offline-form records,
explicit closes, and inactivity closes without adding a more complex negative JSON predicate.

## Shared channel configuration

The existing channel registry will remain the source of channel labels, icons, and colors, but its
English `label` values will become stable inbox translation keys. A shared channel-options helper
will expose the configured sources in deterministic display order. The inbox source dropdown and
row chips will consume that helper rather than maintaining separate source lists. Missing inbox
translations will be added for Playground, API, MCP, the Chat fallback, and **Voice used**, so every
source the API accepts can be presented and filtered consistently in both locales.

The duplicated inbox-list and inbox-detail channel-icon implementations will be replaced by one
shared presentational component. The detail view will use the same localized channel label as the
list. Unknown legacy source values will continue to use the existing Chat fallback.

## Verification

Write focused regression tests before production changes. They will verify that:

- the broad closed filter uses its own **All closed** translation key while row status metadata
  still uses **Closed**;
- English and Arabic contain all new copy;
- the list no longer renders `status.dotColor` or a bare status dot;
- source and voice labels are visible in the row, with no duplicate Voice label for Voice-source
  conversations;
- the source dropdown is driven by the shared channel registry; and
- the list and detail views use the shared channel-icon component.

Then run the focused inbox tests, web type checking, changed-file linting, and a browser smoke test
at desktop and narrow viewport widths. The browser check must confirm that chip text is readable,
wrapping does not displace the status badge, Arabic direction remains correct, and selecting
**All closed** still includes inactivity-closed rows.

## Out of scope

- Changing close reasons, terminal-state transitions, or database schema.
- Making the two closed filters mutually exclusive.
- Adding a separate filter for offline-form or visitor-ended closures.
- Redesigning the conversation status badge or the rest of the inbox row.
