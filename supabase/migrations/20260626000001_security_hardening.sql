-- Security hardening (2026-06-26). Closes findings from the June 2026 Supabase review,
-- verified live against the dev project (gjotktstaruezfjnslup) via the Supabase advisor +
-- direct catalog queries. service_role bypasses RLS, so "always-true" PUBLIC policies are
-- unsafe and unnecessary.
--
-- IMPORTANT (prod): this migration is declarative ("revoke from PUBLIC, anon, authenticated",
-- "drop policy if exists") so it enforces the same end-state whether or not a target database
-- already has the earlier hardening migrations (20260610000001 / 20260610000005). Ensure prod
-- (hynaqwwofkpaafvlckdm) is caught up on the migration history before applying, and pin the
-- project ref explicitly when pushing (a deploy script has defaulted to the wrong project).
--
-- NOTE: authenticated table grants are intentionally LEFT IN PLACE. The browser dashboard reads
-- several tables directly under per-user RLS (projects, knowledge_sources, conversations,
-- messages via auth/callback, knowledge realtime, and inbox realtime). Only `anon` is revoked.

begin;

-- ============================================================================
-- 1) CRITICAL: conversation_insights is anon-readable.
--    Policy "Service role full access to insights" was created FOR ALL USING(true)
--    WITH CHECK(true) with NO `TO` clause, so it applies to PUBLIC (incl. anon), not
--    service_role. Combined with the default anon SELECT grant, anon could read every
--    tenant's conversation insights over the REST/GraphQL data API.
--    service_role bypasses RLS, so the policy is unnecessary. The owner-scoped SELECT
--    policy "Users can read own project insights" remains for the dashboard.
-- ============================================================================
drop policy if exists "Service role full access to insights" on public.conversation_insights;

-- ============================================================================
-- 2) Drop the remaining "always-true" public INSERT policies on message_feedback and
--    pulse_responses. These were previously kept as "public write-only submission" paths,
--    but the widget now submits feedback and pulse responses through the Express API
--    (service role) — POST /api/chat/feedback and POST /api/pulse/responses — verified in
--    apps/widget + apps/api (all inserts use supabaseAdmin). Dropping them removes the
--    anon/authenticated data-API write/spam vector.
-- ============================================================================
drop policy if exists "anyone_can_submit_feedback" on public.message_feedback;
drop policy if exists "Anyone can submit pulse responses" on public.pulse_responses;

-- ============================================================================
-- 3) Revoke ALL `anon` privileges on tenant tables.
--    Nothing legitimately uses the anon Postgres role over the data API:
--      - dashboard queries Supabase as `authenticated` (per-user RLS),
--      - the embedded widget talks only to the Express API (service role) and uses
--        Supabase Realtime *broadcast* channels (which read no tables),
--      - the hosted public page makes no anon .from() calls.
--    This also clears every pg_graphql_anon_table_exposed advisor finding and makes a
--    single bad RLS policy no longer anon-exploitable. authenticated grants are untouched.
-- ============================================================================
revoke all privileges on table
  public.agent_availability,
  public.api_endpoints,
  public.api_keys,
  public.chat_sessions,
  public.conversation_insights,
  public.conversations,
  public.crawl_jobs,
  public.customers,
  public.handoff_settings,
  public.knowledge_chunks,
  public.knowledge_sources,
  public.lead_captures,
  public.message_feedback,
  public.messages,
  public.project_client_keys,
  public.project_members,
  public.projects,
  public.pulse_campaigns,
  public.pulse_responses,
  public.pulse_summaries,
  public.qualified_leads
from anon;

-- ============================================================================
-- 4) Lock down SECURITY DEFINER helper functions.
--    All 8 are flagged authenticated_security_definer_function_executable. Verified safe to
--    revoke `authenticated` EXECUTE: no current RLS policy references them (live pg_policies
--    check returned none — the policies that once used has_project_access() etc. were
--    rewritten to inline subqueries), there are no Edge Functions, the browser makes no
--    .rpc() calls, and the API calls run via service_role (which retains EXECUTE and bypasses
--    the grant). append_late_answer / mark_late_answer_promoted additionally MUTATE
--    qualified_leads with no ownership check, so authenticated execute was a real escalation.
--    Revoked from PUBLIC, anon, authenticated for a clean end-state on any target DB.
-- ============================================================================
revoke execute on function public.append_late_answer(lead_id uuid, late_answer jsonb)        from public, anon, authenticated;
revoke execute on function public.mark_late_answer_promoted(lead_id uuid, answer_index integer) from public, anon, authenticated;
revoke execute on function public.get_available_agents(p_project_id uuid)                     from public, anon, authenticated;
revoke execute on function public.get_queue_position(p_conversation_id uuid)                  from public, anon, authenticated;
revoke execute on function public.get_project_role(p_project_id uuid, p_user_id uuid)         from public, anon, authenticated;
revoke execute on function public.has_project_access(p_project_id uuid, p_user_id uuid)       from public, anon, authenticated;
revoke execute on function public.is_project_agent(p_project_id uuid, p_user_id uuid)         from public, anon, authenticated;
revoke execute on function public.is_project_owner(p_project_id uuid, p_user_id uuid)         from public, anon, authenticated;

-- ============================================================================
-- 5) Pin search_path on the 18 first-party functions flagged
--    function_search_path_mutable (recrawl_replace_chunks already has it set).
--    Prevents search_path-hijack; required for SECURITY DEFINER functions especially.
-- ============================================================================
alter function public.append_late_answer(lead_id uuid, late_answer jsonb)                                                          set search_path = public, pg_temp;
alter function public.mark_late_answer_promoted(lead_id uuid, answer_index integer)                                                set search_path = public, pg_temp;
alter function public.get_available_agents(p_project_id uuid)                                                                      set search_path = public, pg_temp;
alter function public.get_queue_position(p_conversation_id uuid)                                                                   set search_path = public, pg_temp;
alter function public.get_project_role(p_project_id uuid, p_user_id uuid)                                                          set search_path = public, pg_temp;
alter function public.has_project_access(p_project_id uuid, p_user_id uuid)                                                        set search_path = public, pg_temp;
alter function public.is_project_agent(p_project_id uuid, p_user_id uuid)                                                          set search_path = public, pg_temp;
alter function public.is_project_owner(p_project_id uuid, p_user_id uuid)                                                          set search_path = public, pg_temp;
alter function public.get_user_by_api_key(p_key_hash text)                                                                         set search_path = public, pg_temp;
alter function public.fts_search_chunks(query_text text, match_count integer, p_project_id uuid)                                   set search_path = public, pg_temp;
alter function public.hybrid_search_chunks(query_embedding vector, query_text text, match_count integer, p_project_id uuid, vector_weight double precision) set search_path = public, pg_temp;
alter function public.match_knowledge_chunks(query_embedding vector, match_threshold double precision, match_count integer, p_project_id uuid) set search_path = public, pg_temp;
alter function public.check_domain_allowed(project_allowed_domains text[], request_domain text)                                    set search_path = public, pg_temp;
alter function public.increment_pulse_response_count()                                                                             set search_path = public, pg_temp;
alter function public.update_conversation_message_count()                                                                          set search_path = public, pg_temp;
alter function public.update_customer_conversation_count()                                                                         set search_path = public, pg_temp;
alter function public.update_source_chunk_count()                                                                                  set search_path = public, pg_temp;
alter function public.update_updated_at_column()                                                                                   set search_path = public, pg_temp;

-- ============================================================================
-- 6) Defense-in-depth for the public `assets` bucket (currently file_size_limit = null).
--    Cap upload size. allowed_mime_types is intentionally NOT set here: the bucket serves
--    the widget JS/CSS bundle plus tenant images, and a too-strict list would reject future
--    uploads. Set it only after confirming the deploy/upload Content-Types (see the commented
--    block) — tracked in docs/security/security-hardening-2026-06-26.md.
-- ============================================================================
update storage.buckets
set file_size_limit = coalesce(file_size_limit, 5242880) -- 5 MB
where id = 'assets';

-- After verifying upload Content-Types match, optionally run:
-- update storage.buckets
-- set allowed_mime_types = coalesce(allowed_mime_types, array[
--   'application/javascript','text/javascript','application/json','text/css',
--   'image/png','image/jpeg','image/webp','image/gif','image/svg+xml'
-- ]::text[])
-- where id = 'assets';

commit;
