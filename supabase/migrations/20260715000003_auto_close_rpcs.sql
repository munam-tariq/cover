-- Auto-close state machine, as Postgres functions.
--
-- WHY FUNCTIONS AND NOT APP CODE: apps/api/src/lib/supabase.ts:16 is a plain @supabase/supabase-js
-- client — there is no `pg` Pool, no Drizzle, no raw-SQL escape hatch anywhere in the API. The Data
-- API cannot express `metadata || jsonb`, DB-side now(), make_interval(mins => ...), or
-- GREATEST(...) in a predicate. Doing it as JS read-then-write would reintroduce check-then-act
-- races and leave the expression index unused. Each transition is one locked, atomic statement here.
--
-- SHAPE: PL/pgSQL with separate statements rather than one top-level data-modifying CTE. The claim
-- UPDATE and the message INSERT (whose AFTER trigger updates the same conversation again) are kept
-- in different statements. Empirically the single-CTE form worked on PG 17.6, but the docs call
-- updating one row twice in a single statement unsupported; being correct by construction costs
-- nothing here.
--
-- ORDERING: "did the customer reply after the warning?" is answered by the trigger-maintained
-- conversations.customer_replied_since_warning flag, never by comparing timestamps. now() and
-- created_at are transaction-START times, so a reply whose transaction starts before the warn but
-- commits after would look older than the warning and be closed despite replying. No fixed grace
-- fixes that — nothing bounds a transaction's duration.
--
-- CONCURRENCY: pg_cron does not prevent overlapping runs and pg_net is async, so both functions
-- take FOR UPDATE ... SKIP LOCKED on candidates. That — not the re-asserted predicate — is what
-- makes concurrent runs safe: a row a customer transaction is already updating is skipped, and a
-- later customer update queues behind our lock. The re-assert stays as defence in depth.

-- ============================================================================
-- Pick the copy for a conversation's language.
--
-- conversations.metadata.language holds BCP-47 tags — staging really does carry 'ar-SA' alongside
-- 'ar' and 'en' — while p_texts is keyed by base language ('en', 'ar'). An exact-key lookup alone
-- silently serves English to every regional tag, so fall back tag -> base -> 'en' -> hardcoded.
-- ============================================================================

create or replace function public.pick_localized_text(
  p_texts jsonb,
  p_language text,
  p_fallback text
)
returns text
language sql
immutable
set search_path to 'public', 'pg_temp'
as $function$
  select coalesce(
    p_texts ->> coalesce(p_language, 'en'),
    p_texts ->> split_part(coalesce(p_language, 'en'), '-', 1),
    p_texts ->> 'en',
    p_fallback
  );
$function$;

revoke all on function public.pick_localized_text(jsonb, text, text) from public, anon, authenticated;
grant execute on function public.pick_localized_text(jsonb, text, text) to service_role;

-- ============================================================================
-- Voice activity touch.
--
-- Mirrors what the messages trigger does for text, because voice cannot use that trigger: nothing
-- is written to messages during a call (chat-engine.ts:296/752 skip writes for source='voice'; the
-- transcript batch-inserts only at session-end).
--
-- Setting last_voice_activity_at alone is NOT enough. It keeps a live call from being *warned*,
-- but CLOSE branch (b) — warned AND NOT replied AND warned < now() - grace — never looks at
-- activity at all. Without also setting the reply flag, a customer warned at 12:00 who starts
-- talking at 12:03 is closed at 12:06, mid-sentence. The flag is what branch (b) reads, so a voice
-- utterance has to set it exactly as a text reply does.
-- ============================================================================

create or replace function public.touch_voice_activity(p_conversation_id uuid)
returns void
language sql
security definer
set search_path to 'public', 'pg_temp'
as $function$
  update conversations
  set last_voice_activity_at = now(),   -- DB time: the app clock never enters the state machine
      customer_replied_since_warning = case
        when auto_close_warning_sent_at is not null then true
        else customer_replied_since_warning
      end
  where id = p_conversation_id;
$function$;

revoke all on function public.touch_voice_activity(uuid) from public, anon, authenticated;
grant execute on function public.touch_voice_activity(uuid) to service_role;

-- ============================================================================
-- WARN: claim + write the warning message, atomically.
-- Returns only the rows actually warned, so the caller's side effects (realtime broadcast,
-- WhatsApp dispatch) can never fire for a row it did not claim.
-- ============================================================================

create or replace function public.claim_and_warn_inactive(
  p_limit integer default 100,
  p_texts jsonb default '{}'::jsonb
)
returns table (
  conversation_id uuid,
  project_id uuid,
  source text,
  message_id uuid,
  warning_text text
)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_ids uuid[];
begin
  -- 1) Claim. A missing handoff_settings row falls back to 10/5/true rather than skipping the
  --    project, which would strand exactly the conversations we are trying to close.
  with candidates as (
    select c.id,
           coalesce(hs.inactivity_timeout_minutes, 10) as timeout_min
    from conversations c
    left join handoff_settings hs on hs.project_id = c.project_id
    where c.status = 'ai_active'
      and c.auto_close_warning_sent_at is null
      and coalesce(hs.send_inactivity_warning, true)
      and coalesce(greatest(c.last_customer_message_at, c.last_voice_activity_at), c.created_at)
          < now() - make_interval(mins => coalesce(hs.inactivity_timeout_minutes, 10))
    order by c.id
    for update of c skip locked
    limit p_limit
  ), claimed as (
    update conversations c
    set auto_close_warning_sent_at = now(),
        customer_replied_since_warning = false   -- a fresh warning cycle
    from candidates cd
    where c.id = cd.id
      and c.status = 'ai_active'                 -- re-assert
      and c.auto_close_warning_sent_at is null   -- re-assert
      -- Re-assert the *reason* the row was selected, not just its status. The lock above is the
      -- real guard, but that makes the lock shape load-bearing and invisible; this states the
      -- invariant in the statement that depends on it.
      and coalesce(greatest(c.last_customer_message_at, c.last_voice_activity_at), c.created_at)
          < now() - make_interval(mins => cd.timeout_min)
    returning c.id
  )
  select array_agg(claimed.id) into v_ids from claimed;

  if v_ids is null then
    return;
  end if;

  -- 2) Warning message. Separate statement: its AFTER trigger updates conversations again.
  --    p_texts carries TEMPLATES, not finished strings — one batch spans many projects and each has
  --    its own auto_close_after_warning_minutes (1-60), so a single rendered string could not hold
  --    every project's number. Substitution happens per row, against that row's own setting.
  return query
  with ins as (
    insert into messages (conversation_id, sender_type, content, metadata)
    select
      c.id,
      'ai',
      replace(
        pick_localized_text(
          p_texts,
          c.metadata ->> 'language',
          'Are you still there? I''ll close this chat in about {mins} minutes if I don''t hear back — just reply and I''ll keep it open.'
        ),
        '{mins}',
        coalesce(hs.auto_close_after_warning_minutes, 5)::text
      ),
      jsonb_build_object('event', 'inactivity_warning', 'csat_prompt', true)
    from conversations c
    left join handoff_settings hs on hs.project_id = c.project_id
    where c.id = any(v_ids)
    returning messages.id, messages.conversation_id, messages.content
  )
  select ins.conversation_id, c.project_id, c.source, ins.id, ins.content
  from ins
  join conversations c on c.id = ins.conversation_id;
end;
$function$;

-- ============================================================================
-- CLOSE: the three terminal branches.
-- ============================================================================

-- Adding close_text changes the return type, which CREATE OR REPLACE cannot do.
drop function if exists public.close_inactive_conversations(integer, jsonb);

create or replace function public.close_inactive_conversations(
  p_limit integer default 100,
  p_texts jsonb default '{}'::jsonb
)
returns table (
  conversation_id uuid,
  project_id uuid,
  source text,
  message_id uuid,
  close_text text
)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_ids uuid[];
begin
  with candidates as (
    select c.id,
           coalesce(hs.inactivity_timeout_minutes, 10)      as timeout_min,
           coalesce(hs.auto_close_after_warning_minutes, 5) as grace_min,
           coalesce(hs.send_inactivity_warning, true)       as warn_enabled
    from conversations c
    left join handoff_settings hs on hs.project_id = c.project_id
    where c.status = 'ai_active'
      and (
        -- (a) warned, customer replied, then lapsed again. Sticky: no second warning.
        (
          c.auto_close_warning_sent_at is not null
          and c.customer_replied_since_warning
          and coalesce(greatest(c.last_customer_message_at, c.last_voice_activity_at), c.created_at)
              < now() - make_interval(mins => coalesce(hs.inactivity_timeout_minutes, 10))
        )
        -- (b) warned, never replied: close once the post-warning grace elapses.
        --     Deliberately does NOT look at activity — the reply flag is the signal, because
        --     comparing timestamps here would be ordering against transaction-START times. That is
        --     also why touch_voice_activity must set the flag: a voice utterance writes no message,
        --     so nothing else would tell this branch the customer came back.
        or (
          c.auto_close_warning_sent_at is not null
          and not c.customer_replied_since_warning
          and c.auto_close_warning_sent_at
              < now() - make_interval(mins => coalesce(hs.auto_close_after_warning_minutes, 5))
        )
        -- (c) warnings disabled: close directly at the timeout.
        --     `auto_close_warning_sent_at is null` keeps the branches mutually exclusive. Without
        --     it, disabling warnings AFTER one was sent would make this instantly true and eat the
        --     customer's remaining grace.
        or (
          c.auto_close_warning_sent_at is null
          and not coalesce(hs.send_inactivity_warning, true)
          and coalesce(greatest(c.last_customer_message_at, c.last_voice_activity_at), c.created_at)
              < now() - make_interval(mins => coalesce(hs.inactivity_timeout_minutes, 10))
        )
      )
    order by c.id
    for update of c skip locked
    limit p_limit
  ), closed as (
    update conversations c
    set status = 'closed',
        resolved_at = now(),
        -- MERGE, never replace: a replace would destroy metadata.last_inbound_at (the WhatsApp 24h
        -- window, read by outbound-dispatcher.ts) and metadata.language.
        metadata = c.metadata || '{"close_reason":"inactivity"}'::jsonb
    from candidates cd
    where c.id = cd.id
      and c.status = 'ai_active'   -- re-assert; never close under an agent who just claimed it
      -- Re-assert the full reason for closing, against this row's freshly-locked values. The
      -- SKIP LOCKED above is what actually serialises us against a customer reply, but leaving
      -- that as the only guard makes the lock shape silently load-bearing: restating the predicate
      -- means a future refactor of the locking cannot quietly start closing live conversations.
      -- The settings are carried from `candidates` rather than re-joined so one batch cannot
      -- straddle a mid-flight settings change.
      and (
        (
          c.auto_close_warning_sent_at is not null
          and c.customer_replied_since_warning
          and coalesce(greatest(c.last_customer_message_at, c.last_voice_activity_at), c.created_at)
              < now() - make_interval(mins => cd.timeout_min)
        )
        or (
          c.auto_close_warning_sent_at is not null
          and not c.customer_replied_since_warning
          and c.auto_close_warning_sent_at < now() - make_interval(mins => cd.grace_min)
        )
        or (
          c.auto_close_warning_sent_at is null
          and not cd.warn_enabled
          and coalesce(greatest(c.last_customer_message_at, c.last_voice_activity_at), c.created_at)
              < now() - make_interval(mins => cd.timeout_min)
        )
      )
    returning c.id
  )
  select array_agg(closed.id) into v_ids from closed;

  if v_ids is null then
    return;
  end if;

  return query
  with ins as (
    insert into messages (conversation_id, sender_type, content, metadata)
    select
      c.id,
      'system',
      pick_localized_text(
        p_texts,
        c.metadata ->> 'language',
        'This conversation was automatically closed due to inactivity.'
      ),
      jsonb_build_object('event', 'auto_closed', 'reason', 'inactivity')
    from conversations c
    where c.id = any(v_ids)
    returning messages.id, messages.conversation_id, messages.content
  )
  -- close_text is returned rather than re-derived by the caller: the row's language lives here, and
  -- a JS-side fallback would broadcast English over a conversation whose durable message is Arabic.
  select ins.conversation_id, c.project_id, c.source, ins.id, ins.content
  from ins
  join conversations c on c.id = ins.conversation_id;
end;
$function$;

-- ============================================================================
-- REOPEN: a customer message on a closed/resolved conversation revives it.
--
-- One transaction, because it must delete the conversation_insights row too. The insights
-- classifier's cursor is NOT EXISTS(insight row), which is permanently false once a conversation
-- has been classified — so a chat that closes, gets classified, reopens, is continued, and
-- re-closes would never be reclassified: its topic/sentiment/resolved verdict would stay frozen on
-- the first-close transcript. Split into two calls, a failure between them makes that permanent.
-- ============================================================================

create or replace function public.reopen_conversation(p_conversation_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_reopened boolean := false;
begin
  update conversations
  set status = 'ai_active',
      -- Fresh warning cycle: a customer returning days later must not be closed unwarned.
      auto_close_warning_sent_at = null,
      customer_replied_since_warning = false,
      resolved_at = null,
      metadata = metadata - 'close_reason'
  where id = p_conversation_id
    and status in ('closed', 'resolved')   -- compare-and-set; a no-op if already open
  returning true into v_reopened;

  if v_reopened then
    delete from conversation_insights where conversation_id = p_conversation_id;
  end if;

  return coalesce(v_reopened, false);
end;
$function$;

-- ============================================================================
-- INSIGHTS INSERT: the other half of reopen.
--
-- The classifier selects unclassified terminal conversations, then spends seconds inside an OpenAI
-- call before writing. A reopen landing in that window finds no insight row to delete (the classifier
-- has not written it yet), so the classifier then drops a stale insight — derived from the
-- first-close transcript — onto a conversation that is now open again. Because the cursor is
-- NOT EXISTS(insight row), that row is never revisited: the conversation's topic/sentiment/resolved
-- verdict is frozen on a transcript that no longer describes it, silently and forever.
--
-- Fix: resolved_at is the terminal generation token. reopen_conversation() nulls it, and a later
-- close stamps a new one, so "same resolved_at as when I selected this row" means "still the exact
-- close I classified". The insert revalidates that and skips rows that moved on.
--
-- FOR UPDATE OF c IS LOAD-BEARING, not decoration. A plain WHERE would take its snapshot at
-- statement start and get no re-check, so a reopen committing mid-statement would still be
-- overwritten by the stale insert — the window narrows from seconds to milliseconds and the bug
-- survives. Locking the conversations row forces one of two safe orderings: we block behind reopen's
-- UPDATE and then EvalPlanQual re-checks this WHERE against the reopened row (resolved_at is now
-- null -> excluded), or we win the lock and reopen's DELETE removes what we wrote.
--
-- LOCK ORDER: conversations -> conversation_insights, matching reopen_conversation() (UPDATE
-- conversations, then DELETE the insight). Same order in both, so the pair cannot deadlock. Rows are
-- ordered by conversation_id so two concurrent classifier runs take the same locks in the same order.
--
-- Overlapping runs may both pay OpenAI for one conversation; ON CONFLICT DO NOTHING keeps the data
-- correct and the duplicate call is cost, not corruption.
-- ============================================================================

create or replace function public.insert_conversation_insights(p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_inserted integer;
begin
  with candidate as (
    select
      (r->>'conversation_id')::uuid    as conversation_id,
      (r->>'project_id')::uuid         as project_id,
      (r->>'resolved_at')::timestamptz as resolved_at,
      r->>'topic'                      as topic,
      r->>'sentiment'                  as sentiment,
      (r->>'resolved')::boolean        as resolved,
      r->>'answer_gap_question'        as answer_gap_question
    from jsonb_array_elements(p_rows) as r
  ), still_terminal as (
    select cd.*
    from candidate cd
    join conversations c on c.id = cd.conversation_id
    where c.status in ('resolved', 'closed')
      and c.resolved_at is not distinct from cd.resolved_at
    order by cd.conversation_id
    for update of c
  ), ins as (
    insert into conversation_insights (
      conversation_id, project_id, topic, sentiment, resolved, answer_gap_question
    )
    select conversation_id, project_id, topic, sentiment, resolved, answer_gap_question
    from still_terminal
    on conflict (conversation_id) do nothing
    returning 1
  )
  select count(*) into v_inserted from ins;

  return coalesce(v_inserted, 0);
end;
$function$;

-- ============================================================================
-- Agent chat counts: atomic, and clamped by the existing
-- agent_availability_check CHECK (current_chat_count <= max_concurrent_chats).
--
-- Replaces read-modify-write pairs in handoff.ts / handoff-trigger.ts. Note the pre-existing
-- `.update({ current_chat_count: supabaseAdmin.rpc("increment_chat_count") })` at handoff.ts:497
-- passes an UNEVALUATED PostgREST builder as an integer, so that update always failed silently
-- (its error was never checked) and only the "workaround" manual +1 ever applied. The drift on
-- staging (an agent at 2 with 0 real chats) comes from decrement paths that miss cases, not from
-- double counting.
-- ============================================================================

create or replace function public.increment_chat_count(p_user_id uuid, p_project_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare v_count integer;
begin
  update agent_availability
  set current_chat_count = current_chat_count + 1,
      last_assigned_at = now()
  where user_id = p_user_id
    and project_id = p_project_id
    and current_chat_count < max_concurrent_chats   -- never violate the CHECK
  returning current_chat_count into v_count;
  return v_count;   -- NULL => at capacity or no such row; caller must handle it
end;
$function$;

create or replace function public.decrement_chat_count(p_user_id uuid, p_project_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare v_count integer;
begin
  update agent_availability
  set current_chat_count = greatest(current_chat_count - 1, 0)   -- never below the CHECK floor
  where user_id = p_user_id
    and project_id = p_project_id
  returning current_chat_count into v_count;
  return v_count;
end;
$function$;

-- ============================================================================
-- CLAIM: capacity reservation and assignment in ONE transaction.
--
-- Atomic +1 alone does not fix the capacity race: two requests can both pass a separate capacity
-- READ (handoff.ts:716), both set status='agent_active', and the second increment then violates
-- agent_availability_check — leaving 6 real chats against a stored 5, or an ignored error and fresh
-- drift. The row lock here makes the check-and-reserve one step.
-- ============================================================================

-- Optional handoff columns were added to the signature, which CREATE OR REPLACE cannot do.
drop function if exists public.claim_conversation(uuid, uuid, uuid);

create or replace function public.claim_conversation(
  p_conversation_id uuid,
  p_user_id uuid,
  p_project_id uuid,
  -- Only the direct-assignment path (handoff trigger) supplies these; /claim leaves them null and
  -- coalesce keeps the existing values. They live here rather than in a follow-up UPDATE so the
  -- assignment and the reason it happened commit together.
  p_handoff_reason text default null,
  p_ai_confidence double precision default null,
  p_trigger_keyword text default null,
  p_customer_email text default null,
  p_customer_name text default null
)
returns text
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_avail agent_availability%rowtype;
  v_status text;
begin
  -- Lock the agent's availability row FIRST: this is what serialises concurrent claims for the same
  -- agent. Atomic increments alone would not — two claims could both pass a capacity *read* at 4/5
  -- and produce six real chats against a stored five, tripping agent_availability_check.
  select * into v_avail
  from agent_availability
  where user_id = p_user_id and project_id = p_project_id
  for update;

  if not found then
    return 'NO_AVAILABILITY_ROW';
  end if;

  if v_avail.status <> 'online' then
    return 'NOT_ONLINE';
  end if;

  if v_avail.current_chat_count >= v_avail.max_concurrent_chats then
    return 'AT_CAPACITY';
  end if;

  select status into v_status
  from conversations
  where id = p_conversation_id
  for update;

  if not found then
    return 'NOT_FOUND';
  end if;

  if v_status not in ('waiting', 'ai_active') then
    return 'ALREADY_CLAIMED';
  end if;

  update conversations
  set status = 'agent_active',
      assigned_agent_id = p_user_id,
      claimed_at = now(),
      queue_position = null,
      handoff_reason = coalesce(p_handoff_reason, handoff_reason),
      handoff_triggered_at = case
        when p_handoff_reason is not null then now() else handoff_triggered_at
      end,
      ai_confidence_at_handoff = coalesce(p_ai_confidence, ai_confidence_at_handoff),
      trigger_keyword = coalesce(p_trigger_keyword, trigger_keyword),
      customer_email = coalesce(p_customer_email, customer_email),
      customer_name = coalesce(p_customer_name, customer_name)
  where id = p_conversation_id;

  update agent_availability
  set current_chat_count = current_chat_count + 1,
      last_assigned_at = now()
  where user_id = p_user_id and project_id = p_project_id;

  return 'CLAIMED';
end;
$function$;

-- ============================================================================
-- ACLs. New functions are executable by anon and authenticated BY DEFAULT — SET search_path alone
-- is not a lockdown. service_role currently holds an explicit grant via Supabase's default
-- privileges, but RLS bypass does not bypass function ACLs, so grant it explicitly rather than lean
-- on an unstated default. Precedent: 20260615000001_recrawl_and_self_test.sql:57.
-- ============================================================================

revoke all on function public.claim_and_warn_inactive(integer, jsonb) from public, anon, authenticated;
revoke all on function public.close_inactive_conversations(integer, jsonb) from public, anon, authenticated;
revoke all on function public.reopen_conversation(uuid) from public, anon, authenticated;
revoke all on function public.insert_conversation_insights(jsonb) from public, anon, authenticated;
revoke all on function public.increment_chat_count(uuid, uuid) from public, anon, authenticated;
revoke all on function public.decrement_chat_count(uuid, uuid) from public, anon, authenticated;
revoke all on function public.claim_conversation(uuid, uuid, uuid, text, double precision, text, text, text) from public, anon, authenticated;

grant execute on function public.claim_and_warn_inactive(integer, jsonb) to service_role;
grant execute on function public.close_inactive_conversations(integer, jsonb) to service_role;
grant execute on function public.reopen_conversation(uuid) to service_role;
grant execute on function public.insert_conversation_insights(jsonb) to service_role;
grant execute on function public.increment_chat_count(uuid, uuid) to service_role;
grant execute on function public.decrement_chat_count(uuid, uuid) to service_role;
grant execute on function public.claim_conversation(uuid, uuid, uuid, text, double precision, text, text, text) to service_role;

-- ============================================================================
-- One-time reconciliation of the existing drift, same shape as
-- 20260610000006_reconcile_message_count.sql. Runs after the atomic writers exist, or it would
-- simply re-drift.
-- ============================================================================

update agent_availability a
set current_chat_count = least(
      coalesce((
        select count(*) from conversations c
        where c.assigned_agent_id = a.user_id
          and c.project_id = a.project_id
          and c.status = 'agent_active'
      ), 0),
      a.max_concurrent_chats
    )
where a.current_chat_count is distinct from coalesce((
      select count(*) from conversations c
      where c.assigned_agent_id = a.user_id
        and c.project_id = a.project_id
        and c.status = 'agent_active'
    ), 0);
