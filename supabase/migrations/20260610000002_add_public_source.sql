-- Public page v2: the hosted page (/c/<slug>-<uuid>) gets its own chat source so analytics,
-- inbox filtering, and conversation reuse distinguish it from the embedded widget.
--
-- CHECK constraints cannot be altered in place: drop + re-add with the new value.
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_source_check;
ALTER TABLE conversations ADD CONSTRAINT conversations_source_check
  CHECK (source IN ('widget', 'playground', 'mcp', 'api', 'voice', 'public'));

-- Analytics filter by source: GET /api/analytics/*?source=...
CREATE INDEX IF NOT EXISTS idx_conversations_project_source_created
  ON conversations (project_id, source, created_at DESC);
