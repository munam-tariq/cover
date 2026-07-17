-- current_chat_count is a derived fact, not a value capped by configuration. An agent can already
-- exceed a newly lowered max; preserving the exact count keeps subsequent releases and claim
-- decisions correct. claim_conversation still refuses claims whenever current >= max.

alter table public.agent_availability
  drop constraint if exists agent_availability_check;

update public.agent_availability availability
set current_chat_count = (
  select count(*)::integer
  from public.conversations conversation
  where conversation.assigned_agent_id = availability.user_id
    and conversation.project_id = availability.project_id
    and conversation.status = 'agent_active'
)
where availability.current_chat_count is distinct from (
  select count(*)::integer
  from public.conversations conversation
  where conversation.assigned_agent_id = availability.user_id
    and conversation.project_id = availability.project_id
    and conversation.status = 'agent_active'
);

