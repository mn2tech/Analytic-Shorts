-- Add last_seen_at for online indicator and "last active"
-- Run in Supabase SQL Editor.
ALTER TABLE shorts_user_profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE;
