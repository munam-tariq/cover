# Inbox Sorting, Filtering, and Activity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the inbox into both an action-oriented work queue and a chronological conversation browser with truthful previews, dates, sorting explanations, and role-aware filters.

**Architecture:** PostgreSQL stores canonical non-system conversation activity and owns mixed-direction priority ordering through a service-role-only RPC. Express retains authorization and response formatting, while focused web utilities own URL normalization, sort metadata, and localized timestamp semantics. The inbox fetch path is split so list controls refresh only the paginated results area.

**Tech Stack:** PostgreSQL 15/Supabase migrations and RPCs, Express with supabase-js and Zod, Next.js 15 client components, next-intl, Radix-based `@chatbot/ui`, Node test runner, Chrome DevTools MCP.

**Execution note (2026-07-16):** The implementation follows this plan with three forward corrections
found during staging verification: `20260716080000_inbox_activity_index_order.sql` aligns the
activity index with `DESC NULLS LAST`, and
`20260716090000_inbox_exclude_automated_events.sql` excludes AI-styled lifecycle messages carrying
`metadata.event` (notably inactivity warnings) and repairs existing rows set-wise. The database and
`20260716091000_inbox_meaningful_activity_not_null.sql` records the generated column's guaranteed
non-null contract so generated database types match the application type. The database and an
authenticated local API/web stack connected to FrontFace staging have been smoke-tested. A remote
API/web deployment remains pending because this workspace exposes the staging database and browser
connectors, but no FrontFace application deployment connector.

## Global Constraints

- Follow DRY, KISS, and SOLID principles.
- Never query inside a conversation loop; use set-based SQL and bounded batch queries.
- System messages remain in the transcript and audit count but never control inbox preview, meaningful activity, or Needs reply.
- Keep the separate five-row queue card; the normal Active chats list excludes waiting conversations.
- Selecting Waiting shows the full authorized project queue and ignores assignment scope.
- All sorting and filtering happens server-side before pagination with a UUID tie-breaker.
- Default sort is Needs attention; terminal views normalize to Recent activity.
- Filter, sort, scope, and page changes load only the conversation results area.
- English and Arabic have complete copy parity and logical RTL layout.
- Do not stage, commit, push, or change production. Leave every checkpoint uncommitted for user review.
- Apply schema changes only to FrontFace staging after local migration tests pass, preserving local migration files for production later.

---

### Task 1: Canonical Conversational Activity State

**Files:**

- Create: `supabase/migrations/20260716074341_inbox_conversation_activity.sql`
- Create: `tests/api/inbox-conversation-activity-migration.test.ts`
- Modify: `packages/db/src/types.ts`

**Interfaces:**

- Consumes: `messages.sender_type`, `messages.content`, `messages.created_at`, `conversations.last_voice_activity_at`, and the existing `public.update_conversation_message_count()` trigger.
- Produces: `conversations.needs_reply`, `last_conversation_message_at`, `last_conversation_preview`, `last_conversation_sender_type`, and generated `meaningful_activity_at`.

- [x] **Step 1: Write the failing migration contract test**

  Add assertions that the new migration:

  ```ts
  assert.match(
    sql,
    /add column if not exists needs_reply boolean not null default false/
  );
  assert.match(
    sql,
    /add column if not exists last_conversation_message_at timestamptz/
  );
  assert.match(sql, /add column if not exists last_conversation_preview text/);
  assert.match(
    sql,
    /add column if not exists last_conversation_sender_type text/
  );
  assert.match(sql, /generated always as[\s\S]*greatest[\s\S]*stored/);
  assert.match(sql, /when new\.sender_type = 'customer' then true/);
  assert.match(sql, /when new\.sender_type in \('ai', 'agent'\) then false/);
  assert.match(sql, /else needs_reply/);
  assert.match(sql, /where sender_type in \('customer', 'ai', 'agent'\)/);
  assert.match(sql, /order by conversation_id, created_at desc, id desc/);
  assert.doesNotMatch(sql, /for\s+\w+\s+in\s+select/i);
  ```

  Also assert that the migration restates `set search_path to 'public', 'pg_temp'`, disables the `updated_at` trigger around the backfill, and adds the two activity indexes.

- [x] **Step 2: Run the test and verify RED**

  Run:

  ```bash
  node --experimental-strip-types --test tests/api/inbox-conversation-activity-migration.test.ts
  ```

  Expected: FAIL because `20260716074341_inbox_conversation_activity.sql` does not exist.

- [x] **Step 3: Add the forward-only migration**

  Create the migration with this state transition:

  ```sql
  alter table public.conversations
    add column if not exists needs_reply boolean not null default false,
    add column if not exists last_conversation_message_at timestamptz,
    add column if not exists last_conversation_preview text,
    add column if not exists last_conversation_sender_type text;

  alter table public.conversations
    drop constraint if exists conversations_last_conversation_sender_type_check;

  alter table public.conversations
    add constraint conversations_last_conversation_sender_type_check
    check (
      last_conversation_sender_type is null
      or last_conversation_sender_type in ('customer', 'ai', 'agent')
    );

  alter table public.conversations
    add column if not exists meaningful_activity_at timestamptz
    generated always as (
      greatest(last_conversation_message_at, last_voice_activity_at, created_at)
    ) stored;

  create or replace function public.update_conversation_message_count()
  returns trigger
  language plpgsql
  set search_path to 'public', 'pg_temp'
  as $function$
  begin
    update public.conversations
    set message_count = message_count + 1,
        last_message_at = new.created_at,
        last_message_preview = left(new.content, 200),
        last_message_sender_type = new.sender_type,
        last_customer_message_at = case
          when new.sender_type = 'customer' then new.created_at
          else last_customer_message_at
        end,
        customer_replied_since_warning = case
          when new.sender_type = 'customer'
            and auto_close_warning_sent_at is not null then true
          else customer_replied_since_warning
        end,
        last_conversation_message_at = case
          when new.sender_type in ('customer', 'ai', 'agent') then new.created_at
          else last_conversation_message_at
        end,
        last_conversation_preview = case
          when new.sender_type in ('customer', 'ai', 'agent') then left(new.content, 200)
          else last_conversation_preview
        end,
        last_conversation_sender_type = case
          when new.sender_type in ('customer', 'ai', 'agent') then new.sender_type
          else last_conversation_sender_type
        end,
        needs_reply = case
          when new.sender_type = 'customer' then true
          when new.sender_type in ('ai', 'agent') then false
          else needs_reply
        end
    where id = new.conversation_id;
    return new;
  end;
  $function$;

  alter table public.conversations
    disable trigger update_conversations_updated_at;

  with latest_conversation_message as (
    select distinct on (conversation_id)
      conversation_id,
      created_at,
      content,
      sender_type
    from public.messages
    where sender_type in ('customer', 'ai', 'agent')
    order by conversation_id, created_at desc, id desc
  )
  update public.conversations conversation
  set last_conversation_message_at = latest.created_at,
      last_conversation_preview = left(latest.content, 200),
      last_conversation_sender_type = latest.sender_type,
      needs_reply = latest.sender_type = 'customer'
  from latest_conversation_message latest
  where conversation.id = latest.conversation_id;

  alter table public.conversations
    enable trigger update_conversations_updated_at;

  create index if not exists idx_conversations_project_meaningful_activity
    on public.conversations (project_id, meaningful_activity_at desc, id);

  create index if not exists idx_conversations_agent_needs_reply
    on public.conversations (project_id, last_customer_message_at, id)
    where status = 'agent_active' and needs_reply;

  drop index if exists public.idx_conversations_waiting_queue;
  create index idx_conversations_waiting_queue
    on public.conversations (project_id, queue_entered_at, id)
    where status = 'waiting';
  ```

  Add comments explaining that the new fields exclude system messages and that `needs_reply` is a row-lock-ordered flag rather than a timestamp comparison.

- [x] **Step 4: Extend generated database types**

  Add exact types for the five fields to `conversations`: Row contains `needs_reply: boolean`,
  nullable `last_conversation_message_at`, `last_conversation_preview`, and
  `last_conversation_sender_type`, plus non-null `meaningful_activity_at: string`. Insert and Update
  contain the first four as optional values; the stored generated column is
  `meaningful_activity_at?: never` in both writable shapes so application code cannot assign it.

- [x] **Step 5: Run the test and type checks and verify GREEN**

  Run:

  ```bash
  node --experimental-strip-types --test tests/api/inbox-conversation-activity-migration.test.ts tests/api/auto-close-invariants.test.ts
  pnpm --filter @chatbot/api type-check
  ```

  Expected: both tests and the API type check pass. The auto-close test guards the existing customer activity and warning semantics preserved in the replacement trigger.

- [x] **Step 6: Review checkpoint without Git mutation**

  Run `git diff --check` and inspect only the Task 1 diff. Do not stage or commit.

### Task 2: Indexed Ordered-Page RPC

**Files:**

- Create: `supabase/migrations/20260716074557_inbox_conversation_page_rpc.sql`
- Create: `tests/api/inbox-conversation-page-rpc.test.ts`
- Modify: `packages/db/src/types.ts`

**Interfaces:**

- Consumes: Task 1 activity fields and existing conversation/customer columns.
- Produces: `public.get_inbox_conversation_page(...) -> jsonb` shaped as `{ total: number, items: Array<{ conversation_id: string, priority_reason: "waiting" | "customer_reply" | "activity", priority_at: string }> }`.

- [x] **Step 1: Write the failing RPC migration test**

  Assert the function has a fixed signature, `security invoker`, `set search_path = ''`, no `execute`/dynamic SQL, explicit service-role grants, all approved filters, an exact total separate from the item array, and this ordering structure:

  ```ts
  assert.match(
    sql,
    /case when p_sort = 'attention' then priority_rank end asc/
  );
  assert.match(sql, /status = 'waiting'[\s\S]*priority_at end asc nulls last/);
  assert.match(
    sql,
    /status = 'agent_active' and needs_reply[\s\S]*priority_at end asc nulls last/
  );
  assert.match(
    sql,
    /p_sort = 'recent'[\s\S]*meaningful_activity_at end desc nulls last/
  );
  assert.match(sql, /id asc/);
  assert.match(sql, /jsonb_build_object\([\s\S]*'total'[\s\S]*'items'/);
  assert.match(sql, /revoke all on function[\s\S]*from public/);
  assert.match(sql, /revoke all on function[\s\S]*from anon/);
  assert.match(sql, /revoke all on function[\s\S]*from authenticated/);
  assert.match(sql, /grant execute on function[\s\S]*to service_role/);
  ```

- [x] **Step 2: Run the test and verify RED**

  Run:

  ```bash
  node --experimental-strip-types --test tests/api/inbox-conversation-page-rpc.test.ts
  ```

  Expected: FAIL because the RPC migration is absent.

- [x] **Step 3: Implement the RPC migration**

  Define this exact parameter contract:

  ```sql
  create or replace function public.get_inbox_conversation_page(
    p_project_id uuid,
    p_viewer_id uuid,
    p_scope text default 'mine',
    p_status text default 'active',
    p_source text default null,
    p_sort text default 'attention',
    p_needs_reply boolean default false,
    p_voice_used boolean default false,
    p_assigned_agent text default null,
    p_handoff_reason text default null,
    p_activity_period text default null,
    p_flagged_only boolean default false,
    p_page integer default 1,
    p_limit integer default 25
  ) returns jsonb
  language sql
  stable
  security invoker
  set search_path = ''
  as $function$
  with filtered as materialized (
    select
      conversation.id,
      conversation.status,
      conversation.needs_reply,
      conversation.meaningful_activity_at,
      case
        when conversation.status = 'waiting' then 0
        when conversation.status = 'agent_active' and conversation.needs_reply then 1
        when conversation.status = 'agent_active' then 2
        when conversation.status = 'ai_active' then 3
        else 4
      end as priority_rank,
      case
        when conversation.status = 'waiting' then 'waiting'
        when conversation.status = 'agent_active' and conversation.needs_reply then 'customer_reply'
        else 'activity'
      end as priority_reason,
      case
        when conversation.status = 'waiting'
          then coalesce(conversation.queue_entered_at, conversation.meaningful_activity_at)
        when conversation.status = 'agent_active' and conversation.needs_reply
          then coalesce(conversation.last_customer_message_at, conversation.meaningful_activity_at)
        else conversation.meaningful_activity_at
      end as priority_at
    from public.conversations conversation
    left join public.customers customer on customer.id = conversation.customer_id
    where conversation.project_id = p_project_id
      and case p_status
        when 'active' then conversation.status in ('ai_active', 'agent_active')
        when 'ai_active' then conversation.status = 'ai_active'
        when 'agent_active' then conversation.status = 'agent_active'
        when 'waiting' then conversation.status = 'waiting'
        when 'resolved' then conversation.status = 'resolved'
        when 'closed' then conversation.status = 'closed'
        when 'auto_closed' then conversation.status = 'closed'
          and conversation.metadata ->> 'close_reason' = 'inactivity'
        else false
      end
      and (
        p_status = 'waiting'
        or p_scope = 'all'
        or conversation.assigned_agent_id = p_viewer_id
      )
      and (p_source is null or conversation.source = p_source)
      and (
        not p_needs_reply
        or (conversation.status = 'agent_active' and conversation.needs_reply)
      )
      and (
        not p_voice_used
        or conversation.last_voice_activity_at is not null
        or conversation.voice_ended_reason is not null
      )
      and (
        p_assigned_agent is null
        or (p_assigned_agent = 'unassigned' and conversation.assigned_agent_id is null)
        or (p_assigned_agent = 'me' and conversation.assigned_agent_id = p_viewer_id)
        or conversation.assigned_agent_id::text = p_assigned_agent
      )
      and (p_handoff_reason is null or conversation.handoff_reason = p_handoff_reason)
      and (
        p_activity_period is null
        or conversation.meaningful_activity_at >= current_timestamp - case p_activity_period
          when '24h' then interval '24 hours'
          when '7d' then interval '7 days'
          when '30d' then interval '30 days'
          else interval '100 years'
        end
      )
      and (not p_flagged_only or customer.is_flagged is true)
  ), ranked as (
    select
      filtered.*,
      row_number() over (
        order by
          case when p_sort = 'attention' then priority_rank end asc,
          case
            when p_sort = 'attention'
              and (status = 'waiting' or (status = 'agent_active' and needs_reply))
            then priority_at
          end asc nulls last,
          case
            when p_sort = 'attention'
              and not (status = 'waiting' or (status = 'agent_active' and needs_reply))
            then priority_at
          end desc nulls last,
          case when p_sort = 'recent' then meaningful_activity_at end desc nulls last,
          id asc
      ) as list_position
    from filtered
  ), page_rows as (
    select *
    from ranked
    order by list_position
    offset (p_page - 1) * p_limit
    limit p_limit
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'conversation_id', id,
            'priority_reason', priority_reason,
            'priority_at', priority_at
          ) order by list_position
        )
        from page_rows
      ),
      '[]'::jsonb
    )
  );
  $function$;
  ```

  Revoke `public`, `anon`, and `authenticated`, then grant only `service_role`. Do not add `security definer`.

- [x] **Step 4: Add the generated function type**

  Add `get_inbox_conversation_page` to `Database["public"]["Functions"]` in `packages/db/src/types.ts` with the exact Args above and `Returns: Json`.

- [x] **Step 5: Run the test and type check and verify GREEN**

  Run:

  ```bash
  node --experimental-strip-types --test tests/api/inbox-conversation-page-rpc.test.ts
  pnpm --filter @chatbot/api type-check
  ```

  Expected: PASS.

- [x] **Step 6: Review checkpoint without Git mutation**

  Run `git diff --check`; inspect the RPC for unsafe grants, missing filters, and unstable ordering. Do not stage or commit.

### Task 3: API Inbox Page Service and Route Contract

**Files:**

- Create: `apps/api/src/services/inbox-list.ts`
- Create: `tests/api/inbox-list-service.test.ts`
- Create: `tests/api/inbox-list-route.test.ts`
- Create: `tests/api/team-members-route.test.ts`
- Modify: `apps/api/src/routes/conversations.ts`
- Modify: `apps/api/src/routes/team.ts`
- Modify: `tests/web/inbox-status-scope.test.ts`

**Interfaces:**

- Consumes: Task 2 RPC and existing owner/member authorization in `GET /api/conversations`.
- Produces: validated API query and ordered response fields `needsReply`, `meaningfulActivityAt`, `priorityReason`, `priorityAt`, truthful `lastMessage`, and `hasVoiceActivity`.

- [x] **Step 1: Write failing service and route tests**

  Test the pure RPC decoder with valid, empty, and malformed payloads. Static route assertions must require:

  ```ts
  assert.match(route, /InboxListQuerySchema\.safeParse\(req\.query\)/);
  assert.match(route, /getInboxConversationPage\(/);
  assert.match(
    route,
    /if \(!isOwner && scope === "all" && status !== "waiting"\)/
  );
  assert.match(route, /status === "waiting"/);
  assert.match(route, /last_conversation_preview/);
  assert.match(
    route,
    /last_voice_activity_at != null \|\| conv\.voice_ended_reason != null/
  );
  assert.doesNotMatch(route, /\.order\("last_message_at"/);
  ```

  Update the existing status-scope test to expect `active` to mean AI/agent active only and Waiting to bypass assignment scope.

- [x] **Step 2: Run the tests and verify RED**

  Run:

  ```bash
  node --experimental-strip-types --test tests/api/inbox-list-service.test.ts tests/api/inbox-list-route.test.ts tests/web/inbox-status-scope.test.ts
  ```

  Expected: failures because the service and new contract do not exist.

- [x] **Step 3: Implement the focused service**

  Export these exact types/functions from `apps/api/src/services/inbox-list.ts`:

  ```ts
  import { z } from "zod";

  import { supabaseAdmin } from "../lib/supabase";

  export type InboxSort = "attention" | "recent";
  export type InboxStatus =
    | "active"
    | "ai_active"
    | "agent_active"
    | "waiting"
    | "resolved"
    | "closed"
    | "auto_closed";

  export interface InboxPageOptions {
    projectId: string;
    viewerId: string;
    scope: "mine" | "all";
    status: InboxStatus;
    source?: string;
    sort: InboxSort;
    needsReply: boolean;
    voiceUsed: boolean;
    assignedAgent?: string;
    handoffReason?: string;
    activityPeriod?: "24h" | "7d" | "30d";
    flaggedOnly: boolean;
    page: number;
    limit: number;
  }

  const RpcItemSchema = z.object({
    conversation_id: z.string().uuid(),
    priority_reason: z.enum(["waiting", "customer_reply", "activity"]),
    priority_at: z.string().datetime({ offset: true }),
  });

  const RpcResultSchema = z.object({
    total: z.number().int().nonnegative(),
    items: z.array(RpcItemSchema),
  });

  export function parseInboxPageRpc(value: unknown) {
    return RpcResultSchema.parse(value);
  }

  export async function getInboxConversationPage(options: InboxPageOptions) {
    const { data, error } = await supabaseAdmin.rpc(
      "get_inbox_conversation_page",
      {
        p_project_id: options.projectId,
        p_viewer_id: options.viewerId,
        p_scope: options.scope,
        p_status: options.status,
        p_source: options.source ?? null,
        p_sort: options.sort,
        p_needs_reply: options.needsReply,
        p_voice_used: options.voiceUsed,
        p_assigned_agent: options.assignedAgent ?? null,
        p_handoff_reason: options.handoffReason ?? null,
        p_activity_period: options.activityPeriod ?? null,
        p_flagged_only: options.flaggedOnly,
        p_page: options.page,
        p_limit: options.limit,
      }
    );
    if (error) throw new Error(`Inbox page query failed: ${error.message}`);
    return parseInboxPageRpc(data);
  }
  ```

- [x] **Step 4: Replace route-local ordering with the service**

  Define a Zod query schema with fixed enums:

  ```ts
  const InboxListQuerySchema = z.object({
    projectId: z.string().uuid(),
    scope: z.enum(["mine", "all"]).default("mine"),
    status: z
      .enum([
        "active",
        "ai_active",
        "agent_active",
        "waiting",
        "resolved",
        "closed",
        "auto_closed",
      ])
      .default("active"),
    source: z
      .enum([
        "widget",
        "playground",
        "mcp",
        "api",
        "public",
        "mobile",
        "whatsapp",
      ])
      .optional(),
    sort: z.enum(["attention", "recent"]).default("attention"),
    needsReply: OptionalQueryBooleanSchema,
    voiceUsed: OptionalQueryBooleanSchema,
    assignedAgent: z
      .union([z.string().uuid(), z.enum(["unassigned", "me"])])
      .optional(),
    handoffReason: z
      .enum([
        "customer_request",
        "low_confidence",
        "keyword",
        "button_click",
        "offline_form",
      ])
      .optional(),
    activityPeriod: z.enum(["24h", "7d", "30d"]).optional(),
    flagged: OptionalQueryBooleanSchema,
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  });
  ```

  Define `OptionalQueryBooleanSchema` once so only the literal query string `"true"` is true and
  `"false"` remains false:

  ```ts
  const OptionalQueryBooleanSchema = z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true");
  ```

  Normalize `sort` to `recent` for resolved/closed/auto-closed statuses. Reject a member's
  `scope=all` only when status is not Waiting, and reject every member `assignedAgent` value. For
  owners, reject `assignedAgent` unless scope is All and status is not Waiting. Then force Waiting
  to project scope. This preserves the approved project-wide queue for active members without
  granting project-wide access to any other status or allowing contradictory owner filters. Call
  the Task 3 service, fetch all returned IDs in one `.in("id", ids)` select, and restore RPC order
  through `new Map(rows.map(row => [row.id, row]))`.

  Select the new activity fields and derive:

  ```ts
  lastMessage: conv.last_conversation_preview
    ? {
        content: conv.last_conversation_preview,
        senderType: conv.last_conversation_sender_type,
        createdAt: conv.last_conversation_message_at,
      }
    : null,
  needsReply: conv.needs_reply,
  meaningfulActivityAt: conv.meaningful_activity_at,
  hasVoiceActivity:
    conv.last_voice_activity_at != null || conv.voice_ended_reason != null,
  priorityReason: orderItem.priority_reason,
  priorityAt: orderItem.priority_at,
  ```

  Return exact pagination from RPC total. When `items` is empty, skip the detail query and return an empty list with the non-zero total intact so the client can clamp stale pages.

  Preserve the existing `getAgentNames` batch: collect unique non-null assignee user IDs from the
  bounded detail page, issue one project-members `.in("user_id", agentIds)` query, and map names in
  memory. Add a static assertion that no Supabase query or Auth Admin lookup occurs inside the
  conversation formatting loop.

- [x] **Step 5: Expose the canonical assignee ID from the shared members endpoint**

  In `GET /api/projects/:id/members`, add `userId: member.user_id` to each project-member response
  and `userId: project.user_id` to the owner response. Add a route contract assertion that both
  branches expose `userId`; the existing team page already declares this field. The inbox must use
  `userId`, never the membership-row `id`, for `assignedAgent` values because
  `conversations.assigned_agent_id` references the authenticated user.

- [x] **Step 6: Run focused tests and type check and verify GREEN**

  Run:

  ```bash
  node --experimental-strip-types --test tests/api/inbox-list-service.test.ts tests/api/inbox-list-route.test.ts tests/api/team-members-route.test.ts tests/web/inbox-status-scope.test.ts
  pnpm --filter @chatbot/api type-check
  ```

  Expected: all pass.

- [x] **Step 7: Review checkpoint without Git mutation**

  Inspect query count, role checks, and empty-page handling. Run `git diff --check`; do not stage or commit.

### Task 4: Pure Inbox Query and Timestamp Utilities

**Files:**

- Create: `apps/web/lib/inbox-query.ts`
- Create: `apps/web/lib/inbox-time.ts`
- Create: `tests/web/inbox-query.test.ts`
- Create: `tests/web/inbox-time.test.ts`
- Modify: `apps/web/lib/conversation-status.ts`
- Modify: `tests/web/inbox-status-scope.test.ts`

**Interfaces:**

- Consumes: browser `URLSearchParams`, `isOwner`, API priority fields, locale, and a deterministic `now` in tests.
- Produces: normalized `InboxQueryState`, centralized `INBOX_SORT_OPTIONS`, API query parameters, active-filter descriptors, and localized timestamp presentation.

- [x] **Step 1: Write failing pure unit tests**

  Cover:

  ```ts
  assert.equal(parseInboxQuery(new URLSearchParams(), true).sort, "attention");
  assert.equal(
    parseInboxQuery(new URLSearchParams("status=closed&sort=attention"), true)
      .sort,
    "recent"
  );
  assert.equal(
    parseInboxQuery(new URLSearchParams("scope=all"), false).scope,
    "mine"
  );
  assert.equal(
    parseInboxQuery(new URLSearchParams("status=waiting&scope=mine"), true)
      .scope,
    "all"
  );
  assert.equal(buildInboxApiParams(state, projectId).get("status"), "active");
  ```

  Timestamp tests use a fixed local `now` and assert Waiting/Customer replied relative labels plus Today, Yesterday, current-year, and previous-year absolute formats. Assert the tooltip formatter includes the timezone name.

- [x] **Step 2: Run tests and verify RED**

  Run:

  ```bash
  node --experimental-strip-types --test tests/web/inbox-query.test.ts tests/web/inbox-time.test.ts
  ```

  Expected: module-not-found failures.

- [x] **Step 3: Implement centralized query state**

  Export:

  ```ts
  export type InboxSort = "attention" | "recent";
  export type InboxStatus =
    | "active"
    | "ai_active"
    | "agent_active"
    | "waiting"
    | "resolved"
    | "closed"
    | "auto_closed";

  export interface InboxQueryState {
    scope: "mine" | "all";
    status: InboxStatus;
    source: string | null;
    sort: InboxSort;
    needsReply: boolean;
    voiceUsed: boolean;
    assignedAgent: string | null;
    handoffReason: string | null;
    activityPeriod: "24h" | "7d" | "30d" | null;
    flagged: boolean;
    page: number;
  }

  export const INBOX_SORT_OPTIONS = [
    {
      value: "attention",
      labelKey: "sort.attention.label",
      descriptionKey: "sort.attention.description",
      timestampMode: "priority",
    },
    {
      value: "recent",
      labelKey: "sort.recent.label",
      descriptionKey: "sort.recent.description",
      timestampMode: "activity",
    },
  ] as const;
  ```

  `parseInboxQuery(params, isOwner)` must whitelist values, force member scope to Mine, force Waiting to project scope, clear Needs reply outside Agent active, and normalize terminal sorts to Recent. `serializeInboxQuery(state)` omits defaults. `buildInboxApiParams(state, projectId)` maps the URL `channel` concept to API `source` and sends every approved filter.

  Update the shared status-filter configuration to use the same canonical values: rename its first
  value from `all` to `active` with the `filters.activeChats` key, and send `auto_closed` directly
  instead of rebuilding the former `status=closed&closeReason=inactivity` pair. Keep row status
  metadata unchanged: database rows still carry `status="closed"` plus `closeReason`, so the
  inclusive **All closed** filter and **Closed – inactive** row badge retain their approved meaning.
  Role-aware options continue hiding AI active and auto-closed from members; Waiting remains
  reachable to every active member.

- [x] **Step 4: Implement localized timestamp semantics**

  Export a pure function:

  ```ts
  export interface InboxTimeInput {
    sort: InboxSort;
    priorityReason: "waiting" | "customer_reply" | "activity";
    priorityAt: string;
    meaningfulActivityAt: string;
    now?: Date;
    locale: string;
  }

  export interface InboxTimeOutput {
    text: string;
    full: string;
  }

  export function formatInboxTime(input: InboxTimeInput): InboxTimeOutput;
  ```

  Use `Intl.NumberFormat` with localized minute/hour/day units for elapsed Waiting duration and
  `Intl.RelativeTimeFormat` for Customer replied. Use `Intl.DateTimeFormat` for Today, Yesterday,
  current-year, previous-year, and the full tooltip. Handle future clock skew as zero elapsed, and
  do not add a date library dependency.

- [x] **Step 5: Run tests and verify GREEN**

  Re-run Step 2. Expected: all pure tests pass.

- [x] **Step 6: Review checkpoint without Git mutation**

  Verify there is one sort definition and one URL normalizer. Run `git diff --check`; do not stage or commit.

### Task 5: Sort Menu and Truthful Conversation Rows

**Files:**

- Create: `apps/web/components/inbox/inbox-sort-menu.tsx`
- Modify: `apps/web/app/[locale]/(dashboard)/inbox/page.tsx`
- Modify: `apps/web/messages/en/dashboard.json`
- Modify: `apps/web/messages/ar/dashboard.json`
- Create: `tests/web/inbox-sort-and-time-ui.test.ts`

**Interfaces:**

- Consumes: `INBOX_SORT_OPTIONS`, `formatInboxTime`, and API priority/activity fields.
- Produces: descriptive, accessible sort selection and row timestamps aligned with active ordering.

- [x] **Step 1: Write failing UI contract tests**

  Assert the component uses `DropdownMenuRadioGroup`, renders both description keys, wraps the info icon with `TooltipTrigger asChild`, and exposes an accessible name. Assert the page no longer calls the old clock-only `formatTime` for rows and passes `priorityReason`, `priorityAt`, and `meaningfulActivityAt` to the pure formatter.

- [x] **Step 2: Run tests and verify RED**

  Run:

  ```bash
  node --experimental-strip-types --test tests/web/inbox-sort-and-time-ui.test.ts tests/web/inbox-readable-indicators.test.ts
  ```

  Expected: failures because the menu and new row fields are absent.

- [x] **Step 3: Implement the descriptive sort menu**

  Build a controlled component:

  ```ts
  interface InboxSortMenuProps {
    value: InboxSort;
    disabledAttention: boolean;
    onChange: (value: InboxSort) => void;
  }
  ```

  The trigger reads `Sort: {active label}`. Each radio item renders a title and description. Needs attention is disabled for terminal statuses and shows the localized terminal-view explanation. The adjacent tooltip repeats only the active description and is not the sole source of help.

- [x] **Step 4: Use truthful row fields and timestamps**

  Extend the `Conversation` interface with:

  ```ts
  needsReply: boolean;
  meaningfulActivityAt: string;
  priorityReason: "waiting" | "customer_reply" | "activity";
  priorityAt: string;
  customer?: { isFlagged?: boolean } | null;
  ```

  Compute `const time = formatInboxTime(...)`, render `time.text`, and wrap it in the shared tooltip with `time.full`. Keep the channel, Voice used, sender-aware preview, and readable status badge. Add a flagged treatment only when `customer?.isFlagged` is true.

- [x] **Step 5: Add complete English and Arabic sort/time copy**

  Add keys for labels, descriptions, terminal-disabled help, `sortBy`, `waitingFor`, `customerReplied`, `yesterdayAt`, and the timestamp tooltip accessible label. Preserve JSON key parity.

- [x] **Step 6: Run tests, lint, and type check and verify GREEN**

  Run:

  ```bash
  node --experimental-strip-types --test tests/web/inbox-sort-and-time-ui.test.ts tests/web/inbox-readable-indicators.test.ts tests/web/i18n-parity.test.ts
  pnpm --filter @chatbot/web exec eslint 'components/inbox/inbox-sort-menu.tsx' 'app/[locale]/(dashboard)/inbox/page.tsx'
  pnpm --filter @chatbot/web type-check
  ```

  Expected: all pass.

- [x] **Step 7: Review checkpoint without Git mutation**

  Inspect keyboard/focus markup and copy parity. Run `git diff --check`; do not stage or commit.

### Task 6: Secondary Filters, URL State, and Split Fetching

**Files:**

- Create: `apps/web/components/inbox/inbox-filters-panel.tsx`
- Create: `apps/web/components/inbox/inbox-filter-chips.tsx`
- Modify: `apps/web/app/[locale]/(dashboard)/inbox/page.tsx`
- Modify: `apps/web/messages/en/dashboard.json`
- Modify: `apps/web/messages/ar/dashboard.json`
- Create: `tests/web/inbox-filter-controls.test.ts`
- Create: `tests/web/inbox-url-and-fetching.test.ts`

**Interfaces:**

- Consumes: Task 4 `InboxQueryState`, active assignable users from the existing project-members
  endpoint, and existing queue/summary endpoints.
- Produces: controlled filter panel/chips, URL-addressed state, list-only loading, and independent overview refresh.

- [x] **Step 1: Write failing filter and fetch-boundary tests**

  Assert the filter panel exposes Needs reply, Voice used, owner-only Assigned agent, Handoff reason, Activity period, and Flagged only. Assert applied filters render removable chips and Clear all. Assert the page defines both `fetchConversationPage` and `fetchInboxOverview`, filter changes call only the list fetch, manual Refresh awaits both, and stale list/overview requests use independent IDs.

- [x] **Step 2: Run tests and verify RED**

  Run:

  ```bash
  node --experimental-strip-types --test tests/web/inbox-filter-controls.test.ts tests/web/inbox-url-and-fetching.test.ts tests/web/inbox-status-scope.test.ts
  ```

  Expected: failures because filter components and split fetching do not exist.

- [x] **Step 3: Implement controlled filter components**

  `InboxFiltersPanel` receives:

  ```ts
  interface InboxFiltersPanelProps {
    value: InboxQueryState;
    isOwner: boolean;
    members: Array<{ userId: string; name: string }>;
    onChange: (next: InboxQueryState) => void;
  }
  ```

  It renders the approved controls in a responsive inline panel. Selecting Needs reply sets status
  to `agent_active`; selecting another status later clears Needs reply. Assigned agent is visible
  only for owner + All and is cleared when scope becomes Mine. Build its choices from the existing
  `GET /api/projects/:id/members` response by keeping only entries with `status === "active"` and a
  non-null `userId`; the option value is `userId` and the label falls back from name to email.

  `InboxFilterChips` consumes normalized state plus localization functions and emits state updates that remove one filter. Clear all resets only secondary filters, preserving scope, status, source, and sort.

- [x] **Step 4: Move control state into the URL**

  Use Next navigation hooks (`useSearchParams`, `usePathname`, `useRouter`) and the Task 4
  parser/serializer. Read `role` and `isLoading` from `useAgent()` and do not normalize the URL or
  issue the role-scoped list request until the current project's role is known; otherwise an
  owner's bookmarked `scope=all` view would be incorrectly rewritten to Mine during startup. One
  `updateInboxQuery` function normalizes the next state, resets page to one for non-page changes,
  and calls `router.replace` without scrolling. Browser back/forward derives the view from search
  params rather than duplicating it in local state.

- [x] **Step 5: Split list and overview requests**

  Refactor the current unified fetch into:

  ```ts
  const fetchConversationPage = useCallback(
    async ({ background = false } = {}) => {
      /* list endpoint only */
    },
    [apiUrl, t]
  );

  const fetchInboxOverview = useCallback(
    async ({ background = false } = {}) => {
      await Promise.all([fetchQueue(), fetchSummary(), refreshAvailability()]);
    },
    [currentProject, refreshAvailability]
  );
  ```

  `fetchAssignableMembers` reuses `GET /api/projects/:id/members` and stores the normalized active
  choices. For owners, initial load and manual Refresh run list, overview, and members concurrently;
  members never fetch for a non-owner. Filter/sort/page URL changes run only
  `fetchConversationPage`. Quiet realtime/polling refreshes list and overview without setting
  `listLoading`, but does not repeatedly refetch the stable member directory. Replace client-side
  realtime row reordering with a quiet server list refresh.

- [x] **Step 6: Implement honest list errors and page clamping**

  Track `listError` separately from overview errors. A foreground list failure replaces only the results area with localized Retry; it never shows stale rows under new controls. Background failures preserve the last successful rows. When a response has `items=[]`, `total>0`, and the requested page exceeds the computed last page, replace the URL with the last page and issue one new list request.

- [x] **Step 7: Add English/Arabic filters, chips, and error copy**

  Add complete parity for role-aware Needs reply, Voice used, Assigned agent, handoff values, activity periods, Flagged only, applied-filter count, Clear all, Retry, failed view, and Waiting-specific empty copy.

- [x] **Step 8: Run focused verification and verify GREEN**

  Run:

  ```bash
  node --experimental-strip-types --test tests/web/inbox-filter-controls.test.ts tests/web/inbox-url-and-fetching.test.ts tests/web/inbox-status-scope.test.ts tests/web/i18n-parity.test.ts
  pnpm --filter @chatbot/web type-check
  pnpm --filter @chatbot/web lint
  ```

  Expected: all pass with no full-page skeleton tied to list loading.

- [x] **Step 9: Review checkpoint without Git mutation**

  Verify URL normalization has no effect loop and that filter changes make one list request. Run `git diff --check`; do not stage or commit.

### Task 7: Full Local Regression and Migration Review

**Files:**

- Review all files from Tasks 1–6.
- Modify only files implicated by failures.

**Interfaces:**

- Consumes: completed local implementation.
- Produces: a locally verified, migration-ready change set.

- [x] **Step 1: Run focused inbox suite**

  Run every new test plus existing inbox/voice/auto-close invariants. Expected: zero failures.

- [x] **Step 2: Run full test suite**

  Run:

  ```bash
  pnpm test
  ```

  Expected: all tests pass; record the exact test count.

- [x] **Step 3: Run compilation and scoped lint**

  Run:

  ```bash
  pnpm --filter @chatbot/api type-check
  pnpm --filter @chatbot/web type-check
  pnpm --filter @chatbot/api exec eslint src/routes/conversations.ts src/services/inbox-list.ts
  pnpm --filter @chatbot/web exec eslint 'app/[locale]/(dashboard)/inbox/page.tsx' components/inbox lib/inbox-query.ts lib/inbox-time.ts
  ```

  Expected: all commands exit 0. Do not claim repository-wide lint is clean if unrelated baseline packages still fail.

- [x] **Step 4: Check formatting and diff hygiene**

  Run Prettier check on changed files, `git diff --check`, and `git status --short`. Confirm no secrets, generated build artifacts, staged files, commits, or unrelated rewrites were introduced.

### Task 8: Apply to Staging and Smoke Test

**Files:**

- Read/apply: `supabase/migrations/20260716074341_inbox_conversation_activity.sql`
- Read/apply: `supabase/migrations/20260716074557_inbox_conversation_page_rpc.sql`
- Read/apply: `supabase/migrations/20260716080000_inbox_activity_index_order.sql`
- Read/apply: `supabase/migrations/20260716090000_inbox_exclude_automated_events.sql`
- Read/apply: `supabase/migrations/20260716091000_inbox_meaningful_activity_not_null.sql`
- Verify: all API/web files from Tasks 3–6 after staging deployment.

**Interfaces:**

- Consumes: locally green migrations and application code.
- Produces: verified staging schema/data, query plans, and owner/member browser evidence; production remains untouched.

- [x] **Step 1: Apply migrations to FrontFace staging in order**

  Use the staging migration API for the five inbox migrations in source order. Do not use raw DDL
  through `execute_sql` for the final schema.

- [x] **Step 2: Verify backfill and trigger semantics on staging**

  Query aggregate counts for non-null activity fields and compare a set-based sample against each conversation's deterministic latest non-system message. In a transaction that is rolled back, insert customer, agent, and system messages and verify Needs reply/preview changes exactly as specified.

- [x] **Step 3: Verify RPC security and ordering**

  Confirm function ACL grants only service role beyond the owner. Run representative RPC calls for attention, recent, waiting, voice, flagged, owner assignment, and out-of-range pages. Verify exact totals and no duplicates across consecutive pages.

- [x] **Step 4: Verify query plans**

  Run `EXPLAIN (ANALYZE, BUFFERS)` for representative active recent, agent-needs-reply, and waiting queries. Confirm activity/partial queue indexes are used when selective and no correlated per-row subquery appears.

- [x] **Step 5: Regenerate and compare database types**

  Generate staging TypeScript types and verify the manually updated conversation fields and RPC signature match. Apply only required generated-type differences through `apply_patch`; do not rewrite unrelated generated sections.

- [ ] **Step 6: Deploy API/web changes to staging**

  Use the project's existing staging deployment path. Do not deploy to production.

  Pending: no FrontFace API/web deployment connector or repository deployment command is exposed
  in this workspace. The local API/web stack was instead run against the staging Supabase project.

- [x] **Step 7: Run authenticated Chrome smoke tests against the staging-backed app**

  Verify:
  - Owner Mine/All, active/terminal/waiting, assignment, voice, handoff, period, and flagged controls.
  - Member personal Needs reply and authorized Waiting view; no owner-only controls.
  - Queue card remains separate and Active chats contains no waiting duplicates.
  - Sort descriptions work with mouse and keyboard; menu descriptions remain readable on mobile.
  - Dates cover Today, Yesterday, current year, prior year, and full timezone tooltip.
  - Network requests show list-only fetching for sort/filter/page changes.
  - English/Arabic desktop/mobile layouts, focus order, and logical RTL alignment.
  - Browser console contains no new errors and requests contain no unauthorized data.

- [x] **Step 8: Final verification checkpoint without Git mutation**

  Re-run relevant local tests/type checks after any smoke-test fixes, run `git diff --check`, and report staging evidence plus any unrelated baseline issues. Leave all files unstaged and uncommitted.
