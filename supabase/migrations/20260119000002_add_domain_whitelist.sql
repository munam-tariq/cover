-- Migration: Add domain whitelisting to projects
-- Purpose: Allow project owners to restrict which domains can embed their chat widget
-- This is an opt-in security feature. Empty array = allow all domains (no breaking change).

-- ============================================================================
-- 1. ADD ALLOWED_DOMAINS COLUMN
-- ============================================================================

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS allowed_domains TEXT[] DEFAULT '{}';

-- ============================================================================
-- 2. CREATE INDEX FOR PERFORMANCE
-- ============================================================================

-- GIN index for array containment queries
CREATE INDEX IF NOT EXISTS idx_projects_allowed_domains
ON projects USING GIN (allowed_domains);

-- ============================================================================
-- 3. ADD HELPER FUNCTION FOR DOMAIN CHECKING
-- ============================================================================

CREATE OR REPLACE FUNCTION check_domain_allowed(
  project_allowed_domains TEXT[],
  request_domain TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  domain TEXT;
  pattern TEXT;
  normalized_request TEXT;
BEGIN
  -- Normalize request domain to lowercase
  normalized_request := lower(request_domain);

  -- If no domains configured, allow all (opt-in feature)
  IF project_allowed_domains IS NULL OR array_length(project_allowed_domains, 1) IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check each allowed domain
  FOREACH domain IN ARRAY project_allowed_domains LOOP
    -- Normalize allowed domain
    domain := lower(trim(domain));

    -- Exact match
    IF normalized_request = domain THEN
      RETURN TRUE;
    END IF;

    -- Auto-include www variant
    IF normalized_request = 'www.' || domain THEN
      RETURN TRUE;
    END IF;

    -- Wildcard match (*.example.com)
    IF domain LIKE '*.%' THEN
      pattern := substring(domain from 3); -- Remove '*.'
      -- Match exact base domain or any subdomain
      IF normalized_request = pattern OR normalized_request LIKE '%.' || pattern THEN
        RETURN TRUE;
      END IF;
    END IF;
  END LOOP;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 4. ADD COMMENTS
-- ============================================================================

COMMENT ON COLUMN projects.allowed_domains IS 'Domains allowed to embed the chat widget. Empty array = allow all domains (default, no breaking change).';
COMMENT ON FUNCTION check_domain_allowed(TEXT[], TEXT) IS 'Check if a request domain is allowed for a project. Supports wildcards (*.example.com) and auto-includes www variant.';
