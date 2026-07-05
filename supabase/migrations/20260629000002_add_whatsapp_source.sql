-- Add 'whatsapp' to the conversations.source CHECK constraint.
-- Pattern: supabase/migrations/20260610000008_add_mobile_source.sql

ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_source_check;
ALTER TABLE conversations ADD CONSTRAINT conversations_source_check
  CHECK (source IN ('widget','playground','mcp','api','voice','public','mobile','whatsapp'));
