-- Migration: Row Level Security Policies for Human Agent Handoff
-- Phase 1: Database Schema Foundation
-- RLS policies for: handoff_settings, project_members, agent_availability, customers, conversations, messages

-- ============================================================================
-- Enable RLS on all tables
-- ============================================================================
ALTER TABLE handoff_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HANDOFF SETTINGS POLICIES
-- Only project owners can view and update handoff settings
-- ============================================================================

-- Project owners can view their handoff settings
CREATE POLICY "handoff_settings_select_owner"
  ON handoff_settings FOR SELECT
  USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- Project owners can insert handoff settings (one per project)
CREATE POLICY "handoff_settings_insert_owner"
  ON handoff_settings FOR INSERT
  WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- Project owners can update their handoff settings
CREATE POLICY "handoff_settings_update_owner"
  ON handoff_settings FOR UPDATE
  USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- Agents can view handoff settings for projects they belong to
CREATE POLICY "handoff_settings_select_agent"
  ON handoff_settings FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- ============================================================================
-- PROJECT MEMBERS POLICIES
-- Owners can manage team, agents can view their own membership
-- ============================================================================

-- Project owners can view all members
CREATE POLICY "project_members_select_owner"
  ON project_members FOR SELECT
  USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- Project owners can insert members (invite)
CREATE POLICY "project_members_insert_owner"
  ON project_members FOR INSERT
  WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- Project owners can update members
CREATE POLICY "project_members_update_owner"
  ON project_members FOR UPDATE
  USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- Project owners can delete members
CREATE POLICY "project_members_delete_owner"
  ON project_members FOR DELETE
  USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- Agents can view their own membership
CREATE POLICY "project_members_select_self"
  ON project_members FOR SELECT
  USING (user_id = auth.uid());

-- Allow viewing pending invitations by token (for accept invitation flow)
-- This uses a service role bypass, handled in API

-- ============================================================================
-- AGENT AVAILABILITY POLICIES
-- Agents can manage their own availability, owners can view all
-- ============================================================================

-- Users can view their own availability
CREATE POLICY "agent_availability_select_self"
  ON agent_availability FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own availability
CREATE POLICY "agent_availability_insert_self"
  ON agent_availability FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own availability
CREATE POLICY "agent_availability_update_self"
  ON agent_availability FOR UPDATE
  USING (user_id = auth.uid());

-- Project owners can view all agent availability for their projects
CREATE POLICY "agent_availability_select_owner"
  ON agent_availability FOR SELECT
  USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- Agents can view availability of other agents in same project
CREATE POLICY "agent_availability_select_team"
  ON agent_availability FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- ============================================================================
-- CUSTOMERS POLICIES
-- Project owners and agents can view/manage customers
-- ============================================================================

-- Project owners can view customers
CREATE POLICY "customers_select_owner"
  ON customers FOR SELECT
  USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- Project owners can insert customers
CREATE POLICY "customers_insert_owner"
  ON customers FOR INSERT
  WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- Project owners can update customers
CREATE POLICY "customers_update_owner"
  ON customers FOR UPDATE
  USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- Agents can view customers for their projects
CREATE POLICY "customers_select_agent"
  ON customers FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Agents can update customers (e.g., flag, add notes)
CREATE POLICY "customers_update_agent"
  ON customers FOR UPDATE
  USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- ============================================================================
-- CONVERSATIONS POLICIES
-- Owners, agents, and widget can access conversations appropriately
-- ============================================================================

-- Project owners can view all conversations
CREATE POLICY "conversations_select_owner"
  ON conversations FOR SELECT
  USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- Project owners can insert conversations
CREATE POLICY "conversations_insert_owner"
  ON conversations FOR INSERT
  WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- Project owners can update conversations
CREATE POLICY "conversations_update_owner"
  ON conversations FOR UPDATE
  USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- Agents can view conversations for their projects
CREATE POLICY "conversations_select_agent"
  ON conversations FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Agents can update conversations (claim, resolve, etc.)
CREATE POLICY "conversations_update_agent"
  ON conversations FOR UPDATE
  USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Note: Widget access to conversations is handled via service role in API
-- The widget sends visitor_id and project API key, API validates and uses admin client

-- ============================================================================
-- MESSAGES POLICIES
-- Access based on conversation access
-- ============================================================================

-- Project owners can view messages
CREATE POLICY "messages_select_owner"
  ON messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    )
  );

-- Project owners can insert messages
CREATE POLICY "messages_insert_owner"
  ON messages FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    )
  );

-- Agents can view messages for their project conversations
CREATE POLICY "messages_select_agent"
  ON messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE project_id IN (
        SELECT project_id FROM project_members
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

-- Agents can insert messages (send to customer)
CREATE POLICY "messages_insert_agent"
  ON messages FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE project_id IN (
        SELECT project_id FROM project_members
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

-- Note: Widget message insertion is handled via service role in API
-- The API validates the visitor owns the conversation before inserting

-- ============================================================================
-- HELPER FUNCTIONS FOR AUTHORIZATION
-- Used by API for additional checks
-- ============================================================================

-- Check if user is owner of a project
CREATE OR REPLACE FUNCTION is_project_owner(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM projects
        WHERE id = p_project_id AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is an active agent for a project
CREATE OR REPLACE FUNCTION is_project_agent(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = p_project_id
          AND user_id = p_user_id
          AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has access to a project (owner or agent)
CREATE OR REPLACE FUNCTION has_project_access(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN is_project_owner(p_project_id, p_user_id)
        OR is_project_agent(p_project_id, p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's role in a project
CREATE OR REPLACE FUNCTION get_project_role(p_project_id UUID, p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_role TEXT;
BEGIN
    -- Check if owner
    IF EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND user_id = p_user_id) THEN
        RETURN 'owner';
    END IF;

    -- Check if agent/admin
    SELECT role INTO v_role
    FROM project_members
    WHERE project_id = p_project_id
      AND user_id = p_user_id
      AND status = 'active';

    RETURN COALESCE(v_role, NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get available agents for a project (online with capacity)
CREATE OR REPLACE FUNCTION get_available_agents(p_project_id UUID)
RETURNS TABLE (
    user_id UUID,
    current_chat_count INTEGER,
    max_concurrent_chats INTEGER,
    last_assigned_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        aa.user_id,
        aa.current_chat_count,
        aa.max_concurrent_chats,
        aa.last_assigned_at
    FROM agent_availability aa
    WHERE aa.project_id = p_project_id
      AND aa.status = 'online'
      AND aa.current_chat_count < aa.max_concurrent_chats
    ORDER BY
        aa.current_chat_count ASC,
        aa.last_assigned_at ASC NULLS FIRST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get queue position for a conversation
CREATE OR REPLACE FUNCTION get_queue_position(p_conversation_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_project_id UUID;
    v_queue_entered_at TIMESTAMPTZ;
    v_position INTEGER;
BEGIN
    -- Get conversation details
    SELECT project_id, queue_entered_at
    INTO v_project_id, v_queue_entered_at
    FROM conversations
    WHERE id = p_conversation_id AND status = 'waiting';

    IF v_queue_entered_at IS NULL THEN
        RETURN NULL;
    END IF;

    -- Count conversations ahead in queue
    SELECT COUNT(*) + 1 INTO v_position
    FROM conversations
    WHERE project_id = v_project_id
      AND status = 'waiting'
      AND queue_entered_at < v_queue_entered_at;

    RETURN v_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
