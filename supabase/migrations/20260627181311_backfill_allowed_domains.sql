-- Backfill allowed_domains from the onboarding company_website URL.
--
-- Projects created through onboarding store their crawl URL in
-- settings->'onboarding'->'company_website'. This migration extracts the
-- bare domain (strip protocol, www., trailing path) and seeds
-- allowed_domains with [domain, *.domain] so the widget gate can enforce
-- origin checks once WIDGET_GATE_ENFORCE is flipped on.
--
-- Only touches projects where allowed_domains is empty/null AND a
-- company_website was provided. Safe to re-run (idempotent).

UPDATE projects
SET allowed_domains = ARRAY[
  regexp_replace(
    regexp_replace(
      regexp_replace(settings->'onboarding'->>'company_website',
        '^https?://', ''),
      '^www\.', ''),
    '/.*$', ''),
  '*.' || regexp_replace(
    regexp_replace(
      regexp_replace(settings->'onboarding'->>'company_website',
        '^https?://', ''),
      '^www\.', ''),
    '/.*$', '')
]
WHERE deleted_at IS NULL
  AND (allowed_domains IS NULL OR allowed_domains = '{}')
  AND settings->'onboarding'->>'company_website' IS NOT NULL
  AND settings->'onboarding'->>'company_website' != '';
