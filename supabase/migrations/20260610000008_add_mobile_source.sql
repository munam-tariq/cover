-- Mobile SDK: native apps get their own chat source so analytics, inbox filtering, and
-- conversation reuse distinguish them from the embedded widget and the hosted public page.
--
-- CHECK constraints cannot be altered in place: drop + re-add with the new value.
-- Mirrors 20260610000002_add_public_source.sql.
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_source_check;
ALTER TABLE conversations ADD CONSTRAINT conversations_source_check
  CHECK (source IN ('widget', 'playground', 'mcp', 'api', 'voice', 'public', 'mobile'));
