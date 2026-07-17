-- POST-DEPLOY ONLY.
-- Apply after the application version that has no legacy readers/writers is serving all traffic.

do $guard$
declare
  unreconciled_sessions integer;
  incomplete_message_sets integer;
begin
  select count(*)
  into unreconciled_sessions
  from public.chat_sessions legacy
  where not exists (
    select 1
    from public.conversations conversation
    where conversation.id = legacy.id
  );

  if unreconciled_sessions > 0 then
    raise exception 'Unreconciled legacy chat sessions: %', unreconciled_sessions;
  end if;

  select count(*)
  into incomplete_message_sets
  from public.chat_sessions legacy
  join public.conversations conversation on conversation.id = legacy.id
  left join lateral (
    select count(*)::integer as message_count
    from public.messages message
    where message.conversation_id = conversation.id
  ) live on true
  where live.message_count < coalesce(cardinality(legacy.messages), 0);

  if incomplete_message_sets > 0 then
    raise exception 'Legacy chat sessions with incomplete message reconciliation: %',
      incomplete_message_sets;
  end if;
end
$guard$;

-- lead_captures owns the FK to chat_sessions, so dependency order is intentional.
drop table if exists public.lead_captures;
drop table if exists public.chat_sessions;

alter table public.conversations
  drop column if exists is_voice,
  drop column if exists is_voice_call,
  drop column if exists voice_call_id,
  drop column if exists voice_cost,
  drop column if exists voice_recording_url,
  drop column if exists voice_transcript,
  drop column if exists awaiting_email,
  drop column if exists pending_question,
  drop column if exists email_asked,
  drop column if exists handoff_requested_at;

