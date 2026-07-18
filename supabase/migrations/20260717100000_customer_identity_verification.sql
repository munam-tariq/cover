-- ============================================================================
-- Customer Identity Verification (JWT identify + contact sync)
--
-- Adds verified-identity columns to customers and a per-project signing
-- secret table used to verify HS256 identity tokens minted by the tenant's
-- own backend (Chatbase-style identity verification).
-- ============================================================================

-- 1. customers: verified identity columns (all nullable; existing rows untouched)
ALTER TABLE customers
  ADD COLUMN external_id TEXT,           -- JWT user_id/sub; the tenant's stable user id
  ADD COLUMN custom_attributes JSONB,    -- verified custom attributes (shallow-merged per key)
  ADD COLUMN verified_at TIMESTAMPTZ;    -- non-null == identity verified via signed token

CREATE UNIQUE INDEX idx_customers_project_external_id_unique
  ON customers(project_id, external_id)
  WHERE external_id IS NOT NULL;

-- 2. Per-project identity verification secret.
-- Stored AES-256-GCM encrypted (services/encryption.ts). This is a SIGNING
-- SECRET (unlike the publishable project_client_keys), so RLS is enabled with
-- deliberately NO policies: only the service-role Express API may read it.
-- The dashboard obtains it via GET /api/projects/:id/identity-secret.
CREATE TABLE project_identity_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  secret_encrypted TEXT NOT NULL,        -- iv:authTag:ciphertext (hex)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rotated_at TIMESTAMPTZ
);

ALTER TABLE project_identity_secrets ENABLE ROW LEVEL SECURITY;
