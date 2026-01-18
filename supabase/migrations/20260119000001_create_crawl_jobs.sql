-- Migration: Create crawl_jobs table
-- Purpose: Track all scrape/crawl attempts in the database for auditing and debugging
--
-- This allows us to:
-- 1. Know who tried to scrape what URLs
-- 2. Debug failed crawls
-- 3. Track usage for analytics
-- 4. Persist job state across server restarts

-- ============================================================================
-- 1. CREATE CRAWL_JOBS TABLE
-- ============================================================================

CREATE TABLE crawl_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Job info
  url TEXT NOT NULL,
  domain TEXT NOT NULL,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'crawling', 'structuring', 'ready', 'importing', 'completed', 'failed', 'cancelled')),
  error TEXT,

  -- Progress metrics
  pages_found INTEGER DEFAULT 0,
  pages_processed INTEGER DEFAULT 0,
  pages_imported INTEGER DEFAULT 0,
  pages_failed INTEGER DEFAULT 0,
  total_words INTEGER DEFAULT 0,
  total_chunks INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================

CREATE INDEX crawl_jobs_project_id_status_idx ON crawl_jobs(project_id, status);
CREATE INDEX crawl_jobs_user_id_idx ON crawl_jobs(user_id);
CREATE INDEX crawl_jobs_created_at_idx ON crawl_jobs(created_at DESC);
CREATE INDEX crawl_jobs_domain_idx ON crawl_jobs(domain);

-- ============================================================================
-- 3. ADD CRAWL_JOB_ID TO KNOWLEDGE_SOURCES
-- ============================================================================

ALTER TABLE knowledge_sources
ADD COLUMN crawl_job_id UUID REFERENCES crawl_jobs(id) ON DELETE SET NULL;

CREATE INDEX knowledge_sources_crawl_job_id_idx ON knowledge_sources(crawl_job_id);

-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE crawl_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view crawl jobs for projects they have access to
CREATE POLICY "Users can view crawl jobs for their projects"
  ON crawl_jobs FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Policy: Users can insert crawl jobs for projects they own or are members of
CREATE POLICY "Users can create crawl jobs for their projects"
  ON crawl_jobs FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Policy: Users can update crawl jobs for projects they have access to
CREATE POLICY "Users can update crawl jobs for their projects"
  ON crawl_jobs FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- ============================================================================
-- 5. COMMENTS
-- ============================================================================

COMMENT ON TABLE crawl_jobs IS 'Tracks all website scrape/crawl attempts for auditing and debugging';
COMMENT ON COLUMN crawl_jobs.status IS 'Job status: pending -> crawling -> structuring -> ready -> importing -> completed/failed/cancelled';
COMMENT ON COLUMN crawl_jobs.pages_found IS 'Number of pages discovered by Firecrawl';
COMMENT ON COLUMN crawl_jobs.pages_processed IS 'Number of pages processed through content structuring';
COMMENT ON COLUMN crawl_jobs.pages_imported IS 'Number of pages successfully imported as knowledge sources';
COMMENT ON COLUMN crawl_jobs.pages_failed IS 'Number of pages that failed to import';
COMMENT ON COLUMN knowledge_sources.crawl_job_id IS 'Links knowledge source to the crawl job that created it';
