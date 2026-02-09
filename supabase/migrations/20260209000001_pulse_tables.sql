-- Pulse: Micro-Survey Popups
-- Creates pulse_campaigns, pulse_responses, and pulse_summaries tables
-- for the Pulse visitor feedback feature.

-- ============================================================================
-- 1. pulse_campaigns — Campaign definitions created from dashboard
-- ============================================================================

CREATE TABLE pulse_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Campaign content
  type TEXT NOT NULL CHECK (type IN ('nps', 'poll', 'sentiment', 'feedback')),
  question TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- config shape per type:
  --   nps:       { follow_up_question?: string }
  --   poll:      { options: string[], allow_other?: boolean }
  --   sentiment: { emojis?: number, follow_up_question?: string }
  --   feedback:  { placeholder?: string, max_length?: number }

  -- Targeting rules
  targeting JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- targeting shape:
  --   { pages?: string[], delay_seconds?: number, scroll_depth?: number,
  --     audience?: 'all' | 'new' | 'returning' }

  -- Visual styling
  styling JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- styling shape:
  --   { accent_color?: string, theme?: 'light' | 'dark' | 'auto',
  --     shape?: 'blob' | 'petal' | 'diamond' | 'cloud' | 'squircle' | 'leaf' | 'random',
  --     position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'smart' }

  -- Campaign state
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  response_count INTEGER NOT NULL DEFAULT 0,
  response_goal INTEGER,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for pulse_campaigns
CREATE INDEX idx_pulse_campaigns_project ON pulse_campaigns(project_id);
CREATE INDEX idx_pulse_campaigns_project_status ON pulse_campaigns(project_id, status);
CREATE INDEX idx_pulse_campaigns_active ON pulse_campaigns(project_id, starts_at, ends_at)
  WHERE status = 'active';

-- ============================================================================
-- 2. pulse_responses — Individual visitor responses
-- ============================================================================

CREATE TABLE pulse_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES pulse_campaigns(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Response data
  answer JSONB NOT NULL,
  -- answer shape per type:
  --   nps:       { score: number, follow_up?: string }
  --   poll:      { option: string, other_text?: string }
  --   sentiment: { emoji: string, follow_up?: string }
  --   feedback:  { text: string }

  -- Context
  page_url TEXT,
  visitor_id TEXT,
  session_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- metadata shape:
  --   { scroll_depth?: number, time_on_page?: number, referrer?: string }

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for pulse_responses
CREATE INDEX idx_pulse_responses_campaign ON pulse_responses(campaign_id);
CREATE INDEX idx_pulse_responses_project ON pulse_responses(project_id);
CREATE INDEX idx_pulse_responses_campaign_created ON pulse_responses(campaign_id, created_at DESC);
CREATE INDEX idx_pulse_responses_visitor ON pulse_responses(campaign_id, visitor_id);

-- ============================================================================
-- 3. pulse_summaries — AI-generated response summaries
-- ============================================================================

CREATE TABLE pulse_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES pulse_campaigns(id) ON DELETE CASCADE,

  summary_text TEXT NOT NULL,
  themes JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- themes shape: [{ label: string, count: number, sentiment?: string }]

  response_count INTEGER NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for pulse_summaries
CREATE INDEX idx_pulse_summaries_campaign ON pulse_summaries(campaign_id);
CREATE INDEX idx_pulse_summaries_latest ON pulse_summaries(campaign_id, generated_at DESC);

-- ============================================================================
-- 4. Triggers
-- ============================================================================

-- Auto-update updated_at on pulse_campaigns
CREATE TRIGGER update_pulse_campaigns_updated_at
  BEFORE UPDATE ON pulse_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Increment response_count on pulse_campaigns when a response is inserted
CREATE OR REPLACE FUNCTION increment_pulse_response_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE pulse_campaigns
  SET response_count = response_count + 1
  WHERE id = NEW.campaign_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pulse_response_count_increment
  AFTER INSERT ON pulse_responses
  FOR EACH ROW
  EXECUTE FUNCTION increment_pulse_response_count();

-- ============================================================================
-- 5. Row Level Security
-- ============================================================================

-- pulse_campaigns: dashboard users can manage their own project campaigns
ALTER TABLE pulse_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own project campaigns"
  ON pulse_campaigns FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own project campaigns"
  ON pulse_campaigns FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own project campaigns"
  ON pulse_campaigns FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own project campaigns"
  ON pulse_campaigns FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to campaigns"
  ON pulse_campaigns FOR ALL
  USING (true)
  WITH CHECK (true);

-- pulse_responses: anyone can submit (widget), owners can read
ALTER TABLE pulse_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit pulse responses"
  ON pulse_responses FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can read own project responses"
  ON pulse_responses FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to responses"
  ON pulse_responses FOR ALL
  USING (true)
  WITH CHECK (true);

-- pulse_summaries: owners can read, service role manages
ALTER TABLE pulse_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own project summaries"
  ON pulse_summaries FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM pulse_campaigns
      WHERE project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Service role full access to summaries"
  ON pulse_summaries FOR ALL
  USING (true)
  WITH CHECK (true);
