-- Migration: Migrate data from chat_sessions to conversations and messages
-- Phase 14: Data Migration
--
-- This migration:
-- 1. Creates customer records for existing visitors
-- 2. Migrates chat_sessions to conversations table
-- 3. Migrates messages from JSONB array to individual message records
--
-- NOTE: This is a one-time migration. The chat_sessions table is kept for
-- backward compatibility during the transition period.

-- ============================================================================
-- 1. CREATE CUSTOMERS FROM EXISTING CHAT SESSIONS
-- ============================================================================

INSERT INTO customers (
  project_id,
  visitor_id,
  first_seen_at,
  last_seen_at,
  total_conversations,
  created_at,
  updated_at
)
SELECT DISTINCT ON (project_id, visitor_id)
  project_id,
  visitor_id,
  MIN(created_at) as first_seen_at,
  MAX(updated_at) as last_seen_at,
  COUNT(*) as total_conversations,
  MIN(created_at) as created_at,
  MAX(updated_at) as updated_at
FROM chat_sessions
WHERE visitor_id IS NOT NULL
GROUP BY project_id, visitor_id
ON CONFLICT (project_id, visitor_id) DO NOTHING;

-- ============================================================================
-- 2. MIGRATE CHAT SESSIONS TO CONVERSATIONS
-- ============================================================================

INSERT INTO conversations (
  id,
  project_id,
  customer_id,
  visitor_id,
  status,
  source,
  message_count,
  -- Lead capture fields
  awaiting_email,
  pending_question,
  email_asked,
  -- Voice fields
  is_voice,
  voice_duration_seconds,
  -- Timestamps
  created_at,
  updated_at,
  last_message_at
)
SELECT
  cs.id,
  cs.project_id,
  c.id as customer_id,
  cs.visitor_id,
  'ai_active'::text as status,  -- All existing sessions were AI-only
  COALESCE(cs.source, 'widget')::text as source,
  COALESCE(cs.message_count, 0) as message_count,
  -- Lead capture
  COALESCE(cs.awaiting_email, false) as awaiting_email,
  cs.pending_question,
  COALESCE(cs.email_asked, false) as email_asked,
  -- Voice
  COALESCE(cs.is_voice, false) as is_voice,
  COALESCE(cs.voice_duration_seconds, 0) as voice_duration_seconds,
  -- Timestamps
  cs.created_at,
  cs.updated_at,
  COALESCE(cs.updated_at, cs.created_at) as last_message_at
FROM chat_sessions cs
LEFT JOIN customers c ON c.project_id = cs.project_id AND c.visitor_id = cs.visitor_id
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. MIGRATE MESSAGES FROM JSONB ARRAY TO MESSAGES TABLE
-- ============================================================================

-- Create a function to extract and insert messages from JSONB array
CREATE OR REPLACE FUNCTION migrate_chat_messages()
RETURNS void AS $$
DECLARE
  session_record RECORD;
  message_item JSONB;
  message_index INT;
  sender TEXT;
  msg_content TEXT;
  msg_timestamp TIMESTAMPTZ;
  msg_metadata JSONB;
BEGIN
  -- Loop through each chat session with messages
  FOR session_record IN
    SELECT id, messages
    FROM chat_sessions
    WHERE messages IS NOT NULL AND jsonb_array_length(messages) > 0
  LOOP
    -- Loop through each message in the session
    message_index := 0;
    FOR message_item IN SELECT * FROM jsonb_array_elements(session_record.messages)
    LOOP
      -- Extract message data
      sender := COALESCE(message_item->>'role', 'user');
      msg_content := COALESCE(message_item->>'content', '');
      msg_timestamp := COALESCE(
        (message_item->>'timestamp')::timestamptz,
        NOW() - (jsonb_array_length(session_record.messages) - message_index || ' minutes')::interval
      );

      -- Build metadata
      msg_metadata := '{}'::jsonb;
      IF message_item ? 'metadata' THEN
        msg_metadata := message_item->'metadata';
      END IF;

      -- Skip empty messages
      IF msg_content = '' OR msg_content IS NULL THEN
        CONTINUE;
      END IF;

      -- Insert message
      INSERT INTO messages (
        conversation_id,
        sender_type,
        content,
        metadata,
        created_at
      ) VALUES (
        session_record.id,
        CASE sender
          WHEN 'user' THEN 'customer'
          WHEN 'assistant' THEN 'ai'
          ELSE 'system'
        END,
        msg_content,
        msg_metadata,
        msg_timestamp
      )
      ON CONFLICT DO NOTHING;

      message_index := message_index + 1;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the migration function
SELECT migrate_chat_messages();

-- Drop the migration function (cleanup)
DROP FUNCTION migrate_chat_messages();

-- ============================================================================
-- 4. UPDATE CONVERSATION MESSAGE COUNTS
-- ============================================================================

-- Recalculate message counts based on actual messages in the messages table
UPDATE conversations c
SET message_count = (
  SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id
)
WHERE EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id);

-- ============================================================================
-- 5. ADD INDEX FOR FEATURE FLAG COLUMN (future use)
-- ============================================================================

-- Add a feature flag column to projects for gradual rollout
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS use_new_conversations BOOLEAN DEFAULT false;

-- Comment explaining the migration
COMMENT ON TABLE conversations IS 'New conversations table supporting human handoff. Migrated from chat_sessions.';
COMMENT ON TABLE messages IS 'Individual messages within conversations. Migrated from chat_sessions.messages JSONB array.';
