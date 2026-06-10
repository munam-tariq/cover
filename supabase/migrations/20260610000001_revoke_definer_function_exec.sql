-- Security fix (Critical): anonymous knowledge extraction via SECURITY DEFINER RPCs.
--
-- fts_search_chunks / hybrid_search_chunks / match_knowledge_chunks are SECURITY DEFINER and
-- were executable by PUBLIC/anon/authenticated, so an anonymous RPC call could read any
-- tenant's knowledge_chunks content (even cross-tenant with p_project_id => NULL), bypassing
-- the RLS fix in 20260609000002_fix_anon_rls.sql. The API calls these exclusively through the
-- service-role client (apps/api/src/services/rag/retriever.ts); no browser code calls .rpc().
--
-- Knowledge search + API-key lookup become service-role only. The remaining SECURITY DEFINER
-- helpers lose anon/PUBLIC execute but keep `authenticated` because dashboard RLS policies
-- evaluate them (has_project_access etc.) under the querying user's role.

-- Service-role only -----------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.fts_search_chunks(query_text text, match_count integer, p_project_id uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.hybrid_search_chunks(query_embedding vector, query_text text, match_count integer, p_project_id uuid, vector_weight double precision)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.match_knowledge_chunks(query_embedding vector, match_threshold double precision, match_count integer, p_project_id uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_by_api_key(p_key_hash text)
  FROM PUBLIC, anon, authenticated;

-- No anonymous execution ------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.append_late_answer(lead_id uuid, late_answer jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_late_answer_promoted(lead_id uuid, answer_index integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_available_agents(p_project_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_queue_position(p_conversation_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_project_role(p_project_id uuid, p_user_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_project_access(p_project_id uuid, p_user_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_project_agent(p_project_id uuid, p_user_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_project_owner(p_project_id uuid, p_user_id uuid) FROM PUBLIC, anon;
