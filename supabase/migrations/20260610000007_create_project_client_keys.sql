-- Publishable client keys for native SDKs (mobile, etc.).
--
-- A `pk_<32 alnum>` key is a PUBLISHABLE, non-secret credential shipped inside an app binary
-- (Stripe/Supabase/Sentry publishable-key pattern). It is NOT hashed: security comes from
-- per-project scoping, rate limiting, and revocation — not from secrecy. The key authorizes
-- requests from clients that send no browser Origin (so POST /api/chat/message accepts a valid
-- key in place of the Origin/domain check) and is the primary rate-limit key for that client.
--
-- The public API reads/writes this table with the service-role key (bypasses RLS). RLS is still
-- enabled with owner/member-scoped policies (and NO anon policies) as defense-in-depth, matching
-- the posture set by 20260609000002_fix_anon_rls.sql / 20260610000005_drop_anon_table_policies.sql.

CREATE TABLE project_client_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- The publishable key, stored cleartext (it is not a secret). Unique for O(1) lookup.
  key TEXT NOT NULL UNIQUE,

  platform TEXT NOT NULL DEFAULT 'mobile'
    CHECK (platform IN ('mobile', 'web', 'all')),
  name TEXT,

  -- Soft revocation: revoking sets active=false + revoked_at (the key is never hard-deleted,
  -- so it can't be silently re-minted onto old traffic).
  active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

-- `key UNIQUE` already creates a lookup index; this covers the dashboard "list keys for a project".
CREATE INDEX project_client_keys_project_id_idx ON project_client_keys(project_id);

-- ============================================================================
-- ROW LEVEL SECURITY (owner/member-scoped; no anon policies)
-- ============================================================================

ALTER TABLE project_client_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view client keys for their projects"
  ON project_client_keys FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can create client keys for their projects"
  ON project_client_keys FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can update client keys for their projects"
  ON project_client_keys FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

COMMENT ON TABLE project_client_keys IS 'Publishable (non-secret) per-project client keys (pk_...) for native SDKs; revocable, rate-limit-scoped.';
COMMENT ON COLUMN project_client_keys.key IS 'Publishable key pk_<32 alnum>, stored cleartext (not a secret).';
COMMENT ON COLUMN project_client_keys.platform IS 'Intended client platform: mobile | web | all.';
COMMENT ON COLUMN project_client_keys.active IS 'False once revoked; revoked keys stop authorizing within the middleware cache TTL (~5 min).';
