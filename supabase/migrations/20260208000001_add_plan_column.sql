ALTER TABLE projects ADD COLUMN plan text NOT NULL DEFAULT 'free';
COMMENT ON COLUMN projects.plan IS 'Subscription plan: free, pro. Controls feature gating (e.g. voice calls).';
