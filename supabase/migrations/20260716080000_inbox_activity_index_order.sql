-- Match the recent-sort RPC exactly so PostgreSQL can satisfy the requested order
-- directly from the index when that is cheaper than filtering and sorting.
drop index if exists public.idx_conversations_project_meaningful_activity;

create index idx_conversations_project_meaningful_activity
  on public.conversations (
    project_id,
    meaningful_activity_at desc nulls last,
    id
  );
