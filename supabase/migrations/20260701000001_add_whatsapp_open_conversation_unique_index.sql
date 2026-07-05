-- CHAN-002 hardening: prevent duplicate open WhatsApp conversations for the
-- same visitor. resolveConversation() is read-then-write (SELECT existing
-- open conversation, INSERT if none). Two inbound webhook POSTs for a brand
-- new sender that land in separate concurrent requests (not batched by Meta
-- into one POST) can both miss the SELECT and each INSERT a new "ai_active"
-- conversation, splitting history across two threads.
--
-- Scoped to source='whatsapp' only so widget/public/mobile/etc. behavior is
-- unchanged. The losing INSERT gets a unique-violation (23505); the caller
-- (conversation-resolver.ts) catches it and re-selects the winner's row —
-- same idempotency idiom already used by channel_inbound_events.
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_whatsapp_open
  ON conversations(project_id, visitor_id, source)
  WHERE source = 'whatsapp' AND status IN ('ai_active', 'waiting', 'agent_active');
