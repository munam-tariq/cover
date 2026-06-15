-- Onboarding self-test + atomic recrawl support.
--
-- 1. crawl_jobs.self_test — stores the background "ask 2 questions" self-test
--    (generated questions, RAG answers, citations) so the onboarding status API
--    can replay it even after the in-memory job cache expires.
--
-- 2. recrawl_replace_chunks() — atomically replaces a knowledge source's chunks
--    during a recrawl. New chunks are embedded by the API FIRST; this function
--    then deletes the old chunks and inserts the new ones + updates the source in
--    a single transaction, so a failure never leaves the RAG index polluted or
--    half-empty. The FK knowledge_chunks_source_id_fkey is ON DELETE CASCADE, but
--    recrawl keeps the source row and only swaps its chunks, hence this helper.

-- 1) self-test column ---------------------------------------------------------
alter table public.crawl_jobs
  add column if not exists self_test jsonb;

-- 2) atomic chunk replacement -------------------------------------------------
-- embedding is passed inside p_chunks as a pgvector-formatted string, e.g.
--   { "content": "...", "context": "...", "embedding": "[0.1,0.2,...]", "metadata": {...} }
create or replace function public.recrawl_replace_chunks(
  p_source_id uuid,
  p_content text,
  p_source_url text,
  p_chunks jsonb,
  p_chunk_count integer
)
returns void
language plpgsql
set search_path = public
as $$
begin
  -- Swap chunks in one transaction (the whole function body is atomic).
  delete from public.knowledge_chunks where source_id = p_source_id;

  insert into public.knowledge_chunks (source_id, content, context, embedding, metadata)
  select
    p_source_id,
    elem->>'content',
    elem->>'context',
    (elem->>'embedding')::vector,
    coalesce(elem->'metadata', '{}'::jsonb)
  from jsonb_array_elements(p_chunks) as elem;

  update public.knowledge_sources
  set content     = p_content,
      source_url  = coalesce(p_source_url, source_url),
      chunk_count = p_chunk_count,
      status      = 'ready',
      scraped_at  = now(),
      error       = null
  where id = p_source_id;
end;
$$;

-- Called by the API using the service role (bypasses RLS). Lock down exec to it.
revoke all on function public.recrawl_replace_chunks(uuid, text, text, jsonb, integer) from public, anon, authenticated;
grant execute on function public.recrawl_replace_chunks(uuid, text, text, jsonb, integer) to service_role;
