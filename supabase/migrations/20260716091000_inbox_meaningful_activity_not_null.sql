-- The generated expression always includes conversations.created_at, which is non-null.
-- Record that invariant in the catalog so generated client types match the runtime contract.
alter table public.conversations
  alter column meaningful_activity_at set not null;
