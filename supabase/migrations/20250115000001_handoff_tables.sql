-- Migration: Create Human Agent Handoff Tables
-- Phase 1: Database Schema Foundation
-- Tables: handoff_settings, agent_availability, customers, conversations, messages, project_members

-- ============================================================================
-- 1. HANDOFF SETTINGS
-- Per-project configuration for human handoff feature
-- ============================================================================
CREATE TABLE handoff_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Master toggle
  enabled BOOLEAN NOT NULL DEFAULT false,

  -- Trigger configuration
  trigger_mode TEXT NOT NULL DEFAULT 'both'
    CHECK (trigger_mode IN ('auto', 'manual', 'both')),
  show_human_button BOOLEAN NOT NULL DEFAULT false,

  -- Auto triggers (JSONB for flexibility)
  auto_triggers JSONB NOT NULL DEFAULT '{
    "low_confidence_enabled": true,
    "low_confidence_threshold": 0.6,
    "keywords_enabled": true,
    "keywords": ["human", "agent", "person", "speak to someone", "talk to someone"]
  }'::jsonb,

  -- Business hours
  business_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  business_hours JSONB NOT NULL DEFAULT '{
    "monday": {"start": "09:00", "end": "17:00", "enabled": true},
    "tuesday": {"start": "09:00", "end": "17:00", "enabled": true},
    "wednesday": {"start": "09:00", "end": "17:00", "enabled": true},
    "thursday": {"start": "09:00", "end": "17:00", "enabled": true},
    "friday": {"start": "09:00", "end": "17:00", "enabled": true},
    "saturday": {"start": "09:00", "end": "17:00", "enabled": false},
    "sunday": {"start": "09:00", "end": "17:00", "enabled": false}
  }'::jsonb,

  -- Agent defaults
  default_max_concurrent_chats INTEGER NOT NULL DEFAULT 5,

  -- Session timeout settings (for customer presence)
  inactivity_timeout_minutes INTEGER NOT NULL DEFAULT 5,
  auto_close_after_warning_minutes INTEGER NOT NULL DEFAULT 5,
  session_keep_alive_minutes INTEGER NOT NULL DEFAULT 15,
  send_inactivity_warning BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(project_id)
);

-- ============================================================================
-- 2. PROJECT MEMBERS
-- Team management and agent invitations
-- ============================================================================
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- NULL if pending

  -- Invitation
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('agent', 'admin')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'removed')),

  -- Invitation tracking
  invitation_token TEXT UNIQUE,  -- For accepting invitation
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,

  -- Settings
  max_concurrent_chats INTEGER NOT NULL DEFAULT 5,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(project_id, email)
);

-- ============================================================================
-- 3. AGENT AVAILABILITY
-- Track agent online status and capacity
-- ============================================================================
CREATE TABLE agent_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Status
  status TEXT NOT NULL DEFAULT 'offline'
    CHECK (status IN ('online', 'away', 'offline')),

  -- Capacity
  max_concurrent_chats INTEGER NOT NULL DEFAULT 5,
  current_chat_count INTEGER NOT NULL DEFAULT 0,

  -- Tracking
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_assigned_at TIMESTAMPTZ,
  status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Auto-offline settings
  auto_offline_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_offline_minutes INTEGER NOT NULL DEFAULT 30,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id, project_id),
  CHECK (current_chat_count >= 0),
  CHECK (current_chat_count <= max_concurrent_chats)
);

-- ============================================================================
-- 4. CUSTOMERS
-- Visitor tracking and identification
-- ============================================================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Identification
  visitor_id TEXT NOT NULL,                    -- Primary identifier from cookie
  email TEXT,                                   -- NULL until provided
  name TEXT,                                    -- NULL until provided

  -- Merged visitors (same email from different devices)
  merged_visitor_ids TEXT[] NOT NULL DEFAULT '{}',

  -- Stats
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_conversations INTEGER NOT NULL DEFAULT 0,

  -- Context (updated on each visit)
  last_browser TEXT,
  last_device TEXT,
  last_os TEXT,
  last_page_url TEXT,
  last_location TEXT,                          -- City, Country (from IP)

  -- Flags
  is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  flag_reason TEXT,
  flagged_at TIMESTAMPTZ,
  flagged_by UUID REFERENCES auth.users(id),

  -- Notes
  internal_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(project_id, visitor_id)
);

-- Partial unique index for email (only when not null)
CREATE UNIQUE INDEX idx_customers_project_email_unique
  ON customers(project_id, email)
  WHERE email IS NOT NULL;

-- ============================================================================
-- 5. CONVERSATIONS
-- Replaces chat_sessions with full handoff support
-- ============================================================================
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Customer identification (links to customers table)
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  visitor_id TEXT NOT NULL,
  customer_email TEXT,
  customer_name TEXT,

  -- Customer presence tracking
  customer_presence TEXT DEFAULT 'offline'
    CHECK (customer_presence IN ('online', 'idle', 'offline', 'typing')),
  customer_last_seen_at TIMESTAMPTZ,
  auto_close_warning_sent_at TIMESTAMPTZ,

  -- Status
  status TEXT NOT NULL DEFAULT 'ai_active'
    CHECK (status IN ('ai_active', 'waiting', 'agent_active', 'resolved', 'closed')),

  -- Assignment
  assigned_agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Handoff metadata
  handoff_reason TEXT
    CHECK (handoff_reason IS NULL OR handoff_reason IN ('low_confidence', 'keyword', 'customer_request', 'button_click')),
  handoff_triggered_at TIMESTAMPTZ,
  ai_confidence_at_handoff FLOAT,
  trigger_keyword TEXT,

  -- Queue tracking
  queue_entered_at TIMESTAMPTZ,
  queue_position INTEGER,

  -- Agent interaction timestamps
  claimed_at TIMESTAMPTZ,
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,

  -- Satisfaction
  satisfaction_rating INTEGER CHECK (satisfaction_rating IS NULL OR satisfaction_rating BETWEEN 1 AND 5),
  satisfaction_feedback TEXT,

  -- Source
  source TEXT NOT NULL DEFAULT 'widget'
    CHECK (source IN ('widget', 'playground', 'mcp', 'api', 'voice')),

  -- Metadata (flexible JSONB for additional data)
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Lead capture state (migrated from chat_sessions)
  awaiting_email BOOLEAN DEFAULT false,
  pending_question TEXT,
  email_asked BOOLEAN DEFAULT false,

  -- Voice (migrated from chat_sessions)
  is_voice BOOLEAN DEFAULT false,
  voice_duration_seconds INTEGER DEFAULT 0,

  -- Message count (denormalized for quick access)
  message_count INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. MESSAGES
-- Individual messages within conversations
-- ============================================================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- Sender
  sender_type TEXT NOT NULL
    CHECK (sender_type IN ('customer', 'ai', 'agent', 'system')),
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- Only for agent type

  -- Content
  content TEXT NOT NULL,

  -- AI-specific metadata
  -- For AI messages: { confidence: 0.85, sources: [...], model: 'gpt-4o-mini' }
  -- For system messages: { event: 'handoff_triggered', reason: 'keyword' }
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- Performance optimization for common queries
-- ============================================================================

-- Handoff settings
CREATE INDEX idx_handoff_settings_project ON handoff_settings(project_id);

-- Project members
CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_project_members_email ON project_members(email);
CREATE INDEX idx_project_members_pending ON project_members(project_id, status) WHERE status = 'pending';
CREATE INDEX idx_project_members_token ON project_members(invitation_token) WHERE invitation_token IS NOT NULL;

-- Agent availability
CREATE INDEX idx_agent_availability_project_status ON agent_availability(project_id, status);
CREATE INDEX idx_agent_availability_available ON agent_availability(project_id) WHERE status = 'online';
CREATE INDEX idx_agent_availability_user ON agent_availability(user_id);

-- Customers
CREATE INDEX idx_customers_project_visitor ON customers(project_id, visitor_id);
CREATE INDEX idx_customers_project_email ON customers(project_id, email) WHERE email IS NOT NULL;
CREATE INDEX idx_customers_project_last_seen ON customers(project_id, last_seen_at DESC);
CREATE INDEX idx_customers_flagged ON customers(project_id, is_flagged) WHERE is_flagged = TRUE;

-- Conversations
CREATE INDEX idx_conversations_project_status ON conversations(project_id, status);
CREATE INDEX idx_conversations_assigned_agent ON conversations(assigned_agent_id) WHERE assigned_agent_id IS NOT NULL;
CREATE INDEX idx_conversations_waiting_queue ON conversations(project_id, queue_entered_at) WHERE status = 'waiting';
CREATE INDEX idx_conversations_visitor ON conversations(project_id, visitor_id);
CREATE INDEX idx_conversations_customer ON conversations(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_conversations_last_message ON conversations(project_id, last_message_at DESC);

-- Messages
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at);

-- ============================================================================
-- TRIGGERS
-- Automatic timestamp updates
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_handoff_settings_updated_at
    BEFORE UPDATE ON handoff_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_members_updated_at
    BEFORE UPDATE ON project_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_availability_updated_at
    BEFORE UPDATE ON agent_availability
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update conversation.message_count when message is inserted
CREATE OR REPLACE FUNCTION update_conversation_message_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET
      message_count = message_count + 1,
      last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_message_count_on_insert
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_message_count();

-- Trigger to update customer.total_conversations when conversation is created
CREATE OR REPLACE FUNCTION update_customer_conversation_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.customer_id IS NOT NULL THEN
        UPDATE customers
        SET
          total_conversations = total_conversations + 1,
          last_seen_at = NOW()
        WHERE id = NEW.customer_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customer_stats_on_conversation
    AFTER INSERT ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_conversation_count();
