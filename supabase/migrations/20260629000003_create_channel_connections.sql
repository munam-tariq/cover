-- CHAN-001: Channel connections table (multi-provider, WhatsApp first).
-- Security: matches June 2026 hardening end-state (revoke anon+auth, RLS, owner-only).

CREATE TABLE channel_connections (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  provider     text NOT NULL CHECK (provider IN ('whatsapp')),
  external_id  text NOT NULL,
  display_name text,
  credentials  text NOT NULL,
  config       jsonb NOT NULL DEFAULT '{}'::jsonb,
  status       text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled','error')),
  last_error   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_id)
);

CREATE INDEX idx_channel_connections_project ON channel_connections(project_id);

-- At most one active connection per project+provider (Codex finding #5).
CREATE UNIQUE INDEX idx_channel_connections_active_per_project ON channel_connections(project_id, provider) WHERE status = 'active';

-- Security: RLS + lockdown (matching June 2026 hardening end-state).
ALTER TABLE channel_connections ENABLE ROW LEVEL SECURITY;

-- No browser query path — revoke both anon and authenticated (service-role-only table).
REVOKE ALL ON TABLE public.channel_connections FROM anon;
REVOKE ALL ON TABLE public.channel_connections FROM authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.channel_connections FROM anon, authenticated;

-- Owner-only defense-in-depth policies (active only if authenticated grants are re-added later).
CREATE POLICY "Project owners can read channel connections"
  ON public.channel_connections FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = channel_connections.project_id
      AND p.user_id = (SELECT auth.uid()) AND p.deleted_at IS NULL
  ));

CREATE POLICY "Project owners can manage channel connections"
  ON public.channel_connections FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = channel_connections.project_id
      AND p.user_id = (SELECT auth.uid()) AND p.deleted_at IS NULL
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = channel_connections.project_id
      AND p.user_id = (SELECT auth.uid()) AND p.deleted_at IS NULL
  ));
