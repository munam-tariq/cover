-- ============================================
-- RAG v2 Migration: Hybrid Search Support
-- ============================================
-- This migration adds:
-- 1. Context column for contextual embeddings (Anthropic approach)
-- 2. FTS column for full-text search
-- 3. Hybrid search functions combining vector + FTS
--
-- Reference: https://www.anthropic.com/news/contextual-retrieval
-- ============================================

-- ============================================
-- STEP 1: Add new columns to knowledge_chunks
-- ============================================

-- Add context column for LLM-generated contextual description
ALTER TABLE knowledge_chunks
ADD COLUMN IF NOT EXISTS context TEXT;

-- Add FTS column for full-text search
ALTER TABLE knowledge_chunks
ADD COLUMN IF NOT EXISTS fts tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('english', COALESCE(context, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(content, '')), 'B')
) STORED;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_fts
ON knowledge_chunks USING GIN (fts);

-- ============================================
-- STEP 2: Hybrid Search Function
-- ============================================
-- Combines vector similarity search with full-text search
-- Uses configurable weights for each search type

CREATE OR REPLACE FUNCTION hybrid_search_chunks(
  query_embedding VECTOR(1536),
  query_text TEXT,
  match_count INT DEFAULT 10,
  p_project_id UUID DEFAULT NULL,
  vector_weight FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  source_id UUID,
  source_name TEXT,
  content TEXT,
  context TEXT,
  vector_score FLOAT,
  fts_score FLOAT,
  combined_score FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  fts_weight FLOAT := 1 - vector_weight;
  ts_query tsquery;
BEGIN
  -- Create tsquery from input (handle empty query)
  IF query_text IS NOT NULL AND query_text != '' THEN
    ts_query := plainto_tsquery('english', query_text);
  ELSE
    ts_query := NULL;
  END IF;

  RETURN QUERY
  WITH vector_results AS (
    -- Vector similarity search
    SELECT
      kc.id,
      kc.source_id,
      ks.name as source_name,
      kc.content,
      kc.context,
      kc.metadata,
      (1 - (kc.embedding <=> query_embedding)) AS v_score,
      ROW_NUMBER() OVER (ORDER BY kc.embedding <=> query_embedding) AS v_rank
    FROM knowledge_chunks kc
    JOIN knowledge_sources ks ON kc.source_id = ks.id
    WHERE ks.project_id = p_project_id
      AND ks.status = 'ready'
    ORDER BY kc.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  fts_results AS (
    -- Full-text search (only if query provided)
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
    -- Combine results using weighted scores
    SELECT
      COALESCE(v.id, f.id) AS id,
      COALESCE(v.source_id, f.source_id) AS source_id,
      COALESCE(v.source_name, f.source_name) AS source_name,
      COALESCE(v.content, f.content) AS content,
      COALESCE(v.context, f.context) AS context,
      COALESCE(v.metadata, f.metadata) AS metadata,
      COALESCE(v.v_score, 0) AS v_score,
      COALESCE(f.f_score, 0) AS f_score,
      -- Combined score: weighted sum (normalized FTS to 0-1 range)
      (COALESCE(v.v_score, 0) * vector_weight) +
      (LEAST(COALESCE(f.f_score, 0), 1.0) * fts_weight) AS c_score
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

-- ============================================
-- STEP 3: FTS-only Search Function
-- ============================================
-- For cases where we only want keyword matching

CREATE OR REPLACE FUNCTION fts_search_chunks(
  query_text TEXT,
  match_count INT DEFAULT 10,
  p_project_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  source_id UUID,
  source_name TEXT,
  content TEXT,
  context TEXT,
  fts_score FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  ts_query tsquery;
BEGIN
  -- Create tsquery from input
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

-- ============================================
-- STEP 4: Grant permissions
-- ============================================
-- Ensure service role can use these functions

GRANT EXECUTE ON FUNCTION hybrid_search_chunks TO service_role;
GRANT EXECUTE ON FUNCTION fts_search_chunks TO service_role;

-- ============================================
-- NOTES:
-- ============================================
-- After running this migration, you need to re-process existing
-- knowledge sources to populate the context and fts columns.
--
-- The context column should contain LLM-generated descriptions
-- that explain what each chunk is about. This significantly
-- improves retrieval accuracy (35-67% reduction in failures).
--
-- The fts column is automatically generated from context + content
-- using PostgreSQL's full-text search capabilities.
