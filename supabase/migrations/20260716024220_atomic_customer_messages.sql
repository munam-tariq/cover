-- A customer reply and a cron close must serialize on the same conversation row. The earlier
-- application flow reopened during lookup and inserted the message later, leaving a race window in
-- which the cron could close between those operations. Keep the complete transition in Postgres.

create or replace function public.reopen_conversation(p_conversation_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_status text;
begin
  -- Always lock, including when already open. Callers such as append_customer_message rely on this
  -- lock remaining held for the rest of their transaction so a close cannot interleave.
  select status into v_status
  from conversations
  where id = p_conversation_id
  for update;

  if not found or v_status not in ('closed', 'resolved') then
    return false;
  end if;

  update conversations
  set status = 'ai_active',
      auto_close_warning_sent_at = null,
      customer_replied_since_warning = false,
      resolved_at = null,
      metadata = metadata - 'close_reason'
  where id = p_conversation_id;

  delete from conversation_insights
  where conversation_id = p_conversation_id;

  return true;
end;
$function$;

create or replace function public.append_customer_message(
  p_conversation_id uuid,
  p_content text,
  p_metadata jsonb default '{}'::jsonb,
  p_sender_id uuid default null
)
returns table (
  message_id uuid,
  message_created_at timestamptz,
  reopened boolean
)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_message_id uuid;
  v_created_at timestamptz;
  v_reopened boolean;
begin
  -- This locks the conversation even when it is already open. If it is terminal, the same call
  -- also starts a fresh inactivity cycle and invalidates the old classification.
  v_reopened := public.reopen_conversation(p_conversation_id);

  update conversations
  set customer_last_seen_at = now(),
      customer_presence = 'online'
  where id = p_conversation_id;

  if not found then
    raise exception 'Conversation % not found', p_conversation_id
      using errcode = 'P0002';
  end if;

  insert into messages (
    conversation_id,
    sender_type,
    sender_id,
    content,
    metadata
  ) values (
    p_conversation_id,
    'customer',
    p_sender_id,
    p_content,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id, created_at into v_message_id, v_created_at;

  return query select v_message_id, v_created_at, v_reopened;
end;
$function$;

-- Voice turns write no message until session-end, but they carry the same revive-on-reply
-- semantics. Reuse the locking transition rather than maintaining a second reopen implementation.
create or replace function public.touch_voice_activity(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  perform public.reopen_conversation(p_conversation_id);

  update conversations
  set last_voice_activity_at = now(),
      customer_last_seen_at = now(),
      customer_presence = 'online',
      customer_replied_since_warning = case
        when auto_close_warning_sent_at is not null then true
        else customer_replied_since_warning
      end
  where id = p_conversation_id;
end;
$function$;

revoke all on function public.reopen_conversation(uuid) from public, anon, authenticated;
revoke all on function public.append_customer_message(uuid, text, jsonb, uuid) from public, anon, authenticated;
revoke all on function public.touch_voice_activity(uuid) from public, anon, authenticated;

grant execute on function public.reopen_conversation(uuid) to service_role;
grant execute on function public.append_customer_message(uuid, text, jsonb, uuid) to service_role;
grant execute on function public.touch_voice_activity(uuid) to service_role;
