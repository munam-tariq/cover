# Inbox Role Stats and Voice Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove obsolete voice-only filtering, normalize legacy voice conversations into widget conversations with voice activity, and show exact owner/member-specific inbox statistics.

**Architecture:** The existing `/api/projects/:id/inbox-summary` endpoint becomes the single source of truth for headline counts while preserving its sidebar-count contract. The queue endpoint returns only the five visible rows plus an exact database count. A forward-only SQL migration converts historical `source = 'voice'` rows to `source = 'widget'` and records voice activity through the field already consumed by the inbox.

**Tech Stack:** PostgreSQL/Supabase migrations, Express with supabase-js, Next.js 15 client component, next-intl, Node test runner.

## Global Constraints

- Follow DRY, KISS, and SOLID principles.
- Use exact set-based database counts and never query inside a loop.
- Preserve the existing sidebar `queueCount`, `assignedCount`, and `totalPending` response fields.
- Owners see project-wide counts; members see personal assigned/resolved counts and the shared claimable queue.
- Do not stage, commit, or push; the user reviews the dirty workspace.

---

### Task 1: Normalize Legacy Voice Conversations

**Files:**

- Create: `supabase/migrations/20260716033000_normalize_legacy_voice_conversations.sql`
- Create: `tests/api/legacy-voice-normalization.test.ts`
- Modify: `tests/web/channel-meta.test.ts`
- Modify: `tests/web/inbox-readable-indicators.test.ts`
- Modify: `apps/web/lib/channels.ts`
- Modify: `apps/web/app/[locale]/(dashboard)/inbox/page.tsx`

**Interfaces:**

- Consumes: `conversations.source`, `conversations.voice_ended_reason`, `getChannelOptions()`.
- Produces: no selectable `voice` channel and legacy rows shaped as `{ source: "widget", voice_ended_reason: "legacy_voice_source" }` when no end reason existed.

- [ ] **Step 1: Write failing tests**

  Assert that the migration updates only `source = 'voice'`, maps it to `widget`, fills rather than overwrites `voice_ended_reason`, and preserves historical `updated_at` by disabling/re-enabling the timestamp trigger. Update channel/inbox tests to assert that `getChannelOptions()` excludes `voice` and a voice metadata chip depends only on `hasVoiceActivity`.

- [ ] **Step 2: Run tests and verify RED**

  Run:

  ```bash
  node --experimental-strip-types --test tests/api/legacy-voice-normalization.test.ts tests/web/channel-meta.test.ts tests/web/inbox-readable-indicators.test.ts
  ```

  Expected: failures because the migration does not exist, `voice` remains in filter options, and the row rendering still special-cases `source !== "voice"`.

- [ ] **Step 3: Implement the migration and filter removal**

  Add a migration equivalent to:

  ```sql
  alter table public.conversations disable trigger update_conversations_updated_at;

  update public.conversations
  set source = 'widget',
      voice_ended_reason = coalesce(voice_ended_reason, 'legacy_voice_source')
  where source = 'voice';

  alter table public.conversations enable trigger update_conversations_updated_at;
  ```

  Remove the `voice` item from the centralized `CHANNELS` array and render the voice metadata chip whenever `hasVoiceActivity` is true.

- [ ] **Step 4: Run tests and verify GREEN**

  Re-run the exact Step 2 command and expect all tests to pass.

### Task 2: Make Inbox Summary Role-Aware

**Files:**

- Create: `tests/api/inbox-summary.test.ts`
- Modify: `apps/api/src/routes/handoff.ts`
- Modify: `apps/api/src/routes/conversations.ts`

**Interfaces:**

- Consumes: authenticated `userId`, project ownership, optional ISO `resolvedSince` query parameter.
- Produces: `{ isOwner, openCount, queueCount, assignedCount, resolvedTodayCount, totalPending, timestamp }`.

- [ ] **Step 1: Write failing API contract tests**

  Assert that the summary endpoint validates `resolvedSince`, performs exact head counts for open, queue, assigned-active, and resolved conversations in one `Promise.all`, scopes resolved rows to `assigned_agent_id = userId` for members only, and keeps `totalPending = queueCount + assignedCount`. Assert that the conversations list no longer performs its own resolved-today query.

- [ ] **Step 2: Run tests and verify RED**

  Run:

  ```bash
  node --experimental-strip-types --test tests/api/inbox-summary.test.ts
  ```

  Expected: failures because the summary lacks open/resolved counts and the list route still owns `resolvedToday`.

- [ ] **Step 3: Implement exact summary queries**

  Build four bounded count queries:

  ```ts
  const [queueResult, assignedResult, openResult, resolvedResult] =
    await Promise.all([queueQuery, assignedQuery, openQuery, resolvedQuery]);
  ```

  `openQuery` uses `status IN ('ai_active', 'waiting', 'agent_active')`. `resolvedQuery` uses `status = 'resolved'`, `resolved_at >= resolvedSince`, and adds `assigned_agent_id = userId` only for non-owners. Remove the redundant resolved count from `GET /api/conversations`.

- [ ] **Step 4: Run tests and verify GREEN**

  Re-run the Step 2 command and expect it to pass.

### Task 3: Render Exact Role-Specific Cards and Bound the Queue

**Files:**

- Create: `tests/web/inbox-role-stats.test.ts`
- Modify: `apps/api/src/routes/handoff.ts`
- Modify: `apps/web/app/[locale]/(dashboard)/inbox/page.tsx`
- Modify: `apps/web/messages/en/dashboard.json`
- Modify: `apps/web/messages/ar/dashboard.json`

**Interfaces:**

- Consumes: the Task 2 summary response and the queue response `{ queue, count }`.
- Produces: owner cards `Open conversations / Waiting in queue / Resolved today`; member cards `My active chats / Available to claim / Resolved by me today`.

- [ ] **Step 1: Write failing UI and queue tests**

  Assert that the page fetches list, queue, and summary concurrently; uses `openCount` only for owners and `assignedCount` for members; renders role-aware localized labels/subtitles; uses `queueCount` rather than `queue.length`; and that the queue query requests an exact count and limits rows to five.

- [ ] **Step 2: Run tests and verify RED**

  Run:

  ```bash
  node --experimental-strip-types --test tests/web/inbox-role-stats.test.ts
  ```

  Expected: failures because the page still mixes availability, queue-array length, and list-route stats.

- [ ] **Step 3: Implement the client and queue response**

  Fetch all three reads in the existing `Promise.all`. Send the viewer's local midnight as `resolvedSince`. Store one `InboxSummary`, use its `isOwner` and exact counts, and change the queue query to:

  ```ts
  .select("id, visitor_id, customer_email, customer_name, queue_entered_at, created_at, message_count", { count: "exact" })
  .eq("project_id", projectId)
  .eq("status", "waiting")
  .order("queue_entered_at", { ascending: true })
  .range(0, 4);
  ```

  Return `count: queueResult.count ?? 0`, add complete English/Arabic role copy, and calculate the hidden queue remainder from `queueCount - queue.length`.

- [ ] **Step 4: Run focused and type verification**

  Run:

  ```bash
  node --experimental-strip-types --test tests/api/inbox-summary.test.ts tests/api/legacy-voice-normalization.test.ts tests/web/channel-meta.test.ts tests/web/inbox-readable-indicators.test.ts tests/web/inbox-role-stats.test.ts tests/web/inbox-status-scope.test.ts
  pnpm --filter @chatbot/api type-check
  pnpm --filter @chatbot/web type-check
  ```

  Expected: all tests and both type checks pass.

### Task 4: Apply and Verify the Data Migration on Staging

**Files:**

- Read: `supabase/migrations/20260716033000_normalize_legacy_voice_conversations.sql`

**Interfaces:**

- Consumes: the committed-shaped migration SQL from Task 1.
- Produces: staging with zero `source = 'voice'` rows and all fourteen former rows discoverable as widget conversations with voice activity.

- [ ] **Step 1: Apply through the staging migration API**

  Apply the exact local SQL under migration name `normalize_legacy_voice_conversations`.

- [ ] **Step 2: Verify the postconditions**

  Query counts for `source = 'voice'` and `voice_ended_reason = 'legacy_voice_source'`. Expect `0` and `13` respectively; the fourteenth row already had an end reason and must remain unchanged.

- [ ] **Step 3: Review checkpoint without Git mutation**

  Inspect `git diff --check` and `git status --short`. Do not stage or commit.
