-- Migration: Add name column to project_members
-- This allows capturing agent names during invitation
-- The name is used for display in chat notifications, inbox, etc.

-- Add name column (nullable - can be set during invite or after acceptance)
ALTER TABLE project_members ADD COLUMN IF NOT EXISTS name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN project_members.name IS 'Display name for the team member, captured during invitation';
