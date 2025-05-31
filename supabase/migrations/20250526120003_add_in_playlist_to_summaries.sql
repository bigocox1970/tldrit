-- Add in_playlist column to summaries table for playlist functionality
ALTER TABLE summaries ADD COLUMN IF NOT EXISTS in_playlist BOOLEAN DEFAULT false;

-- Create index for better performance when filtering by playlist status
CREATE INDEX IF NOT EXISTS idx_summaries_in_playlist ON summaries(in_playlist) WHERE in_playlist = true;

-- Update existing summaries to have in_playlist = false by default (already set by DEFAULT clause)
-- This is just for clarity and to ensure data consistency
UPDATE summaries SET in_playlist = false WHERE in_playlist IS NULL; 