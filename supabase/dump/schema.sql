


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";






CREATE OR REPLACE FUNCTION "public"."append_late_answer"("lead_id" "uuid", "late_answer" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE qualified_leads
  SET
    late_qualifying_answers = late_qualifying_answers || late_answer,
    updated_at = NOW()
  WHERE id = lead_id;
END;
$$;


ALTER FUNCTION "public"."append_late_answer"("lead_id" "uuid", "late_answer" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_domain_allowed"("project_allowed_domains" "text"[], "request_domain" "text") RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
  domain TEXT;
  pattern TEXT;
  normalized_request TEXT;
BEGIN
  -- Normalize request domain to lowercase
  normalized_request := lower(request_domain);

  -- If no domains configured, allow all (opt-in feature)
  IF project_allowed_domains IS NULL OR array_length(project_allowed_domains, 1) IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check each allowed domain
  FOREACH domain IN ARRAY project_allowed_domains LOOP
    -- Normalize allowed domain
    domain := lower(trim(domain));

    -- Exact match
    IF normalized_request = domain THEN
      RETURN TRUE;
    END IF;

    -- Auto-include www variant
    IF normalized_request = 'www.' || domain THEN
      RETURN TRUE;
    END IF;

    -- Wildcard match (*.example.com)
    IF domain LIKE '*.%' THEN
      pattern := substring(domain from 3); -- Remove '*.'
      -- Match exact base domain or any subdomain
      IF normalized_request = pattern OR normalized_request LIKE '%.' || pattern THEN
        RETURN TRUE;
      END IF;
    END IF;
  END LOOP;

  RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."check_domain_allowed"("project_allowed_domains" "text"[], "request_domain" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_domain_allowed"("project_allowed_domains" "text"[], "request_domain" "text") IS 'Check if a request domain is allowed for a project. Supports wildcards (*.example.com) and auto-includes www variant.';



CREATE OR REPLACE FUNCTION "public"."fts_search_chunks"("query_text" "text", "match_count" integer DEFAULT 10, "p_project_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "source_id" "uuid", "source_name" "text", "content" "text", "context" "text", "fts_score" real, "metadata" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  ts_query tsquery;
BEGIN
  ts_query := plainto_tsquery('english', query_text);

  RETURN QUERY
  SELECT
    kc.id,
    kc.source_id,
    ks.name as source_name,
    kc.content,
    kc.context,
    ts_rank_cd(kc.fts, ts_query) AS fts_score,
    kc.metadata
  FROM knowledge_chunks kc
  JOIN knowledge_sources ks ON kc.source_id = ks.id
  WHERE ks.project_id = p_project_id
    AND ks.status = 'ready'
    AND kc.fts @@ ts_query
  ORDER BY ts_rank_cd(kc.fts, ts_query) DESC
  LIMIT match_count;
END;
$$;


ALTER FUNCTION "public"."fts_search_chunks"("query_text" "text", "match_count" integer, "p_project_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_available_agents"("p_project_id" "uuid") RETURNS TABLE("user_id" "uuid", "current_chat_count" integer, "max_concurrent_chats" integer, "last_assigned_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$ BEGIN RETURN QUERY SELECT aa.user_id, aa.current_chat_count, aa.max_concurrent_chats, aa.last_assigned_at FROM agent_availability aa WHERE aa.project_id = p_project_id AND aa.status = 'online' AND aa.current_chat_count < aa.max_concurrent_chats ORDER BY aa.current_chat_count ASC, aa.last_assigned_at ASC NULLS FIRST; END; $$;


ALTER FUNCTION "public"."get_available_agents"("p_project_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_project_role"("p_project_id" "uuid", "p_user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$ DECLARE v_role TEXT; BEGIN IF EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND user_id = p_user_id) THEN RETURN 'owner'; END IF; SELECT role INTO v_role FROM project_members WHERE project_id = p_project_id AND user_id = p_user_id AND status = 'active'; RETURN COALESCE(v_role, NULL); END; $$;


ALTER FUNCTION "public"."get_project_role"("p_project_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_queue_position"("p_conversation_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$ DECLARE v_project_id UUID; v_queue_entered_at TIMESTAMPTZ; v_position INTEGER; BEGIN SELECT project_id, queue_entered_at INTO v_project_id, v_queue_entered_at FROM conversations WHERE id = p_conversation_id AND status = 'waiting'; IF v_queue_entered_at IS NULL THEN RETURN NULL; END IF; SELECT COUNT(*) + 1 INTO v_position FROM conversations WHERE project_id = v_project_id AND status = 'waiting' AND queue_entered_at < v_queue_entered_at; RETURN v_position; END; $$;


ALTER FUNCTION "public"."get_queue_position"("p_conversation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_by_api_key"("p_key_hash" "text") RETURNS TABLE("user_id" "uuid", "key_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Update last_used_at
  UPDATE api_keys
  SET last_used_at = NOW()
  WHERE key_hash = p_key_hash;

  -- Return user info
  RETURN QUERY
  SELECT ak.user_id, ak.id as key_id
  FROM api_keys ak
  WHERE ak.key_hash = p_key_hash;
END;
$$;


ALTER FUNCTION "public"."get_user_by_api_key"("p_key_hash" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_project_access"("p_project_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$ BEGIN RETURN is_project_owner(p_project_id, p_user_id) OR is_project_agent(p_project_id, p_user_id); END; $$;


ALTER FUNCTION "public"."has_project_access"("p_project_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hybrid_search_chunks"("query_embedding" "public"."vector", "query_text" "text", "match_count" integer DEFAULT 10, "p_project_id" "uuid" DEFAULT NULL::"uuid", "vector_weight" double precision DEFAULT 0.7) RETURNS TABLE("id" "uuid", "source_id" "uuid", "source_name" "text", "content" "text", "context" "text", "vector_score" real, "fts_score" real, "combined_score" real, "metadata" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  fts_weight FLOAT := 1 - vector_weight;
  ts_query tsquery;
BEGIN
  IF query_text IS NOT NULL AND query_text != '' THEN
    ts_query := plainto_tsquery('english', query_text);
  ELSE
    ts_query := NULL;
  END IF;

  RETURN QUERY
  WITH vector_results AS (
    SELECT
      kc.id,
      kc.source_id,
      ks.name as source_name,
      kc.content,
      kc.context,
      kc.metadata,
      (1 - (kc.embedding <=> query_embedding))::REAL AS v_score,
      ROW_NUMBER() OVER (ORDER BY kc.embedding <=> query_embedding) AS v_rank
    FROM knowledge_chunks kc
    JOIN knowledge_sources ks ON kc.source_id = ks.id
    WHERE ks.project_id = p_project_id
      AND ks.status = 'ready'
    ORDER BY kc.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  fts_results AS (
    SELECT
      kc.id,
      kc.source_id,
      ks.name as source_name,
      kc.content,
      kc.context,
      kc.metadata,
      CASE
        WHEN ts_query IS NOT NULL THEN ts_rank_cd(kc.fts, ts_query)
        ELSE 0
      END AS f_score,
      ROW_NUMBER() OVER (
        ORDER BY CASE
          WHEN ts_query IS NOT NULL THEN ts_rank_cd(kc.fts, ts_query)
          ELSE 0
        END DESC
      ) AS f_rank
    FROM knowledge_chunks kc
    JOIN knowledge_sources ks ON kc.source_id = ks.id
    WHERE ks.project_id = p_project_id
      AND ks.status = 'ready'
      AND (ts_query IS NULL OR kc.fts @@ ts_query)
    ORDER BY f_score DESC
    LIMIT match_count * 2
  ),
  combined AS (
    SELECT
      COALESCE(v.id, f.id) AS id,
      COALESCE(v.source_id, f.source_id) AS source_id,
      COALESCE(v.source_name, f.source_name) AS source_name,
      COALESCE(v.content, f.content) AS content,
      COALESCE(v.context, f.context) AS context,
      COALESCE(v.metadata, f.metadata) AS metadata,
      COALESCE(v.v_score, 0)::REAL AS v_score,
      COALESCE(f.f_score, 0)::REAL AS f_score,
      ((COALESCE(v.v_score, 0) * vector_weight) +
      (LEAST(COALESCE(f.f_score, 0), 1.0) * fts_weight))::REAL AS c_score
    FROM vector_results v
    FULL OUTER JOIN fts_results f ON v.id = f.id
  )
  SELECT
    c.id,
    c.source_id,
    c.source_name,
    c.content,
    c.context,
    c.v_score AS vector_score,
    c.f_score AS fts_score,
    c.c_score AS combined_score,
    c.metadata
  FROM combined c
  ORDER BY c.c_score DESC
  LIMIT match_count;
END;
$$;


ALTER FUNCTION "public"."hybrid_search_chunks"("query_embedding" "public"."vector", "query_text" "text", "match_count" integer, "p_project_id" "uuid", "vector_weight" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_pulse_response_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE pulse_campaigns
  SET response_count = response_count + 1
  WHERE id = NEW.campaign_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."increment_pulse_response_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_project_agent"("p_project_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$ BEGIN RETURN EXISTS (SELECT 1 FROM project_members WHERE project_id = p_project_id AND user_id = p_user_id AND status = 'active'); END; $$;


ALTER FUNCTION "public"."is_project_agent"("p_project_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_project_owner"("p_project_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$ BEGIN RETURN EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND user_id = p_user_id); END; $$;


ALTER FUNCTION "public"."is_project_owner"("p_project_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_late_answer_promoted"("lead_id" "uuid", "answer_index" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE qualified_leads
  SET
    late_qualifying_answers = jsonb_set(
      late_qualifying_answers,
      ARRAY[answer_index::text, 'promoted'],
      'true'::jsonb
    ),
    updated_at = NOW()
  WHERE id = lead_id;
END;
$$;


ALTER FUNCTION "public"."mark_late_answer_promoted"("lead_id" "uuid", "answer_index" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_knowledge_chunks"("query_embedding" "public"."vector", "match_threshold" double precision DEFAULT 0.7, "match_count" integer DEFAULT 5, "p_project_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "source_id" "uuid", "content" "text", "metadata" "jsonb", "similarity" double precision)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.source_id,
    kc.content,
    kc.metadata,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks kc
  JOIN knowledge_sources ks ON kc.source_id = ks.id
  WHERE ks.project_id = p_project_id
    AND ks.status = 'ready'
    AND 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


ALTER FUNCTION "public"."match_knowledge_chunks"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "p_project_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversation_message_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE conversations SET message_count = message_count + 1, last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_conversation_message_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_customer_conversation_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.customer_id IS NOT NULL THEN
        UPDATE customers SET total_conversations = total_conversations + 1, last_seen_at = NOW() WHERE id = NEW.customer_id;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_customer_conversation_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_source_chunk_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE knowledge_sources
    SET chunk_count = chunk_count + 1
    WHERE id = NEW.source_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE knowledge_sources
    SET chunk_count = chunk_count - 1
    WHERE id = OLD.source_id;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_source_chunk_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."agent_availability" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'offline'::"text" NOT NULL,
    "max_concurrent_chats" integer DEFAULT 5 NOT NULL,
    "current_chat_count" integer DEFAULT 0 NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_assigned_at" timestamp with time zone,
    "status_changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "auto_offline_enabled" boolean DEFAULT true NOT NULL,
    "auto_offline_minutes" integer DEFAULT 30 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "agent_availability_check" CHECK (("current_chat_count" <= "max_concurrent_chats")),
    CONSTRAINT "agent_availability_current_chat_count_check" CHECK (("current_chat_count" >= 0)),
    CONSTRAINT "agent_availability_status_check" CHECK (("status" = ANY (ARRAY['online'::"text", 'away'::"text", 'offline'::"text"])))
);


ALTER TABLE "public"."agent_availability" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."api_endpoints" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "url" "text" NOT NULL,
    "method" "text" DEFAULT 'GET'::"text" NOT NULL,
    "auth_type" "text" DEFAULT 'none'::"text" NOT NULL,
    "auth_config" "jsonb" DEFAULT '{}'::"jsonb",
    "headers" "jsonb" DEFAULT '{}'::"jsonb",
    "request_body_template" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "api_endpoints_auth_type_check" CHECK (("auth_type" = ANY (ARRAY['none'::"text", 'api_key'::"text", 'bearer'::"text", 'custom_header'::"text"]))),
    CONSTRAINT "api_endpoints_method_check" CHECK (("method" = ANY (ARRAY['GET'::"text", 'POST'::"text"])))
);


ALTER TABLE "public"."api_endpoints" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."api_keys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "key_hash" "text" NOT NULL,
    "key_prefix" "text" NOT NULL,
    "last_used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "revoked_at" timestamp with time zone
);


ALTER TABLE "public"."api_keys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "visitor_id" "text" NOT NULL,
    "messages" "jsonb"[] DEFAULT ARRAY[]::"jsonb"[],
    "message_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "source" "text" DEFAULT 'widget'::"text",
    "awaiting_email" boolean DEFAULT false,
    "last_message_at" timestamp with time zone DEFAULT "now"(),
    "pending_question" "text",
    "email_asked" boolean DEFAULT false,
    "is_voice" boolean DEFAULT false,
    "voice_duration_seconds" integer DEFAULT 0,
    CONSTRAINT "chat_sessions_source_check" CHECK (("source" = ANY (ARRAY['widget'::"text", 'playground'::"text", 'mcp'::"text", 'api'::"text", 'voice'::"text"])))
);


ALTER TABLE "public"."chat_sessions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."chat_sessions"."source" IS 'Source of the chat session: widget (embedded), playground (dashboard testing), mcp (AI assistant), api (direct API)';



COMMENT ON COLUMN "public"."chat_sessions"."awaiting_email" IS 'Whether the bot is waiting for user to provide email';



COMMENT ON COLUMN "public"."chat_sessions"."last_message_at" IS 'Timestamp of the last message for conversation timeout detection';



COMMENT ON COLUMN "public"."chat_sessions"."pending_question" IS 'The unanswered question we are capturing the lead for';



COMMENT ON COLUMN "public"."chat_sessions"."email_asked" IS 'Whether we have already asked for email in this session';



COMMENT ON COLUMN "public"."chat_sessions"."is_voice" IS 'Whether this session included voice interaction';



COMMENT ON COLUMN "public"."chat_sessions"."voice_duration_seconds" IS 'Total duration of voice calls in this session';



CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "customer_id" "uuid",
    "visitor_id" "text" NOT NULL,
    "customer_email" "text",
    "customer_name" "text",
    "customer_presence" "text" DEFAULT 'offline'::"text",
    "customer_last_seen_at" timestamp with time zone,
    "auto_close_warning_sent_at" timestamp with time zone,
    "status" "text" DEFAULT 'ai_active'::"text" NOT NULL,
    "assigned_agent_id" "uuid",
    "handoff_reason" "text",
    "handoff_triggered_at" timestamp with time zone,
    "ai_confidence_at_handoff" double precision,
    "trigger_keyword" "text",
    "queue_entered_at" timestamp with time zone,
    "queue_position" integer,
    "claimed_at" timestamp with time zone,
    "first_response_at" timestamp with time zone,
    "resolved_at" timestamp with time zone,
    "satisfaction_rating" integer,
    "satisfaction_feedback" "text",
    "source" "text" DEFAULT 'widget'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "awaiting_email" boolean DEFAULT false,
    "pending_question" "text",
    "email_asked" boolean DEFAULT false,
    "is_voice" boolean DEFAULT false,
    "voice_duration_seconds" integer DEFAULT 0,
    "message_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_message_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "handoff_requested_at" timestamp with time zone,
    "is_voice_call" boolean DEFAULT false,
    "voice_provider" "text",
    "voice_call_id" "text",
    "voice_cost" numeric(10,4),
    "voice_recording_url" "text",
    "voice_transcript" "jsonb",
    "voice_ended_reason" "text",
    CONSTRAINT "conversations_customer_presence_check" CHECK (("customer_presence" = ANY (ARRAY['online'::"text", 'idle'::"text", 'offline'::"text", 'typing'::"text"]))),
    CONSTRAINT "conversations_handoff_reason_check" CHECK ((("handoff_reason" IS NULL) OR ("handoff_reason" = ANY (ARRAY['low_confidence'::"text", 'keyword'::"text", 'customer_request'::"text", 'button_click'::"text"])))),
    CONSTRAINT "conversations_satisfaction_rating_check" CHECK ((("satisfaction_rating" IS NULL) OR (("satisfaction_rating" >= 1) AND ("satisfaction_rating" <= 5)))),
    CONSTRAINT "conversations_source_check" CHECK (("source" = ANY (ARRAY['widget'::"text", 'playground'::"text", 'mcp'::"text", 'api'::"text", 'voice'::"text"]))),
    CONSTRAINT "conversations_status_check" CHECK (("status" = ANY (ARRAY['ai_active'::"text", 'waiting'::"text", 'agent_active'::"text", 'resolved'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crawl_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "url" "text" NOT NULL,
    "domain" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "error" "text",
    "pages_found" integer DEFAULT 0,
    "pages_processed" integer DEFAULT 0,
    "pages_imported" integer DEFAULT 0,
    "pages_failed" integer DEFAULT 0,
    "total_words" integer DEFAULT 0,
    "total_chunks" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    CONSTRAINT "crawl_jobs_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'crawling'::"text", 'structuring'::"text", 'ready'::"text", 'importing'::"text", 'completed'::"text", 'failed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."crawl_jobs" OWNER TO "postgres";


COMMENT ON TABLE "public"."crawl_jobs" IS 'Tracks all website scrape/crawl attempts for auditing and debugging';



COMMENT ON COLUMN "public"."crawl_jobs"."status" IS 'Job status: pending -> crawling -> structuring -> ready -> importing -> completed/failed/cancelled';



COMMENT ON COLUMN "public"."crawl_jobs"."pages_found" IS 'Number of pages discovered by Firecrawl';



COMMENT ON COLUMN "public"."crawl_jobs"."pages_processed" IS 'Number of pages processed through content structuring';



COMMENT ON COLUMN "public"."crawl_jobs"."pages_imported" IS 'Number of pages successfully imported as knowledge sources';



COMMENT ON COLUMN "public"."crawl_jobs"."pages_failed" IS 'Number of pages that failed to import';



CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "visitor_id" "text" NOT NULL,
    "email" "text",
    "name" "text",
    "merged_visitor_ids" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "first_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "total_conversations" integer DEFAULT 0 NOT NULL,
    "last_browser" "text",
    "last_device" "text",
    "last_os" "text",
    "last_page_url" "text",
    "last_location" "text",
    "is_flagged" boolean DEFAULT false NOT NULL,
    "flag_reason" "text",
    "flagged_at" timestamp with time zone,
    "flagged_by" "uuid",
    "internal_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "lead_capture_state" "jsonb"
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."handoff_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "enabled" boolean DEFAULT false NOT NULL,
    "trigger_mode" "text" DEFAULT 'both'::"text" NOT NULL,
    "show_human_button" boolean DEFAULT false NOT NULL,
    "auto_triggers" "jsonb" DEFAULT '{"keywords": ["human", "agent", "person", "speak to someone", "talk to someone"], "keywords_enabled": true, "low_confidence_enabled": true, "low_confidence_threshold": 0.6}'::"jsonb" NOT NULL,
    "business_hours_enabled" boolean DEFAULT false NOT NULL,
    "timezone" "text" DEFAULT 'UTC'::"text" NOT NULL,
    "business_hours" "jsonb" DEFAULT '{"friday": {"end": "17:00", "start": "09:00", "enabled": true}, "monday": {"end": "17:00", "start": "09:00", "enabled": true}, "sunday": {"end": "17:00", "start": "09:00", "enabled": false}, "tuesday": {"end": "17:00", "start": "09:00", "enabled": true}, "saturday": {"end": "17:00", "start": "09:00", "enabled": false}, "thursday": {"end": "17:00", "start": "09:00", "enabled": true}, "wednesday": {"end": "17:00", "start": "09:00", "enabled": true}}'::"jsonb" NOT NULL,
    "default_max_concurrent_chats" integer DEFAULT 5 NOT NULL,
    "inactivity_timeout_minutes" integer DEFAULT 5 NOT NULL,
    "auto_close_after_warning_minutes" integer DEFAULT 5 NOT NULL,
    "session_keep_alive_minutes" integer DEFAULT 15 NOT NULL,
    "send_inactivity_warning" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "button_text" "text" DEFAULT 'Talk to a human'::"text" NOT NULL,
    "assignment_mode" "text" DEFAULT 'least_busy'::"text",
    "max_queue_size" integer DEFAULT 0,
    "queue_message" "text" DEFAULT 'Please wait while we connect you with an agent. You are number {position} in the queue.'::"text",
    "agent_joined_message" "text" DEFAULT 'You''re now connected with {agent_name}.'::"text",
    CONSTRAINT "handoff_settings_assignment_mode_check" CHECK (("assignment_mode" = ANY (ARRAY['least_busy'::"text", 'round_robin'::"text", 'manual'::"text"]))),
    CONSTRAINT "handoff_settings_trigger_mode_check" CHECK (("trigger_mode" = ANY (ARRAY['auto'::"text", 'manual'::"text", 'both'::"text"])))
);


ALTER TABLE "public"."handoff_settings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."handoff_settings"."button_text" IS 'Custom text for the "Talk to Human" button in widget';



COMMENT ON COLUMN "public"."handoff_settings"."assignment_mode" IS 'How conversations are assigned to agents: least_busy, round_robin, or manual';



COMMENT ON COLUMN "public"."handoff_settings"."max_queue_size" IS 'Maximum customers allowed in queue (0 = unlimited)';



COMMENT ON COLUMN "public"."handoff_settings"."queue_message" IS 'Message shown to customer while waiting. Use {position} for queue position';



COMMENT ON COLUMN "public"."handoff_settings"."agent_joined_message" IS 'Message shown when agent connects. Use {agent_name} for agent name';



CREATE TABLE IF NOT EXISTS "public"."knowledge_chunks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "embedding" "public"."vector"(1536) NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "context" "text",
    "fts" "tsvector" GENERATED ALWAYS AS (("setweight"("to_tsvector"('"english"'::"regconfig", COALESCE("context", ''::"text")), 'A'::"char") || "setweight"("to_tsvector"('"english"'::"regconfig", COALESCE("content", ''::"text")), 'B'::"char"))) STORED
);


ALTER TABLE "public"."knowledge_chunks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."knowledge_sources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "content" "text",
    "file_path" "text",
    "status" "text" DEFAULT 'processing'::"text" NOT NULL,
    "chunk_count" integer DEFAULT 0,
    "error" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "source_url" "text",
    "scraped_at" timestamp with time zone,
    "crawl_job_id" "uuid",
    CONSTRAINT "knowledge_sources_status_check" CHECK (("status" = ANY (ARRAY['processing'::"text", 'ready'::"text", 'failed'::"text"]))),
    CONSTRAINT "knowledge_sources_type_check" CHECK (("type" = ANY (ARRAY['text'::"text", 'file'::"text", 'pdf'::"text", 'url'::"text"])))
);


ALTER TABLE "public"."knowledge_sources" OWNER TO "postgres";


COMMENT ON COLUMN "public"."knowledge_sources"."source_url" IS 'Original URL for url-type knowledge sources';



COMMENT ON COLUMN "public"."knowledge_sources"."scraped_at" IS 'Timestamp when the URL was scraped';



COMMENT ON COLUMN "public"."knowledge_sources"."crawl_job_id" IS 'Links knowledge source to the crawl job that created it';



CREATE TABLE IF NOT EXISTS "public"."lead_captures" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "session_id" "uuid",
    "question" "text" NOT NULL,
    "user_email" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "notified_at" timestamp with time zone
);


ALTER TABLE "public"."lead_captures" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid",
    "conversation_id" "uuid" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "rating" "text" NOT NULL,
    "feedback_text" "text",
    "feedback_category" "text",
    "question_text" "text",
    "answer_text" "text",
    "visitor_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "message_feedback_feedback_category_check" CHECK ((("feedback_category" IS NULL) OR ("feedback_category" = ANY (ARRAY['wrong_answer'::"text", 'incomplete'::"text", 'confusing'::"text", 'outdated'::"text", 'other'::"text"])))),
    CONSTRAINT "message_feedback_rating_check" CHECK (("rating" = ANY (ARRAY['helpful'::"text", 'unhelpful'::"text"])))
);


ALTER TABLE "public"."message_feedback" OWNER TO "postgres";


COMMENT ON TABLE "public"."message_feedback" IS 'Stores thumbs up/down feedback on AI responses from chat widget users';



COMMENT ON COLUMN "public"."message_feedback"."rating" IS 'User rating: helpful (thumbs up) or unhelpful (thumbs down)';



COMMENT ON COLUMN "public"."message_feedback"."question_text" IS 'Denormalized copy of user question for analysis even if original message deleted';



COMMENT ON COLUMN "public"."message_feedback"."answer_text" IS 'Denormalized copy of AI response for analysis even if original message deleted';



COMMENT ON COLUMN "public"."message_feedback"."visitor_id" IS 'Anonymous visitor ID for deduplication without requiring authentication';



CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_type" "text" NOT NULL,
    "sender_id" "uuid",
    "content" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "messages_sender_type_check" CHECK (("sender_type" = ANY (ARRAY['customer'::"text", 'ai'::"text", 'agent'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "email" "text" NOT NULL,
    "role" "text" DEFAULT 'agent'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "invitation_token" "text",
    "invited_by" "uuid" NOT NULL,
    "invited_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "accepted_at" timestamp with time zone,
    "max_concurrent_chats" integer DEFAULT 5 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text",
    CONSTRAINT "project_members_role_check" CHECK (("role" = ANY (ARRAY['agent'::"text", 'admin'::"text"]))),
    CONSTRAINT "project_members_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'removed'::"text"])))
);


ALTER TABLE "public"."project_members" OWNER TO "postgres";


COMMENT ON COLUMN "public"."project_members"."name" IS 'Display name for the team member, captured during invitation';



CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" DEFAULT 'My Chatbot'::"text" NOT NULL,
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "voice_enabled" boolean DEFAULT false,
    "voice_greeting" "text" DEFAULT 'Hi! How can I help you today?'::"text",
    "voice_id" "text" DEFAULT 'aura-2-thalia-en'::"text",
    "use_new_conversations" boolean DEFAULT false,
    "allowed_domains" "text"[] DEFAULT '{}'::"text"[],
    "plan" "text" DEFAULT 'free'::"text" NOT NULL
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


COMMENT ON COLUMN "public"."projects"."deleted_at" IS 'Soft delete timestamp - when set, project is considered deleted';



COMMENT ON COLUMN "public"."projects"."voice_enabled" IS 'Whether voice chat is enabled for this project';



COMMENT ON COLUMN "public"."projects"."voice_greeting" IS 'Greeting message spoken when a voice call starts';



COMMENT ON COLUMN "public"."projects"."voice_id" IS 'Deepgram Aura-2 voice ID for TTS';



COMMENT ON COLUMN "public"."projects"."allowed_domains" IS 'Domains allowed to embed the chat widget. Empty array = allow all domains (default, no breaking change).';



COMMENT ON COLUMN "public"."projects"."plan" IS 'Subscription plan: free, pro. Controls feature gating (e.g. voice calls).';



CREATE TABLE IF NOT EXISTS "public"."pulse_campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "question" "text" NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "targeting" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "styling" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "response_count" integer DEFAULT 0 NOT NULL,
    "response_goal" integer,
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pulse_campaigns_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'active'::"text", 'paused'::"text", 'completed'::"text"]))),
    CONSTRAINT "pulse_campaigns_type_check" CHECK (("type" = ANY (ARRAY['nps'::"text", 'poll'::"text", 'sentiment'::"text", 'feedback'::"text"])))
);


ALTER TABLE "public"."pulse_campaigns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pulse_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "answer" "jsonb" NOT NULL,
    "page_url" "text",
    "visitor_id" "text",
    "session_id" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pulse_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pulse_summaries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "summary_text" "text" NOT NULL,
    "themes" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "response_count" integer NOT NULL,
    "generated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pulse_summaries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."qualified_leads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "customer_id" "uuid",
    "conversation_id" "uuid",
    "visitor_id" "text" NOT NULL,
    "email" "text" NOT NULL,
    "form_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "qualifying_answers" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "qualification_status" "text" DEFAULT 'form_completed'::"text" NOT NULL,
    "first_message" "text",
    "form_submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "qualification_completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "late_qualifying_answers" "jsonb" DEFAULT '[]'::"jsonb",
    CONSTRAINT "qualified_leads_qualification_status_check" CHECK (("qualification_status" = ANY (ARRAY['form_completed'::"text", 'qualifying'::"text", 'qualified'::"text", 'skipped'::"text"])))
);


ALTER TABLE "public"."qualified_leads" OWNER TO "postgres";


COMMENT ON COLUMN "public"."qualified_leads"."late_qualifying_answers" IS 'Array of answers captured later in conversation for skipped qualifying questions. Structure: [{question_index, question_text, answer, raw_message, confidence, capture_type, captured_at, promoted}]';



ALTER TABLE ONLY "public"."agent_availability"
    ADD CONSTRAINT "agent_availability_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_availability"
    ADD CONSTRAINT "agent_availability_user_id_project_id_key" UNIQUE ("user_id", "project_id");



ALTER TABLE ONLY "public"."api_endpoints"
    ADD CONSTRAINT "api_endpoints_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_sessions"
    ADD CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crawl_jobs"
    ADD CONSTRAINT "crawl_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_project_id_visitor_id_key" UNIQUE ("project_id", "visitor_id");



ALTER TABLE ONLY "public"."handoff_settings"
    ADD CONSTRAINT "handoff_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."handoff_settings"
    ADD CONSTRAINT "handoff_settings_project_id_key" UNIQUE ("project_id");



ALTER TABLE ONLY "public"."knowledge_chunks"
    ADD CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."knowledge_sources"
    ADD CONSTRAINT "knowledge_sources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_captures"
    ADD CONSTRAINT "lead_captures_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_feedback"
    ADD CONSTRAINT "message_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_invitation_token_key" UNIQUE ("invitation_token");



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_project_id_email_key" UNIQUE ("project_id", "email");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pulse_campaigns"
    ADD CONSTRAINT "pulse_campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pulse_responses"
    ADD CONSTRAINT "pulse_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pulse_summaries"
    ADD CONSTRAINT "pulse_summaries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qualified_leads"
    ADD CONSTRAINT "qualified_leads_pkey" PRIMARY KEY ("id");



CREATE INDEX "crawl_jobs_created_at_idx" ON "public"."crawl_jobs" USING "btree" ("created_at" DESC);



CREATE INDEX "crawl_jobs_domain_idx" ON "public"."crawl_jobs" USING "btree" ("domain");



CREATE INDEX "crawl_jobs_project_id_status_idx" ON "public"."crawl_jobs" USING "btree" ("project_id", "status");



CREATE INDEX "crawl_jobs_user_id_idx" ON "public"."crawl_jobs" USING "btree" ("user_id");



CREATE INDEX "idx_agent_availability_available" ON "public"."agent_availability" USING "btree" ("project_id") WHERE ("status" = 'online'::"text");



CREATE INDEX "idx_agent_availability_project_status" ON "public"."agent_availability" USING "btree" ("project_id", "status");



CREATE INDEX "idx_agent_availability_user" ON "public"."agent_availability" USING "btree" ("user_id");



CREATE INDEX "idx_api_endpoints_project_id" ON "public"."api_endpoints" USING "btree" ("project_id");



CREATE INDEX "idx_api_keys_key_hash" ON "public"."api_keys" USING "btree" ("key_hash");



CREATE INDEX "idx_api_keys_key_prefix_active" ON "public"."api_keys" USING "btree" ("key_prefix") WHERE ("revoked_at" IS NULL);



CREATE INDEX "idx_api_keys_user_id" ON "public"."api_keys" USING "btree" ("user_id");



CREATE INDEX "idx_api_keys_user_id_active" ON "public"."api_keys" USING "btree" ("user_id") WHERE ("revoked_at" IS NULL);



CREATE INDEX "idx_chat_sessions_awaiting" ON "public"."chat_sessions" USING "btree" ("project_id", "awaiting_email") WHERE ("awaiting_email" = true);



CREATE INDEX "idx_chat_sessions_created_at" ON "public"."chat_sessions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_chat_sessions_project_id" ON "public"."chat_sessions" USING "btree" ("project_id");



CREATE INDEX "idx_chat_sessions_visitor_id" ON "public"."chat_sessions" USING "btree" ("visitor_id");



CREATE INDEX "idx_chat_sessions_voice" ON "public"."chat_sessions" USING "btree" ("project_id", "is_voice") WHERE ("is_voice" = true);



CREATE INDEX "idx_conversations_assigned_agent" ON "public"."conversations" USING "btree" ("assigned_agent_id") WHERE ("assigned_agent_id" IS NOT NULL);



CREATE INDEX "idx_conversations_customer" ON "public"."conversations" USING "btree" ("customer_id") WHERE ("customer_id" IS NOT NULL);



CREATE INDEX "idx_conversations_last_message" ON "public"."conversations" USING "btree" ("project_id", "last_message_at" DESC);



CREATE INDEX "idx_conversations_project_status" ON "public"."conversations" USING "btree" ("project_id", "status");



CREATE INDEX "idx_conversations_visitor" ON "public"."conversations" USING "btree" ("project_id", "visitor_id");



CREATE INDEX "idx_conversations_voice_call_id" ON "public"."conversations" USING "btree" ("voice_call_id") WHERE ("voice_call_id" IS NOT NULL);



CREATE INDEX "idx_conversations_voice_project" ON "public"."conversations" USING "btree" ("project_id", "is_voice_call") WHERE ("is_voice_call" = true);



CREATE INDEX "idx_conversations_waiting_queue" ON "public"."conversations" USING "btree" ("project_id", "queue_entered_at") WHERE ("status" = 'waiting'::"text");



CREATE INDEX "idx_customers_flagged" ON "public"."customers" USING "btree" ("project_id", "is_flagged") WHERE ("is_flagged" = true);



CREATE INDEX "idx_customers_lead_state" ON "public"."customers" USING "btree" ("project_id") WHERE ("lead_capture_state" IS NOT NULL);



CREATE INDEX "idx_customers_project_email" ON "public"."customers" USING "btree" ("project_id", "email") WHERE ("email" IS NOT NULL);



CREATE UNIQUE INDEX "idx_customers_project_email_unique" ON "public"."customers" USING "btree" ("project_id", "email") WHERE ("email" IS NOT NULL);



CREATE INDEX "idx_customers_project_last_seen" ON "public"."customers" USING "btree" ("project_id", "last_seen_at" DESC);



CREATE INDEX "idx_customers_project_visitor" ON "public"."customers" USING "btree" ("project_id", "visitor_id");



CREATE INDEX "idx_handoff_settings_project" ON "public"."handoff_settings" USING "btree" ("project_id");



CREATE INDEX "idx_knowledge_chunks_embedding_hnsw" ON "public"."knowledge_chunks" USING "hnsw" ("embedding" "public"."vector_cosine_ops") WITH ("m"='16', "ef_construction"='64');



COMMENT ON INDEX "public"."idx_knowledge_chunks_embedding_hnsw" IS 'HNSW index for fast vector similarity search. Reduces query time from O(n) to O(log n).';



CREATE INDEX "idx_knowledge_chunks_fts" ON "public"."knowledge_chunks" USING "gin" ("fts");



CREATE INDEX "idx_knowledge_chunks_source_id" ON "public"."knowledge_chunks" USING "btree" ("source_id");



CREATE INDEX "idx_knowledge_sources_project_id" ON "public"."knowledge_sources" USING "btree" ("project_id");



CREATE INDEX "idx_knowledge_sources_status" ON "public"."knowledge_sources" USING "btree" ("status");



CREATE INDEX "idx_lead_captures_created" ON "public"."lead_captures" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_lead_captures_pending" ON "public"."lead_captures" USING "btree" ("project_id") WHERE ("notified_at" IS NULL);



CREATE INDEX "idx_lead_captures_project" ON "public"."lead_captures" USING "btree" ("project_id");



CREATE INDEX "idx_message_feedback_conversation" ON "public"."message_feedback" USING "btree" ("conversation_id");



CREATE INDEX "idx_message_feedback_created" ON "public"."message_feedback" USING "btree" ("project_id", "created_at" DESC);



CREATE INDEX "idx_message_feedback_message" ON "public"."message_feedback" USING "btree" ("message_id");



CREATE INDEX "idx_message_feedback_project" ON "public"."message_feedback" USING "btree" ("project_id");



CREATE INDEX "idx_message_feedback_project_rating" ON "public"."message_feedback" USING "btree" ("project_id", "rating");



CREATE UNIQUE INDEX "idx_message_feedback_unique_with_message" ON "public"."message_feedback" USING "btree" ("message_id", "visitor_id") WHERE ("message_id" IS NOT NULL);



CREATE UNIQUE INDEX "idx_message_feedback_unique_without_message" ON "public"."message_feedback" USING "btree" ("conversation_id", "visitor_id", "md5"(COALESCE("answer_text", ''::"text"))) WHERE ("message_id" IS NULL);



CREATE INDEX "idx_messages_conversation" ON "public"."messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_messages_conversation_created" ON "public"."messages" USING "btree" ("conversation_id", "created_at");



CREATE INDEX "idx_project_members_email" ON "public"."project_members" USING "btree" ("email");



CREATE INDEX "idx_project_members_pending" ON "public"."project_members" USING "btree" ("project_id", "status") WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_project_members_project" ON "public"."project_members" USING "btree" ("project_id");



CREATE INDEX "idx_project_members_token" ON "public"."project_members" USING "btree" ("invitation_token") WHERE ("invitation_token" IS NOT NULL);



CREATE INDEX "idx_project_members_user" ON "public"."project_members" USING "btree" ("user_id") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "idx_projects_allowed_domains" ON "public"."projects" USING "gin" ("allowed_domains");



CREATE INDEX "idx_projects_user_active" ON "public"."projects" USING "btree" ("user_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_projects_user_id" ON "public"."projects" USING "btree" ("user_id");



CREATE INDEX "idx_pulse_campaigns_active" ON "public"."pulse_campaigns" USING "btree" ("project_id", "starts_at", "ends_at") WHERE ("status" = 'active'::"text");



CREATE INDEX "idx_pulse_campaigns_project" ON "public"."pulse_campaigns" USING "btree" ("project_id");



CREATE INDEX "idx_pulse_campaigns_project_status" ON "public"."pulse_campaigns" USING "btree" ("project_id", "status");



CREATE INDEX "idx_pulse_responses_campaign" ON "public"."pulse_responses" USING "btree" ("campaign_id");



CREATE INDEX "idx_pulse_responses_campaign_created" ON "public"."pulse_responses" USING "btree" ("campaign_id", "created_at" DESC);



CREATE INDEX "idx_pulse_responses_project" ON "public"."pulse_responses" USING "btree" ("project_id");



CREATE INDEX "idx_pulse_responses_visitor" ON "public"."pulse_responses" USING "btree" ("campaign_id", "visitor_id");



CREATE INDEX "idx_pulse_summaries_campaign" ON "public"."pulse_summaries" USING "btree" ("campaign_id");



CREATE INDEX "idx_pulse_summaries_latest" ON "public"."pulse_summaries" USING "btree" ("campaign_id", "generated_at" DESC);



CREATE INDEX "idx_qualified_leads_project" ON "public"."qualified_leads" USING "btree" ("project_id");



CREATE INDEX "idx_qualified_leads_project_created" ON "public"."qualified_leads" USING "btree" ("project_id", "created_at" DESC);



CREATE INDEX "idx_qualified_leads_status" ON "public"."qualified_leads" USING "btree" ("project_id", "qualification_status");



CREATE INDEX "knowledge_sources_crawl_job_id_idx" ON "public"."knowledge_sources" USING "btree" ("crawl_job_id");



CREATE OR REPLACE TRIGGER "api_endpoints_updated_at" BEFORE UPDATE ON "public"."api_endpoints" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "chat_sessions_updated_at" BEFORE UPDATE ON "public"."chat_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "projects_updated_at" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "pulse_response_count_increment" AFTER INSERT ON "public"."pulse_responses" FOR EACH ROW EXECUTE FUNCTION "public"."increment_pulse_response_count"();



CREATE OR REPLACE TRIGGER "update_agent_availability_updated_at" BEFORE UPDATE ON "public"."agent_availability" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_chunk_count" AFTER INSERT OR DELETE ON "public"."knowledge_chunks" FOR EACH ROW EXECUTE FUNCTION "public"."update_source_chunk_count"();



CREATE OR REPLACE TRIGGER "update_conversations_updated_at" BEFORE UPDATE ON "public"."conversations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_customer_stats_on_conversation" AFTER INSERT ON "public"."conversations" FOR EACH ROW EXECUTE FUNCTION "public"."update_customer_conversation_count"();



CREATE OR REPLACE TRIGGER "update_customers_updated_at" BEFORE UPDATE ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_handoff_settings_updated_at" BEFORE UPDATE ON "public"."handoff_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_message_count_on_insert" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_conversation_message_count"();



CREATE OR REPLACE TRIGGER "update_project_members_updated_at" BEFORE UPDATE ON "public"."project_members" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_pulse_campaigns_updated_at" BEFORE UPDATE ON "public"."pulse_campaigns" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."agent_availability"
    ADD CONSTRAINT "agent_availability_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_availability"
    ADD CONSTRAINT "agent_availability_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."api_endpoints"
    ADD CONSTRAINT "api_endpoints_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_sessions"
    ADD CONSTRAINT "chat_sessions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_assigned_agent_id_fkey" FOREIGN KEY ("assigned_agent_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crawl_jobs"
    ADD CONSTRAINT "crawl_jobs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crawl_jobs"
    ADD CONSTRAINT "crawl_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_flagged_by_fkey" FOREIGN KEY ("flagged_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_feedback"
    ADD CONSTRAINT "fk_message_feedback_message" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."handoff_settings"
    ADD CONSTRAINT "handoff_settings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."knowledge_chunks"
    ADD CONSTRAINT "knowledge_chunks_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."knowledge_sources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."knowledge_sources"
    ADD CONSTRAINT "knowledge_sources_crawl_job_id_fkey" FOREIGN KEY ("crawl_job_id") REFERENCES "public"."crawl_jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."knowledge_sources"
    ADD CONSTRAINT "knowledge_sources_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead_captures"
    ADD CONSTRAINT "lead_captures_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead_captures"
    ADD CONSTRAINT "lead_captures_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."message_feedback"
    ADD CONSTRAINT "message_feedback_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_feedback"
    ADD CONSTRAINT "message_feedback_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulse_campaigns"
    ADD CONSTRAINT "pulse_campaigns_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulse_responses"
    ADD CONSTRAINT "pulse_responses_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."pulse_campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulse_responses"
    ADD CONSTRAINT "pulse_responses_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulse_summaries"
    ADD CONSTRAINT "pulse_summaries_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."pulse_campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."qualified_leads"
    ADD CONSTRAINT "qualified_leads_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."qualified_leads"
    ADD CONSTRAINT "qualified_leads_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."qualified_leads"
    ADD CONSTRAINT "qualified_leads_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



CREATE POLICY "Anyone can submit pulse responses" ON "public"."pulse_responses" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Public can read api endpoints" ON "public"."api_endpoints" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Public can read projects by ID" ON "public"."projects" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Public can read ready knowledge sources" ON "public"."knowledge_sources" FOR SELECT TO "anon" USING (("status" = 'ready'::"text"));



CREATE POLICY "Service role can insert leads" ON "public"."lead_captures" FOR INSERT WITH CHECK (true);



CREATE POLICY "Service role can manage chat sessions" ON "public"."chat_sessions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage knowledge chunks" ON "public"."knowledge_chunks" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage knowledge sources" ON "public"."knowledge_sources" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage leads" ON "public"."qualified_leads" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can update leads" ON "public"."lead_captures" FOR UPDATE USING (true);



CREATE POLICY "Service role full access to campaigns" ON "public"."pulse_campaigns" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access to responses" ON "public"."pulse_responses" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access to summaries" ON "public"."pulse_summaries" USING (true) WITH CHECK (true);



CREATE POLICY "Users can create crawl jobs for their projects" ON "public"."crawl_jobs" FOR INSERT WITH CHECK (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"())
UNION
 SELECT "project_members"."project_id"
   FROM "public"."project_members"
  WHERE (("project_members"."user_id" = "auth"."uid"()) AND ("project_members"."status" = 'active'::"text")))));



CREATE POLICY "Users can delete own api endpoints" ON "public"."api_endpoints" FOR DELETE USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete own api keys" ON "public"."api_keys" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own knowledge chunks" ON "public"."knowledge_chunks" FOR DELETE USING (("source_id" IN ( SELECT "ks"."id"
   FROM ("public"."knowledge_sources" "ks"
     JOIN "public"."projects" "p" ON (("ks"."project_id" = "p"."id")))
  WHERE ("p"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete own knowledge sources" ON "public"."knowledge_sources" FOR DELETE USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete own project campaigns" ON "public"."pulse_campaigns" FOR DELETE USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete own projects" ON "public"."projects" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own api endpoints" ON "public"."api_endpoints" FOR INSERT WITH CHECK (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert own api keys" ON "public"."api_keys" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own chat sessions" ON "public"."chat_sessions" FOR INSERT WITH CHECK (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert own knowledge chunks" ON "public"."knowledge_chunks" FOR INSERT WITH CHECK (("source_id" IN ( SELECT "ks"."id"
   FROM ("public"."knowledge_sources" "ks"
     JOIN "public"."projects" "p" ON (("ks"."project_id" = "p"."id")))
  WHERE ("p"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert own knowledge sources" ON "public"."knowledge_sources" FOR INSERT WITH CHECK (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert own project campaigns" ON "public"."pulse_campaigns" FOR INSERT WITH CHECK (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert own projects" ON "public"."projects" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own project campaigns" ON "public"."pulse_campaigns" FOR SELECT USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can read own project leads" ON "public"."qualified_leads" FOR SELECT USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can read own project responses" ON "public"."pulse_responses" FOR SELECT USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can read own project summaries" ON "public"."pulse_summaries" FOR SELECT USING (("campaign_id" IN ( SELECT "pulse_campaigns"."id"
   FROM "public"."pulse_campaigns"
  WHERE ("pulse_campaigns"."project_id" IN ( SELECT "projects"."id"
           FROM "public"."projects"
          WHERE ("projects"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can update crawl jobs for their projects" ON "public"."crawl_jobs" FOR UPDATE USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"())
UNION
 SELECT "project_members"."project_id"
   FROM "public"."project_members"
  WHERE (("project_members"."user_id" = "auth"."uid"()) AND ("project_members"."status" = 'active'::"text")))));



CREATE POLICY "Users can update own api endpoints" ON "public"."api_endpoints" FOR UPDATE USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update own chat sessions" ON "public"."chat_sessions" FOR UPDATE USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update own knowledge sources" ON "public"."knowledge_sources" FOR UPDATE USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update own project campaigns" ON "public"."pulse_campaigns" FOR UPDATE USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update own projects" ON "public"."projects" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view crawl jobs for their projects" ON "public"."crawl_jobs" FOR SELECT USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"())
UNION
 SELECT "project_members"."project_id"
   FROM "public"."project_members"
  WHERE (("project_members"."user_id" = "auth"."uid"()) AND ("project_members"."status" = 'active'::"text")))));



CREATE POLICY "Users can view own api endpoints" ON "public"."api_endpoints" FOR SELECT USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view own api keys" ON "public"."api_keys" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own chat sessions" ON "public"."chat_sessions" FOR SELECT USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view own knowledge chunks" ON "public"."knowledge_chunks" FOR SELECT USING (("source_id" IN ( SELECT "ks"."id"
   FROM ("public"."knowledge_sources" "ks"
     JOIN "public"."projects" "p" ON (("ks"."project_id" = "p"."id")))
  WHERE ("p"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view own knowledge sources" ON "public"."knowledge_sources" FOR SELECT USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view own projects" ON "public"."projects" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their project leads" ON "public"."lead_captures" FOR SELECT USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."agent_availability" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "agent_availability_insert_self" ON "public"."agent_availability" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "agent_availability_select_owner" ON "public"."agent_availability" FOR SELECT USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "agent_availability_select_self" ON "public"."agent_availability" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "agent_availability_select_team" ON "public"."agent_availability" FOR SELECT USING (("project_id" IN ( SELECT "project_members"."project_id"
   FROM "public"."project_members"
  WHERE (("project_members"."user_id" = "auth"."uid"()) AND ("project_members"."status" = 'active'::"text")))));



CREATE POLICY "agent_availability_update_self" ON "public"."agent_availability" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "anyone_can_submit_feedback" ON "public"."message_feedback" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



ALTER TABLE "public"."api_endpoints" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."api_keys" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "conversations_insert_owner" ON "public"."conversations" FOR INSERT WITH CHECK (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "conversations_select_agent" ON "public"."conversations" FOR SELECT USING (("project_id" IN ( SELECT "project_members"."project_id"
   FROM "public"."project_members"
  WHERE (("project_members"."user_id" = "auth"."uid"()) AND ("project_members"."status" = 'active'::"text")))));



CREATE POLICY "conversations_select_owner" ON "public"."conversations" FOR SELECT USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "conversations_update_agent" ON "public"."conversations" FOR UPDATE USING (("project_id" IN ( SELECT "project_members"."project_id"
   FROM "public"."project_members"
  WHERE (("project_members"."user_id" = "auth"."uid"()) AND ("project_members"."status" = 'active'::"text")))));



CREATE POLICY "conversations_update_owner" ON "public"."conversations" FOR UPDATE USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."crawl_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customers_insert_owner" ON "public"."customers" FOR INSERT WITH CHECK (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "customers_select_agent" ON "public"."customers" FOR SELECT USING (("project_id" IN ( SELECT "project_members"."project_id"
   FROM "public"."project_members"
  WHERE (("project_members"."user_id" = "auth"."uid"()) AND ("project_members"."status" = 'active'::"text")))));



CREATE POLICY "customers_select_owner" ON "public"."customers" FOR SELECT USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "customers_update_agent" ON "public"."customers" FOR UPDATE USING (("project_id" IN ( SELECT "project_members"."project_id"
   FROM "public"."project_members"
  WHERE (("project_members"."user_id" = "auth"."uid"()) AND ("project_members"."status" = 'active'::"text")))));



CREATE POLICY "customers_update_owner" ON "public"."customers" FOR UPDATE USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."handoff_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "handoff_settings_insert_owner" ON "public"."handoff_settings" FOR INSERT WITH CHECK (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "handoff_settings_select_agent" ON "public"."handoff_settings" FOR SELECT USING (("project_id" IN ( SELECT "project_members"."project_id"
   FROM "public"."project_members"
  WHERE (("project_members"."user_id" = "auth"."uid"()) AND ("project_members"."status" = 'active'::"text")))));



CREATE POLICY "handoff_settings_select_owner" ON "public"."handoff_settings" FOR SELECT USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "handoff_settings_update_owner" ON "public"."handoff_settings" FOR UPDATE USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."knowledge_chunks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."knowledge_sources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lead_captures" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "messages_insert_agent" ON "public"."messages" FOR INSERT WITH CHECK (("conversation_id" IN ( SELECT "conversations"."id"
   FROM "public"."conversations"
  WHERE ("conversations"."project_id" IN ( SELECT "project_members"."project_id"
           FROM "public"."project_members"
          WHERE (("project_members"."user_id" = "auth"."uid"()) AND ("project_members"."status" = 'active'::"text")))))));



CREATE POLICY "messages_insert_owner" ON "public"."messages" FOR INSERT WITH CHECK (("conversation_id" IN ( SELECT "conversations"."id"
   FROM "public"."conversations"
  WHERE ("conversations"."project_id" IN ( SELECT "projects"."id"
           FROM "public"."projects"
          WHERE ("projects"."user_id" = "auth"."uid"()))))));



CREATE POLICY "messages_select_agent" ON "public"."messages" FOR SELECT USING (("conversation_id" IN ( SELECT "conversations"."id"
   FROM "public"."conversations"
  WHERE ("conversations"."project_id" IN ( SELECT "project_members"."project_id"
           FROM "public"."project_members"
          WHERE (("project_members"."user_id" = "auth"."uid"()) AND ("project_members"."status" = 'active'::"text")))))));



CREATE POLICY "messages_select_owner" ON "public"."messages" FOR SELECT USING (("conversation_id" IN ( SELECT "conversations"."id"
   FROM "public"."conversations"
  WHERE ("conversations"."project_id" IN ( SELECT "projects"."id"
           FROM "public"."projects"
          WHERE ("projects"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."project_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "project_members_can_view_feedback" ON "public"."message_feedback" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."project_members" "pm"
  WHERE (("pm"."project_id" = "message_feedback"."project_id") AND ("pm"."user_id" = "auth"."uid"())))));



CREATE POLICY "project_members_delete_owner" ON "public"."project_members" FOR DELETE USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "project_members_insert_owner" ON "public"."project_members" FOR INSERT WITH CHECK (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "project_members_select_owner" ON "public"."project_members" FOR SELECT USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "project_members_select_self" ON "public"."project_members" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "project_members_update_owner" ON "public"."project_members" FOR UPDATE USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pulse_campaigns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pulse_responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pulse_summaries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."qualified_leads" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_role_agent_availability" ON "public"."agent_availability" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_conversations" ON "public"."conversations" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_customers" ON "public"."customers" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_full_access" ON "public"."message_feedback" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_handoff_settings" ON "public"."handoff_settings" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_messages" ON "public"."messages" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_project_members" ON "public"."project_members" TO "service_role" USING (true) WITH CHECK (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."append_late_answer"("lead_id" "uuid", "late_answer" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."append_late_answer"("lead_id" "uuid", "late_answer" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."append_late_answer"("lead_id" "uuid", "late_answer" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_domain_allowed"("project_allowed_domains" "text"[], "request_domain" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_domain_allowed"("project_allowed_domains" "text"[], "request_domain" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_domain_allowed"("project_allowed_domains" "text"[], "request_domain" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."fts_search_chunks"("query_text" "text", "match_count" integer, "p_project_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fts_search_chunks"("query_text" "text", "match_count" integer, "p_project_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fts_search_chunks"("query_text" "text", "match_count" integer, "p_project_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_available_agents"("p_project_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_available_agents"("p_project_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_available_agents"("p_project_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_project_role"("p_project_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_project_role"("p_project_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_project_role"("p_project_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_queue_position"("p_conversation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_queue_position"("p_conversation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_queue_position"("p_conversation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_by_api_key"("p_key_hash" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_by_api_key"("p_key_hash" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_by_api_key"("p_key_hash" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."has_project_access"("p_project_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_project_access"("p_project_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_project_access"("p_project_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hybrid_search_chunks"("query_embedding" "public"."vector", "query_text" "text", "match_count" integer, "p_project_id" "uuid", "vector_weight" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."hybrid_search_chunks"("query_embedding" "public"."vector", "query_text" "text", "match_count" integer, "p_project_id" "uuid", "vector_weight" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hybrid_search_chunks"("query_embedding" "public"."vector", "query_text" "text", "match_count" integer, "p_project_id" "uuid", "vector_weight" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_pulse_response_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_pulse_response_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_pulse_response_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_project_agent"("p_project_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_project_agent"("p_project_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_project_agent"("p_project_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_project_owner"("p_project_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_project_owner"("p_project_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_project_owner"("p_project_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_late_answer_promoted"("lead_id" "uuid", "answer_index" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."mark_late_answer_promoted"("lead_id" "uuid", "answer_index" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_late_answer_promoted"("lead_id" "uuid", "answer_index" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_knowledge_chunks"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "p_project_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."match_knowledge_chunks"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "p_project_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_knowledge_chunks"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "p_project_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conversation_message_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_conversation_message_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversation_message_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_customer_conversation_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_customer_conversation_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_customer_conversation_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_source_chunk_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_source_chunk_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_source_chunk_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "service_role";












GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "service_role";









GRANT ALL ON TABLE "public"."agent_availability" TO "anon";
GRANT ALL ON TABLE "public"."agent_availability" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_availability" TO "service_role";



GRANT ALL ON TABLE "public"."api_endpoints" TO "anon";
GRANT ALL ON TABLE "public"."api_endpoints" TO "authenticated";
GRANT ALL ON TABLE "public"."api_endpoints" TO "service_role";



GRANT ALL ON TABLE "public"."api_keys" TO "anon";
GRANT ALL ON TABLE "public"."api_keys" TO "authenticated";
GRANT ALL ON TABLE "public"."api_keys" TO "service_role";



GRANT ALL ON TABLE "public"."chat_sessions" TO "anon";
GRANT ALL ON TABLE "public"."chat_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."crawl_jobs" TO "anon";
GRANT ALL ON TABLE "public"."crawl_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."crawl_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."handoff_settings" TO "anon";
GRANT ALL ON TABLE "public"."handoff_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."handoff_settings" TO "service_role";



GRANT ALL ON TABLE "public"."knowledge_chunks" TO "anon";
GRANT ALL ON TABLE "public"."knowledge_chunks" TO "authenticated";
GRANT ALL ON TABLE "public"."knowledge_chunks" TO "service_role";



GRANT ALL ON TABLE "public"."knowledge_sources" TO "anon";
GRANT ALL ON TABLE "public"."knowledge_sources" TO "authenticated";
GRANT ALL ON TABLE "public"."knowledge_sources" TO "service_role";



GRANT ALL ON TABLE "public"."lead_captures" TO "anon";
GRANT ALL ON TABLE "public"."lead_captures" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_captures" TO "service_role";



GRANT ALL ON TABLE "public"."message_feedback" TO "anon";
GRANT ALL ON TABLE "public"."message_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."message_feedback" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."project_members" TO "anon";
GRANT ALL ON TABLE "public"."project_members" TO "authenticated";
GRANT ALL ON TABLE "public"."project_members" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."pulse_campaigns" TO "anon";
GRANT ALL ON TABLE "public"."pulse_campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."pulse_campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."pulse_responses" TO "anon";
GRANT ALL ON TABLE "public"."pulse_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."pulse_responses" TO "service_role";



GRANT ALL ON TABLE "public"."pulse_summaries" TO "anon";
GRANT ALL ON TABLE "public"."pulse_summaries" TO "authenticated";
GRANT ALL ON TABLE "public"."pulse_summaries" TO "service_role";



GRANT ALL ON TABLE "public"."qualified_leads" TO "anon";
GRANT ALL ON TABLE "public"."qualified_leads" TO "authenticated";
GRANT ALL ON TABLE "public"."qualified_leads" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































