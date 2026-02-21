-- Add qualification_reasoning column to qualified_leads
-- Stores explanation of why a lead was marked qualified/not_qualified

ALTER TABLE qualified_leads
  ADD COLUMN IF NOT EXISTS qualification_reasoning TEXT DEFAULT NULL;

-- Update status check constraint to include 'not_qualified'
-- (lead answered mandatory questions but failed the criteria)
ALTER TABLE qualified_leads
  DROP CONSTRAINT IF EXISTS qualified_leads_qualification_status_check;

ALTER TABLE qualified_leads
  ADD CONSTRAINT qualified_leads_qualification_status_check
    CHECK (qualification_status IN (
      'form_completed', 'qualifying', 'qualified', 'not_qualified', 'skipped', 'deferred'
    ));

COMMENT ON COLUMN qualified_leads.qualification_reasoning IS
  'Explanation of why lead was marked qualified/not_qualified. Populated when qualification_status is finalized.';
