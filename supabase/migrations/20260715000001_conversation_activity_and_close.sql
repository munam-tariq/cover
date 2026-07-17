-- Conversation activity tracking + auto-close correctness (schema half).
--
-- WHY: `closeAbandonedConversations` (apps/api/src/services/presence.ts:336) filters
--   .lt("customer_last_seen_at", threshold)
-- and `NULL < x` is NULL, so NULL rows are never selected. `ai_active` conversations ALWAYS have
-- customer_last_seen_at = NULL, because the only writer on the message path
-- (storeCustomerMessageOnly, chat-engine.ts:236-239) sits inside the handoff branch; the normal AI
-- path logs via logConversationMessages (conversation.ts:303) which never touches presence.
-- Net: auto-close could only ever close chats that were NOT AI-handled — i.e. it was dead for its
-- actual target. Prod 2026-07-15: 93 open chats, 90 stale >24h, all 90 with NULL.
--
-- FIX: track customer activity in columns maintained by the message trigger, so a future code path
-- cannot forget to write them (which is exactly how the original bug happened).
--
-- `last_message_at` is deliberately NOT part of the activity signal: it is bumped by EVERY insert,
-- including the AI's own inactivity warning, which would reset the very countdown the warning
-- starts. Only customer-originated signals may feed activity.

-- ============================================================================
-- 1) Activity + preview columns
-- ============================================================================

alter table conversations
  add column if not exists last_customer_message_at  timestamptz,
  add column if not exists last_voice_activity_at    timestamptz,
  add column if not exists last_message_preview      text,
  add column if not exists last_message_sender_type  text,
  add column if not exists customer_replied_since_warning boolean not null default false;

comment on column conversations.customer_replied_since_warning is
  'Did the customer speak since the inactivity warning? A FLAG, not a timestamp comparison: now() and created_at are transaction-START time (verified: two inserts in one tx share a created_at to the microsecond), so a reply whose tx starts before the warn RPC but commits after would compare as "older" than the warning and be closed despite having replied. No fixed grace can fix that -- nothing bounds a transaction''s duration. The trigger sets this under the conversation row lock, which is exact.';

comment on column conversations.last_customer_message_at is
  'Last customer-authored message. Half of the auto-close activity signal (see last_voice_activity_at). Maintained by update_conversation_message_count().';
comment on column conversations.last_voice_activity_at is
  'Last real voice utterance, written per-turn by POST /api/voice/llm/chat/completions. A TIMESTAMP, not an "in call" flag: a flag set at call-start would stick true forever when the browser crashes (12 staging conversations already have voice_ended_reason NULL and will never end), re-creating the never-closing bug. A stale timestamp self-heals.';
comment on column conversations.last_message_preview is
  'Denormalized last message text for the inbox list. Without it GET /conversations returns no lastMessage and the list renders "No messages yet" for every row.';

-- ============================================================================
-- 2) Extend the existing message trigger (do NOT add a second trigger)
--
-- CREATE OR REPLACE resets a function's configuration parameters, so the
-- `SET search_path` pinned by 20260626000001_security_hardening.sql MUST be restated here or the
-- hardening silently regresses.
-- ============================================================================

create or replace function public.update_conversation_message_count()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
begin
  update conversations
  set message_count             = message_count + 1,
      last_message_at           = new.created_at,
      last_message_preview      = left(new.content, 200),
      last_message_sender_type  = new.sender_type,
      -- Customer messages only; anything else preserves the prior value.
      last_customer_message_at  = case
                                    when new.sender_type = 'customer' then new.created_at
                                    else last_customer_message_at
                                  end,
      -- Ordering, done exactly. This UPDATE holds the conversation row lock and (READ COMMITTED)
      -- re-reads the latest committed row once granted, so a reply racing the warn RPC observes
      -- auto_close_warning_sent_at correctly. Comparing timestamps here would not: they are
      -- transaction-START times. Sticky until the next warning resets it.
      customer_replied_since_warning = case
                                         when new.sender_type = 'customer'
                                              and auto_close_warning_sent_at is not null
                                           then true
                                         else customer_replied_since_warning
                                       end
  where id = new.conversation_id;
  return new;
end;
$function$;

-- ============================================================================
-- 3) Backfill
--
-- The updated_at trigger is suspended for the backfill: otherwise every conversation's updated_at
-- becomes the migration timestamp, which both destroys real last-touch data and would corrupt the
-- resolved_at backfill below (it reads updated_at).
-- ============================================================================

alter table conversations disable trigger update_conversations_updated_at;

-- 3a) resolved_at must be set on every terminal row: 5 of 12 closed rows on staging have it NULL
--     (the public-page and offline-form paths close without setting it). The insights cursor and
--     the inbox's "closed at" both read it. The app-side paths are fixed separately; this repairs
--     history.
update conversations
set resolved_at = updated_at
where status in ('resolved', 'closed')
  and resolved_at is null;

-- 3b) Activity + preview from existing messages. Set-based, not a loop.
with last_msg as (
  select distinct on (conversation_id)
         conversation_id, content, sender_type
  from messages
  order by conversation_id, created_at desc, id desc
),
last_cust as (
  select conversation_id, max(created_at) as last_customer_at
  from messages
  where sender_type = 'customer'
  group by conversation_id
)
update conversations c
set last_message_preview     = left(lm.content, 200),
    last_message_sender_type = lm.sender_type,
    last_customer_message_at = lc.last_customer_at
from last_msg lm
left join last_cust lc on lc.conversation_id = lm.conversation_id
where c.id = lm.conversation_id;

-- last_voice_activity_at is intentionally NOT backfilled: no per-turn voice history exists (voice
-- transcripts batch-insert at session-end). Historical customer voice turns are stored as
-- sender_type='customer', so 3b already covers them via last_customer_message_at.

alter table conversations enable trigger update_conversations_updated_at;

-- ============================================================================
-- 4) Index backing the auto-close candidate scan.
--
-- The expression MUST match the RPCs' activity expression character-for-character or the planner
-- will not use it.
-- ============================================================================

create index if not exists idx_conversations_ai_active_activity
  on conversations ((coalesce(greatest(last_customer_message_at, last_voice_activity_at), created_at)))
  where status = 'ai_active';

-- ============================================================================
-- 5) conversation_insights: exactly-once classification.
--
-- The classifier moves from a time window to a state cursor
-- (NOT EXISTS (insight row)), because updated_at is bumped by every touch — a CSAT rating on a
-- closed conversation would make it look newly-terminal and re-bill it. NOT EXISTS -> INSERT is
-- check-then-act, so the insert also needs ON CONFLICT DO NOTHING; both require this constraint.
-- Staging was verified clean 2026-07-15 (6 rows, 6 distinct conversation_ids) — but prod was NOT;
-- MCP access to it was revoked before that check. The current writer is a delete-then-insert, which
-- is exactly how duplicates arise, so prod plausibly has some. ONE duplicate makes CREATE UNIQUE
-- INDEX fail and rolls back this ENTIRE migration, including the activity columns and the trigger.
-- Assuming staging's cleanliness transfers is the same reasoning that hid the original cron bug for
-- 33 days, so dedupe set-wise first rather than gambling the deploy on a preflight nobody ran.
-- ============================================================================

-- Keep the newest insight per conversation; older duplicates are superseded snapshots of the same
-- transcript. Set-based, not a loop, and a no-op on a clean database.
delete from conversation_insights ci
using conversation_insights newer
where ci.conversation_id = newer.conversation_id
  and (newer.created_at, newer.id) > (ci.created_at, ci.id);

drop index if exists idx_conversation_insights_conversation;
create unique index idx_conversation_insights_conversation
  on conversation_insights (conversation_id);

-- ============================================================================
-- 6) Inactivity defaults: 10 minutes to warn, 5 more to close.
--
-- NOTE: this DEFAULT is the less important half. DEFAULT_HANDOFF_SETTINGS
-- (apps/api/src/routes/handoff-settings.ts:161) is spread into both settings-creation paths, so the
-- API explicitly writes the value on create and would override this default. That constant is
-- changed to 10 in the same change.
--
-- The UPDATE is safe: there is no UI anywhere for inactivity_timeout_minutes (zero references in
-- apps/web), and all 7 staging rows are an identical 5/5/true — the untouched constant default.
-- No tenant could have deliberately chosen 5.
-- ============================================================================

alter table handoff_settings alter column inactivity_timeout_minutes set default 10;

update handoff_settings
set inactivity_timeout_minutes = 10
where inactivity_timeout_minutes = 5;
