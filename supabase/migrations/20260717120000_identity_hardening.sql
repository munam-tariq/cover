-- ============================================================================
-- Customer Identity Verification — Security Hardening (v2)
--
-- Follow-on to 20260717100000_customer_identity_verification.sql. Moves the
-- verified assertion off the agent-/public-writable `customers` table into a
-- service-role-only `customer_identities` table, locks down write grants on the
-- identity-linkage tables, adds single-use replay protection, tenant-consistency
-- FKs, DB-level email normalization, and one atomic SECURITY DEFINER merge RPC.
--
-- Rationale in ~/.claude/plans (post two external reviews). Dev-only.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. customers: canonical redirect + DB-level email normalization
-- ----------------------------------------------------------------------------

-- Durable "this row was merged into <id>" pointer so find-then-write callers
-- (lead capture, conversation creation) that resolved a since-tombstoned row can
-- redirect to the survivor instead of resurrecting it.
ALTER TABLE customers
  ADD COLUMN merged_into_customer_id UUID REFERENCES customers(id);

-- Normalize email at the DB boundary (not just in app code) so the customers
-- PUT route and any direct PostgREST write can't split an identity by case.
ALTER TABLE customers
  ADD COLUMN email_normalized TEXT GENERATED ALWAYS AS (lower(email)) STORED;

-- Resolve any pre-existing case collisions before the functional unique index:
-- keep the earliest row per (project_id, lower(email)); null the email on later
-- duplicates (email is mutable contact info, not identity).
UPDATE customers c
SET email = NULL, updated_at = NOW()
WHERE email IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM customers older
    WHERE older.project_id = c.project_id
      AND older.email IS NOT NULL
      AND lower(older.email) = lower(c.email)
      AND (older.created_at < c.created_at
           OR (older.created_at = c.created_at AND older.id < c.id))
  );

DROP INDEX IF EXISTS idx_customers_project_email_unique;
CREATE UNIQUE INDEX idx_customers_project_email_norm_unique
  ON customers(project_id, email_normalized)
  WHERE email IS NOT NULL;

-- Composite-FK target: lets conversations/qualified_leads/customer_identities
-- enforce that a referenced customer belongs to the SAME project.
ALTER TABLE customers ADD CONSTRAINT customers_id_project_unique UNIQUE (id, project_id);

-- ----------------------------------------------------------------------------
-- 2. customer_identities — the verified assertion (service-role only)
-- ----------------------------------------------------------------------------

CREATE TABLE customer_identities (
  customer_id UUID PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,                 -- JWT user_id/sub (tenant's stable id)
  verified_at TIMESTAMPTZ NOT NULL,
  custom_attributes JSONB,
  verified_email TEXT,                       -- last-asserted snapshot (what the JWT signed)
  verified_name TEXT,
  verified_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, external_id),
  FOREIGN KEY (customer_id, project_id) REFERENCES customers(id, project_id)
);

CREATE TRIGGER update_customer_identities_updated_at
  BEFORE UPDATE ON customer_identities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Backfill from the columns being dropped (none on dev; safe generally).
INSERT INTO customer_identities
  (customer_id, project_id, external_id, verified_at, custom_attributes,
   verified_email, verified_name, verified_phone)
SELECT id, project_id, external_id, verified_at, custom_attributes, email, name, phone
FROM customers
WHERE verified_at IS NOT NULL AND external_id IS NOT NULL;

ALTER TABLE customer_identities ENABLE ROW LEVEL SECURITY;
-- Deny-by-default (RLS, no policies) PLUS explicit revoke: default table grants
-- to anon/authenticated exist project-wide, so revoke them belt-and-suspenders.
REVOKE ALL ON customer_identities FROM anon, authenticated;

-- Now drop the identity columns from the agent-writable customers table.
DROP INDEX IF EXISTS idx_customers_project_external_id_unique;
ALTER TABLE customers
  DROP COLUMN external_id,
  DROP COLUMN verified_at,
  DROP COLUMN custom_attributes;

-- ----------------------------------------------------------------------------
-- 3. consumed_identity_jti — single-use replay protection (service-role only)
-- ----------------------------------------------------------------------------

CREATE TABLE consumed_identity_jti (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  jti TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  customer_id UUID,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, jti)
);
CREATE INDEX idx_consumed_identity_jti_expiry ON consumed_identity_jti(expires_at);
ALTER TABLE consumed_identity_jti ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON consumed_identity_jti FROM anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4. Tenant-consistency FKs on the linkage tables
-- ----------------------------------------------------------------------------

ALTER TABLE conversations
  ADD CONSTRAINT conversations_customer_project_fk
  FOREIGN KEY (customer_id, project_id) REFERENCES customers(id, project_id);

ALTER TABLE qualified_leads
  ADD CONSTRAINT qualified_leads_customer_project_fk
  FOREIGN KEY (customer_id, project_id) REFERENCES customers(id, project_id);

-- ----------------------------------------------------------------------------
-- 5. Lock down direct writes to identity-linkage tables
--    Dashboard reads these as `authenticated` (RLS-gated); all WRITES go through
--    the service-role Express API. Revoking authenticated write closes the
--    linkage-forgery vector (re-pointing customer_id / visitor_id) and the
--    pre-existing customer_email/is_flagged forgery. SELECT is kept.
-- ----------------------------------------------------------------------------

REVOKE INSERT, UPDATE, DELETE ON customers      FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON conversations  FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON qualified_leads FROM authenticated;

-- ----------------------------------------------------------------------------
-- 6. Atomic identity merge (SECURITY DEFINER, service-role only)
--    One transaction; advisory-locked on the LOGICAL keys (external_id /
--    visitor_id / normalized email) so concurrent identifies serialize even
--    before rows exist. Returns { customer_id, warnings }.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.merge_customer_identity(
  p_project_id uuid,
  p_visitor_id text,
  p_external_id text,
  p_email text,
  p_email_set boolean,
  p_name text,
  p_name_set boolean,
  p_phone text,
  p_phone_set boolean,
  p_custom_attributes jsonb,
  p_custom_attributes_set boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_now timestamptz := now();
  v_email_norm text := CASE WHEN p_email_set THEN lower(nullif(btrim(p_email), '')) ELSE NULL END;
  v_lock_email text := CASE WHEN p_email_set AND p_email IS NOT NULL THEN lower(nullif(btrim(p_email), '')) ELSE NULL END;
  v_keys bigint[];
  v_key bigint;
  v_ext_customer uuid;
  v_vis_customer uuid;
  v_email_customer uuid;
  v_vis_external text;
  v_email_external text;
  v_target uuid;
  v_absorb uuid[] := '{}';
  v_row uuid;
  v_warnings text[] := '{}';
  v_skip_email boolean := false;
  v_merged_ids text[];
  v_new_email text;
  v_new_name text;
  v_new_phone text;
  v_existing_attrs jsonb;
  v_attrs jsonb;
  v_best_state jsonb;
  v_best_rank int := -1;
  v_cand record;
  v_ver_email text;
  v_ver_name text;
  v_ver_phone text;
BEGIN
  -- Deadlock-safe advisory locks on the logical identity keys (sorted).
  v_keys := ARRAY[
    hashtextextended(p_project_id::text || ':ext:' || p_external_id, 0),
    hashtextextended(p_project_id::text || ':vis:' || p_visitor_id, 0)
  ];
  IF v_lock_email IS NOT NULL THEN
    v_keys := v_keys || hashtextextended(p_project_id::text || ':em:' || v_lock_email, 0);
  END IF;
  FOR v_key IN SELECT k FROM unnest(v_keys) k ORDER BY k LOOP
    PERFORM pg_advisory_xact_lock(v_key);
  END LOOP;

  -- Candidate lookups (external_id now lives on customer_identities).
  SELECT customer_id INTO v_ext_customer
  FROM customer_identities WHERE project_id = p_project_id AND external_id = p_external_id;

  SELECT id INTO v_vis_customer
  FROM customers WHERE project_id = p_project_id AND visitor_id = p_visitor_id;

  IF v_lock_email IS NOT NULL THEN
    SELECT id INTO v_email_customer
    FROM customers WHERE project_id = p_project_id AND email_normalized = v_lock_email;
  END IF;

  -- Device switched to a different verified user without resetUser: unbind the
  -- device from the old identity rather than rewriting it.
  IF v_vis_customer IS NOT NULL THEN
    SELECT external_id INTO v_vis_external FROM customer_identities WHERE customer_id = v_vis_customer;
    IF v_vis_external IS NOT NULL AND v_vis_external <> p_external_id THEN
      UPDATE customers SET visitor_id = 'detached:' || v_vis_customer, updated_at = v_now
      WHERE id = v_vis_customer;
      v_vis_customer := NULL;
    END IF;
  END IF;

  v_target := COALESCE(v_ext_customer, v_vis_customer);
  IF v_ext_customer IS NOT NULL AND v_vis_customer IS NOT NULL AND v_ext_customer <> v_vis_customer THEN
    v_absorb := ARRAY[v_vis_customer];
  END IF;

  -- Email-conflict handling.
  IF v_email_customer IS NOT NULL
     AND v_email_customer IS DISTINCT FROM v_target
     AND NOT (v_email_customer = ANY(v_absorb)) THEN
    SELECT external_id INTO v_email_external FROM customer_identities WHERE customer_id = v_email_customer;
    IF v_email_external IS NOT NULL AND v_email_external <> p_external_id THEN
      v_warnings := ARRAY['EMAIL_CONFLICT'];
      v_skip_email := true;                       -- never steal another verified user's email
    ELSIF v_target IS NOT NULL THEN
      v_absorb := v_absorb || v_email_customer;
    ELSE
      v_target := v_email_customer;
    END IF;
  END IF;

  IF v_target IS NULL THEN
    -- Brand-new customer.
    INSERT INTO customers (project_id, visitor_id, email, name, phone, first_seen_at, last_seen_at)
    VALUES (
      p_project_id, p_visitor_id,
      CASE WHEN p_email_set AND NOT v_skip_email THEN p_email ELSE NULL END,
      CASE WHEN p_name_set THEN p_name ELSE NULL END,
      CASE WHEN p_phone_set THEN p_phone ELSE NULL END,
      v_now, v_now
    )
    RETURNING id INTO v_target;
  ELSE
    -- Merge each absorbed row into the target, in one transaction.
    FOREACH v_row IN ARRAY v_absorb LOOP
      UPDATE conversations SET customer_id = v_target
      WHERE project_id = p_project_id AND customer_id = v_row;
      UPDATE qualified_leads SET customer_id = v_target
      WHERE project_id = p_project_id AND customer_id = v_row;
      UPDATE customers
      SET merged_into_customer_id = v_target,
          visitor_id = 'merged:' || v_row,
          email = NULL,
          updated_at = v_now
      WHERE id = v_row;
    END LOOP;

    -- merged_visitor_ids = union of target + absorbed visitor ids (minus placeholders / current).
    SELECT array_agg(DISTINCT vid) INTO v_merged_ids
    FROM (
      SELECT unnest(coalesce(merged_visitor_ids, '{}')) AS vid FROM customers WHERE id = v_target
      UNION
      SELECT visitor_id FROM customers WHERE id = v_target
      UNION
      SELECT unnest(coalesce(merged_visitor_ids, '{}')) FROM customers WHERE id = ANY(v_absorb)
    ) s
    WHERE vid IS NOT NULL AND vid <> p_visitor_id
      AND vid NOT LIKE 'merged:%' AND vid NOT LIKE 'detached:%';

    -- M1: adopt the most-advanced lead_capture_state among target + absorbed; clear sources.
    FOR v_cand IN
      SELECT lead_capture_state FROM customers
      WHERE id = v_target OR id = ANY(v_absorb)
    LOOP
      IF v_cand.lead_capture_state IS NOT NULL THEN
        DECLARE v_rank int := CASE v_cand.lead_capture_state->>'lead_capture_status'
          WHEN 'qualified' THEN 3 WHEN 'form_completed' THEN 2 WHEN 'qualifying' THEN 1 ELSE 0 END;
        BEGIN
          IF v_rank > v_best_rank THEN
            v_best_rank := v_rank; v_best_state := v_cand.lead_capture_state;
          END IF;
        END;
      END IF;
    END LOOP;
    IF array_length(v_absorb, 1) IS NOT NULL THEN
      UPDATE customers SET lead_capture_state = NULL, updated_at = v_now WHERE id = ANY(v_absorb);
    END IF;
  END IF;

  -- Contact-sync patch (present=set, omit=preserve, null=clear).
  SELECT email, name, phone INTO v_new_email, v_new_name, v_new_phone FROM customers WHERE id = v_target;
  IF p_email_set AND NOT v_skip_email THEN v_new_email := p_email; END IF;
  IF p_name_set THEN v_new_name := p_name; END IF;
  IF p_phone_set THEN v_new_phone := p_phone; END IF;

  UPDATE customers SET
    visitor_id = p_visitor_id,
    email = v_new_email,
    name = v_new_name,
    phone = v_new_phone,
    merged_visitor_ids = CASE WHEN v_merged_ids IS NULL THEN merged_visitor_ids ELSE v_merged_ids END,
    lead_capture_state = CASE WHEN v_best_rank >= 0 THEN v_best_state ELSE lead_capture_state END,
    merged_into_customer_id = NULL,
    last_seen_at = v_now,
    updated_at = v_now
  WHERE id = v_target;

  -- Custom attributes shallow-merge (top-level null-key deletion only).
  SELECT custom_attributes INTO v_existing_attrs FROM customer_identities WHERE customer_id = v_target;
  IF p_custom_attributes_set THEN
    IF p_custom_attributes IS NULL THEN
      v_attrs := NULL;
    ELSE
      v_attrs := coalesce(v_existing_attrs, '{}'::jsonb) || p_custom_attributes;
      SELECT coalesce(jsonb_object_agg(key, value) FILTER (WHERE value <> 'null'::jsonb), '{}'::jsonb)
      INTO v_attrs FROM jsonb_each(v_attrs);
    END IF;
  ELSE
    v_attrs := v_existing_attrs;
  END IF;

  -- Verified snapshot = last successfully asserted (present replaces, omit preserves, null clears).
  SELECT verified_email, verified_name, verified_phone INTO v_ver_email, v_ver_name, v_ver_phone
  FROM customer_identities WHERE customer_id = v_target;
  IF p_email_set AND NOT v_skip_email THEN v_ver_email := p_email; END IF;
  IF p_name_set THEN v_ver_name := p_name; END IF;
  IF p_phone_set THEN v_ver_phone := p_phone; END IF;

  INSERT INTO customer_identities
    (customer_id, project_id, external_id, verified_at, custom_attributes,
     verified_email, verified_name, verified_phone)
  VALUES
    (v_target, p_project_id, p_external_id, v_now, v_attrs, v_ver_email, v_ver_name, v_ver_phone)
  ON CONFLICT (customer_id) DO UPDATE SET
    external_id = EXCLUDED.external_id,
    verified_at = EXCLUDED.verified_at,
    custom_attributes = EXCLUDED.custom_attributes,
    verified_email = EXCLUDED.verified_email,
    verified_name = EXCLUDED.verified_name,
    verified_phone = EXCLUDED.verified_phone,
    updated_at = v_now;

  -- Backfill this visitor's conversations; guard prevents re-parenting another
  -- verified customer's history.
  UPDATE conversations SET
    customer_id = v_target,
    customer_email = v_new_email,
    customer_name = v_new_name
  WHERE project_id = p_project_id AND visitor_id = p_visitor_id
    AND (customer_id IS NULL OR customer_id = v_target OR customer_id = ANY(v_absorb));

  RETURN jsonb_build_object('customer_id', v_target, 'warnings', to_jsonb(v_warnings));
END;
$function$;

REVOKE ALL ON FUNCTION public.merge_customer_identity(uuid, text, text, text, boolean, text, boolean, text, boolean, jsonb, boolean) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.merge_customer_identity(uuid, text, text, text, boolean, text, boolean, text, boolean, jsonb, boolean) TO service_role;
