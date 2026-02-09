-- Add voice call support columns to conversations table

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_voice_call BOOLEAN DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS voice_duration_seconds INTEGER;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS voice_provider TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS voice_call_id TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS voice_cost DECIMAL(10, 4);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS voice_recording_url TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS voice_transcript JSONB;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS voice_ended_reason TEXT;

-- Index for looking up conversations by voice call ID
CREATE INDEX IF NOT EXISTS idx_conversations_voice_call_id
  ON conversations (voice_call_id)
  WHERE voice_call_id IS NOT NULL;

-- Index for filtering voice conversations per project
CREATE INDEX IF NOT EXISTS idx_conversations_voice_project
  ON conversations (project_id, is_voice_call)
  WHERE is_voice_call = true;
