-- Aggregate per-call voice metrics inside Postgres. Fetching every summary message through the
-- Data API silently truncates at the project's row limit, so JavaScript totals eventually become
-- wrong even though the request succeeds.

create index if not exists idx_messages_voice_summary_conversation_created
  on public.messages (conversation_id, created_at)
  where metadata @> '{"voice_summary": true}'::jsonb;

create or replace function public.get_voice_metrics(
  p_project_id uuid,
  p_start timestamptz default null,
  p_end timestamptz default null,
  p_source text default null,
  p_conversation_id uuid default null
)
returns table (
  voice_call_count bigint,
  voice_talk_seconds bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    count(*)::bigint as voice_call_count,
    coalesce(
      sum(
        case
          when jsonb_typeof(m.metadata->'durationSeconds') = 'number'
            then greatest(round((m.metadata->>'durationSeconds')::numeric), 0)
          else 0
        end
      ),
      0
    )::bigint as voice_talk_seconds
  from public.messages m
  join public.conversations c on c.id = m.conversation_id
  where c.project_id = p_project_id
    and m.metadata @> '{"voice_summary": true}'::jsonb
    and (p_start is null or m.created_at >= p_start)
    and (p_end is null or m.created_at < p_end)
    and (p_source is null or c.source = p_source)
    and (p_conversation_id is null or m.conversation_id = p_conversation_id);
$$;

revoke all on function public.get_voice_metrics(uuid, timestamptz, timestamptz, text, uuid)
  from public, anon, authenticated;
grant execute on function public.get_voice_metrics(uuid, timestamptz, timestamptz, text, uuid)
  to service_role;
