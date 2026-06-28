-- Realtime Private Channel Authorization
--
-- Adds RLS policies on realtime.messages to gate private Realtime channel
-- subscriptions. Widget visitors get a short-lived JWT (role: anon) with
-- custom claims (conversation_id, project_id, scope). Dashboard users use
-- their regular Supabase Auth JWT (role: authenticated).
--
-- All anon table privileges were revoked in 20260626000001, so the anon JWT
-- cannot access any table via PostgREST — only these Realtime policies.

-- ============================================================================
-- Helper: safe UUID extraction from channel topics
-- ============================================================================

CREATE OR REPLACE FUNCTION public.extract_topic_uuid(topic text, prefix text)
RETURNS uuid
LANGUAGE plpgsql IMMUTABLE STRICT
SET search_path = public, pg_temp
AS $$
DECLARE
  raw text;
BEGIN
  raw := replace(topic, prefix, '');
  IF raw ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN raw::uuid;
  END IF;
  RETURN NULL;
END;
$$;

-- ============================================================================
-- Widget visitor policy (anon + custom JWT claims)
-- ============================================================================

-- Widget visitors can only RECEIVE broadcast on their bound conversation.
-- The JWT must have scope=widget_realtime and conversation_id matching the topic.
CREATE POLICY "widget_visitor_receive_conversation_broadcast"
  ON realtime.messages FOR SELECT
  TO anon
  USING (
    realtime.messages.extension = 'broadcast'
    AND (current_setting('request.jwt.claims', true))::json ->> 'scope' = 'widget_realtime'
    AND (select realtime.topic()) =
        'conversation:' || ((current_setting('request.jwt.claims', true))::json ->> 'conversation_id')
  );

-- ============================================================================
-- Dashboard policies (authenticated + project membership checks)
-- ============================================================================

-- conversation:<conversationId> — owner or active member of the owning project
CREATE POLICY "dashboard_receive_conversation_broadcast"
  ON realtime.messages FOR SELECT
  TO authenticated
  USING (
    realtime.messages.extension IN ('broadcast', 'presence')
    AND (select realtime.topic()) LIKE 'conversation:%'
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = public.extract_topic_uuid((select realtime.topic()), 'conversation:')
        AND (
          c.project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
          OR c.project_id IN (
            SELECT project_id FROM project_members
            WHERE user_id = auth.uid() AND status = 'active'
          )
        )
    )
  );

-- project:<projectId>:queue — owner or active member
CREATE POLICY "dashboard_receive_queue_broadcast"
  ON realtime.messages FOR SELECT
  TO authenticated
  USING (
    realtime.messages.extension IN ('broadcast', 'presence')
    AND (select realtime.topic()) LIKE 'project:%:queue'
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = public.extract_topic_uuid(
        replace((select realtime.topic()), ':queue', ''), 'project:'
      )
        AND (
          p.user_id = auth.uid()
          OR p.id IN (
            SELECT project_id FROM project_members
            WHERE user_id = auth.uid() AND status = 'active'
          )
        )
    )
  );

-- project:<projectId>:agents — owner or active member
CREATE POLICY "dashboard_receive_agents_broadcast"
  ON realtime.messages FOR SELECT
  TO authenticated
  USING (
    realtime.messages.extension IN ('broadcast', 'presence')
    AND (select realtime.topic()) LIKE 'project:%:agents'
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = public.extract_topic_uuid(
        replace((select realtime.topic()), ':agents', ''), 'project:'
      )
        AND (
          p.user_id = auth.uid()
          OR p.id IN (
            SELECT project_id FROM project_members
            WHERE user_id = auth.uid() AND status = 'active'
          )
        )
    )
  );

-- agent:<userId> — only the agent themselves
CREATE POLICY "dashboard_receive_agent_personal_broadcast"
  ON realtime.messages FOR SELECT
  TO authenticated
  USING (
    realtime.messages.extension IN ('broadcast', 'presence')
    AND (select realtime.topic()) = 'agent:' || auth.uid()::text
  );
