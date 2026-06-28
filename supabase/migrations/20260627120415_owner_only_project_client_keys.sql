-- Project client key lifecycle hardening.
--
-- Publishable client keys are safe to display to project members, but the API contract keeps
-- creation/revocation owner-only. Revoke direct browser-role DML so project members cannot bypass
-- the API through Supabase REST/GraphQL, and keep owner-only RLS policies as defense in depth.

BEGIN;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.project_client_keys FROM authenticated;

DROP POLICY IF EXISTS "Users can create client keys for their projects"
  ON public.project_client_keys;

DROP POLICY IF EXISTS "Users can update client keys for their projects"
  ON public.project_client_keys;

CREATE POLICY "Project owners can create client keys"
  ON public.project_client_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_client_keys.project_id
        AND p.user_id = (SELECT auth.uid())
        AND p.deleted_at IS NULL
    )
  );

CREATE POLICY "Project owners can update client keys"
  ON public.project_client_keys
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_client_keys.project_id
        AND p.user_id = (SELECT auth.uid())
        AND p.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_client_keys.project_id
        AND p.user_id = (SELECT auth.uid())
        AND p.deleted_at IS NULL
    )
  );

COMMIT;
