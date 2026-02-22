-- Add avatar_url and ensure name is available for feed (LinkedIn-style profile picture and display name)
ALTER TABLE shorts_user_profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN shorts_user_profiles.avatar_url IS 'Profile picture URL (e.g. from Supabase Storage or external image)';
