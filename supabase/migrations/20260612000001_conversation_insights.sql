-- Conversation Insights (Chatbase gap 1)
-- Per-conversation topic / sentiment / resolution / answer-gap labels produced by the nightly
-- LLM classifier (apps/api/src/services/conversation-insights.ts). Kept as a separate table from
-- `conversations` so re-classification is cheap and idempotent: delete + reinsert per conversation.

CREATE TABLE conversation_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  topic TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  resolved BOOLEAN,
  answer_gap_question TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Range scans for the analytics endpoints, plus topic rollups.
CREATE INDEX idx_conversation_insights_project_created
  ON conversation_insights (project_id, created_at DESC);
CREATE INDEX idx_conversation_insights_project_topic
  ON conversation_insights (project_id, topic);
-- Idempotent delete + reinsert per conversation during (re)classification.
CREATE INDEX idx_conversation_insights_conversation
  ON conversation_insights (conversation_id);

-- ============================================================================
-- Row Level Security — mirrors conversations/messages tenant isolation.
-- Reads go through the service role behind the API's requireProjectAccess guard
-- (which also authorizes active team members); these policies are defense-in-depth.
-- ============================================================================

ALTER TABLE conversation_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own project insights"
  ON conversation_insights FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to insights"
  ON conversation_insights FOR ALL
  USING (true)
  WITH CHECK (true);
