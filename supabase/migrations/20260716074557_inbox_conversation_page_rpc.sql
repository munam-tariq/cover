-- Filter, rank, and paginate the inbox in one service-role-only database operation. Express owns
-- user authorization; this function owns the mixed-direction ordering PostgREST cannot express.
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
)
returns jsonb
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
      when conversation.status = 'agent_active' and conversation.needs_reply
        then 'customer_reply'
      else 'activity'
    end as priority_reason,
    case
      when conversation.status = 'waiting'
        then coalesce(conversation.queue_entered_at, conversation.meaningful_activity_at)
      when conversation.status = 'agent_active' and conversation.needs_reply
        then coalesce(
          conversation.last_customer_message_at,
          conversation.meaningful_activity_at
        )
      else conversation.meaningful_activity_at
    end as priority_at
  from public.conversations conversation
  left join public.customers customer on customer.id = conversation.customer_id
  where conversation.project_id = p_project_id
    and p_page >= 1
    and p_limit between 1 and 100
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
    and (
      p_handoff_reason is null
      or conversation.handoff_reason = p_handoff_reason
    )
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
          when p_sort = 'attention' and status = 'waiting' then priority_at
        end asc nulls last,
        case
          when p_sort = 'attention'
            and status = 'agent_active'
            and needs_reply
            then priority_at
        end asc nulls last,
        case
          when p_sort = 'attention'
            and status <> 'waiting'
            and not (status = 'agent_active' and needs_reply)
            then priority_at
        end desc nulls last,
        case
          when p_sort = 'recent' then meaningful_activity_at
        end desc nulls last,
        id asc
    ) as list_position
  from filtered
), page_rows as (
  select *
  from ranked
  order by list_position
  offset (p_page::bigint - 1) * p_limit::bigint
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
        )
        order by list_position
      )
      from page_rows
    ),
    '[]'::jsonb
  )
);
$function$;

revoke all on function public.get_inbox_conversation_page(
  uuid, uuid, text, text, text, text, boolean, boolean, text, text, text, boolean, integer, integer
) from public;
revoke all on function public.get_inbox_conversation_page(
  uuid, uuid, text, text, text, text, boolean, boolean, text, text, text, boolean, integer, integer
) from anon;
revoke all on function public.get_inbox_conversation_page(
  uuid, uuid, text, text, text, text, boolean, boolean, text, text, text, boolean, integer, integer
) from authenticated;
grant execute on function public.get_inbox_conversation_page(
  uuid, uuid, text, text, text, text, boolean, boolean, text, text, text, boolean, integer, integer
) to service_role;
