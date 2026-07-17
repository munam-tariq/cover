-- Capacity is derived from agent_active assignments. Every assignment and release therefore moves
-- the conversation and its agent_availability counter under one consistent lock order:
-- agent_availability first, conversations second.

create or replace function public.claim_conversation(
  p_conversation_id uuid,
  p_user_id uuid,
  p_project_id uuid,
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
  v_project_id uuid;
  v_assigned_agent_id uuid;
begin
  select * into v_avail
  from agent_availability
  where user_id = p_user_id
    and project_id = p_project_id
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

  select status, project_id, assigned_agent_id
  into v_status, v_project_id, v_assigned_agent_id
  from conversations
  where id = p_conversation_id
  for update;

  if not found then
    return 'NOT_FOUND';
  end if;
  if v_project_id <> p_project_id then
    return 'WRONG_PROJECT';
  end if;
  if v_status not in ('waiting', 'ai_active', 'resolved', 'closed') then
    return 'ALREADY_CLAIMED';
  end if;
  if v_status in ('resolved', 'closed')
     and v_assigned_agent_id is distinct from p_user_id then
    return 'ALREADY_CLAIMED';
  end if;

  update conversations
  set status = 'agent_active',
      assigned_agent_id = p_user_id,
      claimed_at = now(),
      resolved_at = null,
      queue_entered_at = null,
      queue_position = null,
      auto_close_warning_sent_at = null,
      customer_replied_since_warning = false,
      metadata = metadata - 'close_reason',
      handoff_reason = coalesce(p_handoff_reason, handoff_reason),
      handoff_triggered_at = case
        when p_handoff_reason is not null then now() else handoff_triggered_at
      end,
      ai_confidence_at_handoff = coalesce(p_ai_confidence, ai_confidence_at_handoff),
      trigger_keyword = coalesce(p_trigger_keyword, trigger_keyword),
      customer_email = coalesce(p_customer_email, customer_email),
      customer_name = coalesce(p_customer_name, customer_name)
  where id = p_conversation_id;

  if v_status in ('resolved', 'closed') then
    delete from conversation_insights where conversation_id = p_conversation_id;
  end if;

  update agent_availability
  set current_chat_count = current_chat_count + 1,
      last_assigned_at = now()
  where user_id = p_user_id
    and project_id = p_project_id;

  return 'CLAIMED';
end;
$function$;

create or replace function public.transition_agent_conversation(
  p_conversation_id uuid,
  p_project_id uuid,
  p_next_status text
)
returns text
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_initial_agent_id uuid;
  v_agent_id uuid;
  v_project_id uuid;
  v_status text;
begin
  if p_next_status not in ('waiting', 'resolved', 'closed', 'ai_active') then
    return 'INVALID_NEXT_STATUS';
  end if;

  -- Read the key needed for the first lock. Every writer that changes an active assignment uses
  -- this same availability -> conversation order, preventing a claim/release deadlock.
  select assigned_agent_id, project_id
  into v_initial_agent_id, v_project_id
  from conversations
  where id = p_conversation_id;

  if not found then
    return 'NOT_FOUND';
  end if;
  if v_project_id <> p_project_id then
    return 'WRONG_PROJECT';
  end if;
  if v_initial_agent_id is null then
    return 'NO_ASSIGNED_AGENT';
  end if;

  perform 1
  from agent_availability
  where user_id = v_initial_agent_id
    and project_id = p_project_id
  for update;

  if not found then
    return 'NO_AVAILABILITY_ROW';
  end if;

  select status, project_id, assigned_agent_id
  into v_status, v_project_id, v_agent_id
  from conversations
  where id = p_conversation_id
  for update;

  if v_project_id <> p_project_id then
    return 'WRONG_PROJECT';
  end if;
  if v_agent_id is distinct from v_initial_agent_id then
    return 'ASSIGNMENT_CHANGED';
  end if;
  if v_status <> 'agent_active' then
    return 'INVALID_STATUS';
  end if;

  update conversations
  set status = p_next_status,
      assigned_agent_id = case
        when p_next_status in ('waiting', 'ai_active') then null
        else assigned_agent_id
      end,
      resolved_at = case
        when p_next_status in ('resolved', 'closed') then now()
        else null
      end,
      queue_entered_at = case when p_next_status = 'waiting' then now() else null end,
      claimed_at = case
        when p_next_status in ('waiting', 'ai_active') then null
        else claimed_at
      end,
      first_response_at = case
        when p_next_status = 'waiting' then null
        else first_response_at
      end,
      queue_position = null,
      auto_close_warning_sent_at = case
        when p_next_status = 'ai_active' then null
        else auto_close_warning_sent_at
      end,
      customer_replied_since_warning = case
        when p_next_status = 'ai_active' then false
        else customer_replied_since_warning
      end,
      metadata = case
        when p_next_status = 'ai_active' then metadata - 'close_reason'
        else metadata
      end
  where id = p_conversation_id;

  update agent_availability
  set current_chat_count = greatest(current_chat_count - 1, 0)
  where user_id = v_agent_id
    and project_id = p_project_id;

  return 'TRANSITIONED';
end;
$function$;

revoke all on function public.claim_conversation(uuid, uuid, uuid, text, double precision, text, text, text) from public, anon, authenticated;
revoke all on function public.transition_agent_conversation(uuid, uuid, text) from public, anon, authenticated;

grant execute on function public.claim_conversation(uuid, uuid, uuid, text, double precision, text, text, text) to service_role;
grant execute on function public.transition_agent_conversation(uuid, uuid, text) to service_role;

-- Repair any drift left by the non-transactional writers before this migration.
update agent_availability a
set current_chat_count = least(
  (
    select count(*)::integer
    from conversations c
    where c.assigned_agent_id = a.user_id
      and c.project_id = a.project_id
      and c.status = 'agent_active'
  ),
  a.max_concurrent_chats
)
where a.current_chat_count is distinct from least(
  (
    select count(*)::integer
    from conversations c
    where c.assigned_agent_id = a.user_id
      and c.project_id = a.project_id
      and c.status = 'agent_active'
  ),
  a.max_concurrent_chats
);
