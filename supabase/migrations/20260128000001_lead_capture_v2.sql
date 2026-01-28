-- Lead Capture V2: Configurable form + qualifying questions
-- Adds lead_capture_state to customers and creates qualified_leads table

-- 1. Add lead_capture_state to customers table
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS lead_capture_state JSONB DEFAULT NULL;

-- Index for looking up customers with active lead capture state
CREATE INDEX IF NOT EXISTS idx_customers_lead_state
  ON customers(project_id) WHERE lead_capture_state IS NOT NULL;

-- 2. Create qualified_leads table
CREATE TABLE IF NOT EXISTS qualified_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  visitor_id TEXT NOT NULL,
  email TEXT NOT NULL,
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  qualifying_answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  qualification_status TEXT NOT NULL DEFAULT 'form_completed'
    CHECK (qualification_status IN ('form_completed', 'qualifying', 'qualified', 'skipped')),
  first_message TEXT,
  form_submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  qualification_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for qualified_leads
CREATE INDEX idx_qualified_leads_project ON qualified_leads(project_id);
CREATE INDEX idx_qualified_leads_project_created ON qualified_leads(project_id, created_at DESC);
CREATE INDEX idx_qualified_leads_status ON qualified_leads(project_id, qualification_status);

-- 3. Enable RLS on qualified_leads
ALTER TABLE qualified_leads ENABLE ROW LEVEL SECURITY;

-- RLS policy: project owners can read their own leads
CREATE POLICY "Users can read own project leads"
  ON qualified_leads FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- RLS policy: service role can insert/update (via API)
CREATE POLICY "Service role can manage leads"
  ON qualified_leads FOR ALL
  USING (true)
  WITH CHECK (true);
