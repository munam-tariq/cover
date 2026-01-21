-- Migration: Add message_feedback table for thumbs up/down voting on AI responses
-- This allows end users to rate AI responses and helps business owners identify
-- knowledge gaps and response quality issues.

-- Create the message_feedback table
CREATE TABLE IF NOT EXISTS message_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Message reference (required)
  -- Note: message_id references messages table but we make it optional for legacy chat_sessions
  message_id UUID,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Feedback data
  rating TEXT NOT NULL CHECK (rating IN ('helpful', 'unhelpful')),

  -- Optional: Follow-up feedback (for future enhancement)
  feedback_text TEXT,
  feedback_category TEXT CHECK (feedback_category IS NULL OR feedback_category IN (
    'wrong_answer', 'incomplete', 'confusing', 'outdated', 'other'
  )),

  -- Context for debugging/analysis (denormalized for persistence)
  question_text TEXT,        -- The user question that triggered this response
  answer_text TEXT,          -- The AI response that was rated

  -- Visitor tracking (anonymous but allows deduplication)
  visitor_id TEXT NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key constraint only if messages table exists and has data
-- This handles cases where feedback might be for legacy chat_sessions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
    ALTER TABLE message_feedback
    ADD CONSTRAINT fk_message_feedback_message
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN others THEN
    -- If constraint already exists or can't be added, continue silently
    NULL;
END $$;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_message_feedback_project ON message_feedback(project_id);
CREATE INDEX IF NOT EXISTS idx_message_feedback_project_rating ON message_feedback(project_id, rating);
CREATE INDEX IF NOT EXISTS idx_message_feedback_created ON message_feedback(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_feedback_message ON message_feedback(message_id);
CREATE INDEX IF NOT EXISTS idx_message_feedback_conversation ON message_feedback(conversation_id);

-- Prevent duplicate feedback from same visitor on same message
-- Use partial unique index for when message_id is present
CREATE UNIQUE INDEX IF NOT EXISTS idx_message_feedback_unique_with_message
ON message_feedback(message_id, visitor_id)
WHERE message_id IS NOT NULL;

-- For legacy messages without message_id, use conversation + visitor + answer hash
-- This prevents duplicate feedback on the same response in the same conversation
CREATE UNIQUE INDEX IF NOT EXISTS idx_message_feedback_unique_without_message
ON message_feedback(conversation_id, visitor_id, md5(COALESCE(answer_text, '')))
WHERE message_id IS NULL;

-- Enable RLS
ALTER TABLE message_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Policy: Project owners and admins can view all feedback for their projects
CREATE POLICY "project_members_can_view_feedback"
ON message_feedback
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = message_feedback.project_id
    AND pm.user_id = auth.uid()
  )
);

-- Policy: Anyone can insert feedback (anonymous visitors)
-- This allows the widget to submit feedback without authentication
CREATE POLICY "anyone_can_submit_feedback"
ON message_feedback
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Policy: Service role can do anything (for API server)
CREATE POLICY "service_role_full_access"
ON message_feedback
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE message_feedback IS 'Stores thumbs up/down feedback on AI responses from chat widget users';
COMMENT ON COLUMN message_feedback.rating IS 'User rating: helpful (thumbs up) or unhelpful (thumbs down)';
COMMENT ON COLUMN message_feedback.question_text IS 'Denormalized copy of user question for analysis even if original message deleted';
COMMENT ON COLUMN message_feedback.answer_text IS 'Denormalized copy of AI response for analysis even if original message deleted';
COMMENT ON COLUMN message_feedback.visitor_id IS 'Anonymous visitor ID for deduplication without requiring authentication';
