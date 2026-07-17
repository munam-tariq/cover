# Inbox Sorting, Filtering, and Activity Design

**Date:** 2026-07-16  
**Status:** Implemented and verified against FrontFace staging; remote app deployment pending

## Objective

Make the inbox serve both operational triage and chronological conversation browsing without
letting automated system messages distort previews, timestamps, or ordering.

The finished inbox must:

- Default to an action-oriented **Needs attention** sort.
- Offer an explicit **Recent activity** browsing sort.
- Explain both modes in the UI.
- Display dates and times whose meaning matches the active sort.
- Keep filters compact, role-aware, server-side, and URL-addressable.
- Preserve inline list loading: list controls must not reload the page shell, stats, or queue.
- Keep the existing queue card as the primary place to claim waiting conversations.

## Current Behavior and Evidence

The conversation list currently orders by `conversations.last_message_at desc`. The message insert
trigger updates that field for customer, AI, agent, and system messages. The row displays the same
timestamp as a clock time only, falling back to `updated_at` and then `created_at`.

This does not mean “last customer message.” It means “last inserted message of any kind.” Staging
data inspected during design contained 221 conversations, 192 of which had a system message as the
latest message. Closure notices and inactivity warnings can therefore replace the useful preview,
move a conversation, and present their timestamp as if a person had interacted.

Relevant staging distributions also support a voice filter: 45 of 221 conversations had recorded
voice use. CSAT and flagged-customer filters had no populated examples, so they must not dominate
the default toolbar.

## Non-Goals

- Per-member unread state. The current schema has no trustworthy per-member read cursor.
- Saved views or user-defined filter presets.
- Arbitrary user-selected database columns or dynamic SQL.
- Message-count, CSAT, or contact-details filters in the initial release.
- Removing the existing queue card or merging queue claim actions into ordinary conversation rows.
- Allowing system events to influence conversational previews or meaningful-activity order.

## Information Architecture

### Primary toolbar

The compact toolbar contains:

1. `My Chats` / `All` scope tabs. `All` remains owner-only.
2. Status filter.
3. Channel filter.
4. Descriptive sort menu.
5. `Filters` button with the number of active secondary filters.

The normal list does not include waiting conversations. Waiting conversations remain in the queue
card, preventing the same chat from appearing in two places. Selecting the explicit `Waiting`
status filter changes the list into the full paginated queue view.

Because queue membership is project-wide rather than personal, assignment scope is not applicable
while `Waiting` is selected. The UI hides/disables the `My Chats` / `All` choice for that view and
the API returns the authorized project queue for both owners and active members.

The default no-status selection is labelled **Active chats**, not “All open,” because waiting chats
are intentionally represented by the separate queue card. It includes `ai_active` and
`agent_active` only.

### Sort control

Use a descriptive menu rather than a native `<select>` or a two-button segmented control. The
trigger reads `Sort: Needs attention` or `Sort: Recent activity`.

Each menu item includes a title and visible description:

- **Needs attention** — “Prioritizes customer replies awaiting an agent, followed by other active
  conversations. In the Waiting view, longest-waiting chats appear first.”
- **Recent activity** — “Shows the latest customer, AI, agent, or voice activity first. Automated
  system events do not affect ordering.”

An adjacent information icon exposes the active description in a tooltip on hover and keyboard
focus. The menu descriptions remain the primary explanation so touch users do not depend on a
tooltip.

Sort definitions live in one frontend configuration containing the API value, localization keys,
description key, and timestamp presentation mode.

## Sort Semantics

### Needs attention

`attention` is the default sort and applies to active or waiting conversations.

For the normal active list, ordering is:

1. `agent_active` and `needs_reply = true`, ordered by `last_customer_message_at asc` so the oldest
   unanswered customer comes first.
2. Other `agent_active` conversations, ordered by `meaningful_activity_at desc`.
3. `ai_active` conversations, ordered by `meaningful_activity_at desc`.
4. Conversation UUID as the final stable tie-breaker.

For the explicit Waiting view, ordering is `queue_entered_at asc`, then UUID. The existing queue
card uses the same oldest-first rule.

For `resolved` or `closed` status views, Needs attention is inapplicable. Selecting either terminal
status changes the sort to Recent activity and disables Needs attention with an explanation that it
is available for active conversations only.

### Recent activity

`recent` orders by `meaningful_activity_at desc`, then UUID. Meaningful activity is the greatest of:

- The latest customer, AI, or agent message that is not tagged with automated `metadata.event`.
- The latest real voice utterance.
- Conversation creation time.

Status changes, inactivity warnings, closure notices, and other system inserts do not change this
field.

## Conversation Row Presentation

The preview is the latest customer, AI, or agent message that is not tagged with automated
`metadata.event`. Lifecycle messages remain available inside the thread but cannot replace the
inbox preview, including inactivity warnings that intentionally render as AI bubbles.

Rows retain:

- Customer display identity.
- Channel chip.
- `Voice used` chip when voice activity is present.
- Meaningful message preview with localized sender context.
- Existing readable status badge.
- Optional flagged-customer treatment only when the customer is flagged.

### Timestamp presentation

Under Needs attention:

- Waiting: `Waiting 18 min`, derived from `queue_entered_at`.
- Needs reply: `Customer replied 42 min ago`, derived from `last_customer_message_at`.
- Other active rows: formatted meaningful-activity date/time.

Under Recent activity:

- Today: time only, such as `10:37 AM`.
- Yesterday: `Yesterday, 6:12 PM`.
- Earlier in the current year: `Jul 12, 2:05 PM`.
- A previous year: `Jul 12, 2025, 2:05 PM`.

Hovering or focusing the timestamp shows the complete localized date, time, and local timezone.
Formatting uses the current locale and existing RTL direction support.

## Secondary Filters

The `Filters` button opens a responsive inline panel. Applied filters appear as individually
removable chips below the toolbar; when multiple filters are active, `Clear all` is available.

The initial secondary filters are:

- **Needs reply**
  - Member label: `Needs my reply`.
  - Owner label: `Needs an agent reply`.
  - Applies `status = agent_active` and `needs_reply = true`.
  - Selecting it visibly changes the status filter to Agent active. Selecting an incompatible
    status clears Needs reply.
- **Voice used**
  - True when `last_voice_activity_at is not null` or `voice_ended_reason is not null`.
  - This is independent of conversation source and covers normalized historical voice rows.
- **Assigned agent**
  - Owner-only and shown only in All scope.
  - Values: anyone, unassigned, me, or a specific active member.
- **Handoff reason**
  - Customer request, low confidence, keyword, button, or offline form.
- **Activity period**
  - Any time, last 24 hours, last 7 days, or last 30 days.
  - Filters `meaningful_activity_at`; it never filters by a system event timestamp.
- **Flagged customers only**
  - Uses the existing customer relationship in the set-based list query.

The channel filter continues to use centralized channel metadata. Historical `voice` is not a
channel option; voice is represented by the Voice used filter and metadata chip.

## URL State

Control state is reflected in URL query parameters so refresh and browser back/forward restore the
same view. Default values are omitted.

Canonical parameters are:

- `scope=mine|all`
- `status=active|ai_active|agent_active|waiting|resolved|closed|auto_closed`
- `channel=<supported channel>`
- `sort=attention|recent`
- `needsReply=true`
- `voiceUsed=true`
- `assignedAgent=<uuid>|unassigned|me`
- `handoffReason=<supported reason>`
- `activityPeriod=24h|7d|30d`
- `flagged=true`
- `page=<positive integer>`

Changing a filter or sort resets `page` to one. Invalid or role-inaccessible URL values are
normalized to safe defaults and replaced in the URL. The API independently validates every value;
the browser is never treated as the authority.

## Database Model

A migration adds:

- `needs_reply boolean not null default false`
- `last_conversation_message_at timestamptz`
- `last_conversation_preview text`
- `last_conversation_sender_type text`
- `meaningful_activity_at timestamptz` as an indexed stored generated value derived from
  `last_conversation_message_at`, `last_voice_activity_at`, and `created_at`

`last_conversation_sender_type` accepts `customer`, `ai`, or `agent` when populated.

The existing `update_conversation_message_count()` trigger remains the single canonical message
writer:

- Customer message without `metadata.event`: update conversational time/preview/sender and set
  `needs_reply = true`.
- AI or agent message without `metadata.event`: update conversational time/preview/sender and set
  `needs_reply = false`.
- A `sender_type = system` message or any message tagged with `metadata.event`: increment the audit
  message count but preserve every inbox-conversation field.

This boolean transition is deliberate. Comparing timestamps is unsafe because messages in one
transaction can share transaction-start timestamps; the trigger's conversation-row lock gives an
exact committed ordering.

The migration backfills every conversation set-wise from its latest conversational message using
deterministic `(created_at desc, id desc)` ordering. It excludes `sender_type = system` and
automated `metadata.event` rows, sets `needs_reply` from the latest eligible sender, preserves
historical timestamps, and does not query inside a loop.

Required indexes include:

- Project plus `meaningful_activity_at desc nulls last` with an ID tie-breaker.
- A partial project/`last_customer_message_at` index for `agent_active and needs_reply`.
- The existing partial waiting-queue index, amended with an ID tie-breaker if query plans require it.

## Ordered Page RPC

Mixed priority groups require different secondary sort directions, which PostgREST `.order()`
cannot express safely. A database RPC owns filtering, ordering, and pagination.

The function:

- Is exposed only so the server-side Supabase client can call it.
- Uses `security invoker`, a pinned `search_path`, and no dynamic SQL.
- Revokes execute from `public`, `anon`, and `authenticated`; only `service_role` receives execute.
- Accepts validated project, scope, sort, status, and secondary-filter arguments.
- Returns one structured result containing `total` and an `items` array. Each bounded item contains
  the conversation ID, priority reason, and priority timestamp. Returning the total separately from
  the items preserves an exact non-zero total even when a stale page number is beyond the last page.
- Uses UUID as the deterministic final ordering key.

The Express API continues to authorize the user as project owner or active member before invoking
the RPC. The service-role key remains server-only.

After the RPC returns IDs, the API performs:

1. One bounded conversation/customer query for those IDs.
2. One batched project-member name lookup for assigned agents.

The API restores the RPC's ID order with a map. It never fetches data inside a conversation loop.
Response formatting remains in TypeScript rather than being duplicated in SQL.

## API Contract

The list endpoint extends its validated query schema with the canonical filters and sort. It returns
the existing conversation and pagination shapes plus:

- `needsReply`
- `meaningfulActivityAt`
- `priorityReason`: `waiting`, `customer_reply`, or `activity`
- `priorityAt`
- Correct non-system `lastMessage`
- Voice activity derived from voice activity or end evidence

The endpoint rejects malformed UUIDs, unsupported enums, invalid role combinations, and invalid
page values with a structured 400 response. Authorization failures retain the existing 403/404
semantics.

## Client Data Flow

Fetching is separated by responsibility:

- `fetchConversationPage` owns only the filtered, sorted, paginated list.
- `fetchInboxOverview` owns queue, role-aware summary, and availability.
- Initial page load runs both concurrently.
- Filter, sort, scope, or page changes run only `fetchConversationPage`.
- Manual Refresh runs both functions concurrently.
- Realtime and fallback polling refresh quietly without activating a skeleton.

List requests retain the existing monotonically increasing request ID so a slow stale response
cannot overwrite a newer view. Overview requests have an independent request ID because their
lifecycle no longer depends on list controls.

The first project load may use the page shell skeleton. Subsequent list changes keep the toolbar,
stats, and queue visible and replace only the results area with the conversation-list skeleton.

Realtime events that can change membership, priority, preview, or activity cause a quiet server
list refresh. Client-side patching must not guess a new sorted position.

## Error and Empty States

- A failed initial list request shows the localized list error and Retry action in the results area.
- A failed selected view never shows stale rows under the new control labels; the results area shows
  the error while the rest of the inbox remains intact.
- Background failures preserve the last successful view and log/report the failure without a
  disruptive error replacement.
- If realtime changes reduce the total below the current page, the client requests the last valid
  page once rather than displaying a false empty state.
- Empty states summarize active filters, expose removable chips, and provide Clear filters.
- The Waiting empty state refers to the queue rather than generic conversations.

## Accessibility and Localization

- Sort menu, inline filters, chips, tooltip, and Retry actions are keyboard accessible.
- The tooltip trigger has an accessible name and works on keyboard focus.
- Sort descriptions are visible inside the menu and do not depend on hover.
- List loading and errors use appropriate live-region/status semantics without repeatedly announcing
  quiet background polls.
- Dates use the active locale and local timezone.
- English and Arabic receive complete parity for sort descriptions, priority timestamps, filters,
  chips, errors, and empty states.
- Layout uses logical direction utilities and is verified in LTR and RTL at desktop and mobile
  widths.

## Verification and Acceptance Criteria

### Database

- Customer insert sets Needs reply and the conversational preview.
- AI/agent insert clears Needs reply and replaces the conversational preview.
- System or automated `metadata.event` insert changes audit count only; it cannot change preview,
  meaningful activity, or Needs reply, even when the event is styled with `sender_type = ai`.
- Backfill chooses the deterministic latest non-system message and preserves historical timestamps.
- Generated meaningful activity incorporates live voice activity and conversation creation fallback.
- RPC role/sort/filter combinations return deterministic, non-overlapping pages with exact totals.
- `EXPLAIN (ANALYZE, BUFFERS)` on representative staging queries confirms bounded/indexed plans and
  no per-row lookups.

### API and web tests

- Query validation covers every enum, UUID, range, and incompatible combination.
- Owner/member scope and assigned-agent restrictions remain enforced.
- Active default excludes waiting while the Waiting filter returns the project queue.
- Needs attention and Recent activity match the specified ordering.
- System-last histories render the last conversational preview instead.
- Voice used includes both live activity and recorded end evidence.
- URL state restores on refresh and browser navigation.
- Filter/sort changes activate only the list skeleton.
- Stale requests, page clamping, initial errors, selected-view errors, and background errors behave as
  specified.
- English/Arabic key parity and timestamp-formatting boundaries are tested.

### Browser smoke tests

- Owner: Mine, All, assigned-agent filtering, active and terminal views.
- Member: personal reply filter and authorized Waiting view.
- Queue card remains separate and no waiting row is duplicated in the default active list.
- Sort explanations work with mouse, keyboard, and touch-accessible menu descriptions.
- Desktop/mobile and English/Arabic layouts remain usable.
- Network inspection confirms list-only requests for filter, sort, and pagination changes.

## Rollout

1. Add tests and the migration locally.
2. Apply the migration to staging with its history file retained in the repository.
3. Verify backfill counts, trigger behavior, RPC grants, and query plans on staging.
4. Deploy API and web changes to staging.
5. Complete owner/member, mobile, and RTL browser smoke tests.
6. Leave production migration and deployment until staging verification passes.

No automatic commit, staging, push, or production change is part of this workflow.
