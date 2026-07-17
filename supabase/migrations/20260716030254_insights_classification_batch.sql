-- Read the hourly insights workload in bounded, set-based batches. The previous app loop made one
-- conversations query per project, then fetched every message for every selected conversation;
-- that was both N+1 and silently truncated by the Data API row cap.

create index if not exists idx_conversations_insights_candidates
  on public.conversations (project_id, resolved_at, id)
  where status in ('resolved', 'closed')
    and last_customer_message_at is not null;

create or replace function public.get_insight_classification_batch(
  p_project_ids uuid[],
  p_cutoff timestamptz,
  p_limit integer,
  p_message_limit integer
)
returns table (
  conversation_id uuid,
  project_id uuid,
  resolved_at timestamptz,
  messages jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  with candidates as materialized (
    select
      c.id as conversation_id,
      c.project_id,
      c.resolved_at
    from public.conversations c
    where c.project_id = any(p_project_ids)
      and c.status in ('resolved', 'closed')
      and c.resolved_at >= p_cutoff
      and c.last_customer_message_at is not null
      and not exists (
        select 1
        from public.conversation_insights ci
        where ci.conversation_id = c.id
      )
    order by c.resolved_at, c.id
    limit p_limit
  ), ranked_messages as (
    select
      c.conversation_id,
      m.id as message_id,
      m.sender_type,
      m.content,
      m.created_at,
      m.metadata,
      row_number() over (
        partition by m.conversation_id
        order by m.created_at desc, m.id desc
      ) as message_rank,
      row_number() over (
        partition by m.conversation_id, m.sender_type
        order by m.created_at desc, m.id desc
      ) as sender_rank
    from candidates c
    join public.messages m on m.conversation_id = c.conversation_id
    where m.sender_type <> 'system'
      and nullif(btrim(m.content), '') is not null
      and not coalesce(m.metadata ? 'event', false)
  ), selected_messages as (
    -- Usually exactly p_message_limit rows. If those recent rows contain no customer turn, include
    -- the latest customer turn as one extra row; the app replaces the oldest recent row with it.
    select rm.*
    from ranked_messages rm
    where rm.message_rank <= p_message_limit
       or (rm.sender_type = 'customer' and rm.sender_rank = 1)
  )
  select
    c.conversation_id,
    c.project_id,
    c.resolved_at,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'conversation_id', sm.conversation_id,
          'sender_type', sm.sender_type,
          'content', sm.content,
          'created_at', sm.created_at,
          'metadata', sm.metadata
        )
        order by sm.created_at, sm.message_id
      ) filter (where sm.message_id is not null),
      '[]'::jsonb
    ) as messages
  from candidates c
  left join selected_messages sm on sm.conversation_id = c.conversation_id
  group by c.conversation_id, c.project_id, c.resolved_at
  order by c.resolved_at, c.conversation_id;
$$;

-- Topic normalization needs recent canonical labels, but a global LIMIT starves later projects.
-- Rank labels inside each project, then return all candidate projects in one call.
create or replace function public.get_recent_insight_topics(
  p_project_ids uuid[],
  p_limit integer default 500
)
returns table (
  project_id uuid,
  topic text
)
language sql
stable
security definer
set search_path = ''
as $$
  with labels as (
    select
      ci.project_id,
      ci.topic,
      max(ci.created_at) as last_seen_at
    from public.conversation_insights ci
    where ci.project_id = any(p_project_ids)
      and ci.topic is not null
    group by ci.project_id, ci.topic
  ), ranked as (
    select
      l.project_id,
      l.topic,
      row_number() over (
        partition by l.project_id
        order by l.last_seen_at desc, l.topic
      ) as topic_rank
    from labels l
  )
  select r.project_id, r.topic
  from ranked r
  where r.topic_rank <= p_limit
  order by r.project_id, r.topic_rank;
$$;

revoke all on function public.get_insight_classification_batch(uuid[], timestamptz, integer, integer)
  from public, anon, authenticated;
revoke all on function public.get_recent_insight_topics(uuid[], integer)
  from public, anon, authenticated;

grant execute on function public.get_insight_classification_batch(uuid[], timestamptz, integer, integer)
  to service_role;
grant execute on function public.get_recent_insight_topics(uuid[], integer)
  to service_role;
