-- Migration: Add button_text column to handoff_settings
-- Allows customization of the "Talk to Human" button text in widget

ALTER TABLE handoff_settings
ADD COLUMN IF NOT EXISTS button_text TEXT NOT NULL DEFAULT 'Talk to a human';

-- Add comment for documentation
COMMENT ON COLUMN handoff_settings.button_text IS 'Custom text for the "Talk to Human" button in widget';
