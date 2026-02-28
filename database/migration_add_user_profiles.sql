-- Migration: Ashorts – user profiles and subscription (Analytics Shorts)
-- Run this if you already have the base schema and want to add user profiles.
-- This script is specific to the Ashorts (NM2TECH Analytics Shorts) project.

-- Ashorts: User profiles table – extends auth.users with display name, avatar, etc.
CREATE TABLE IF NOT EXISTS shorts_user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255),
  company VARCHAR(255),
  role VARCHAR(100),
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure avatar_url exists (if table was created before this column was added)
ALTER TABLE shorts_user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create index
CREATE INDEX IF NOT EXISTS idx_shorts_user_profiles_user_id ON shorts_user_profiles(user_id);

-- Enable RLS
ALTER TABLE shorts_user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own profile" ON shorts_user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON shorts_user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON shorts_user_profiles;

-- Create RLS Policies for shorts_user_profiles
CREATE POLICY "Users can view own profile"
  ON shorts_user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON shorts_user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON shorts_user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Drop existing triggers if they exist (Ashorts)
DROP TRIGGER IF EXISTS update_shorts_user_profiles_updated_at ON shorts_user_profiles;
DROP TRIGGER IF EXISTS on_auth_user_created_ashorts ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_shorts ON auth.users;

-- Create trigger for updated_at
CREATE TRIGGER update_shorts_user_profiles_updated_at
  BEFORE UPDATE ON shorts_user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Ashorts: Create profile + subscription when a new user signs up
CREATE OR REPLACE FUNCTION create_default_ashorts_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create Ashorts user profile (only if it doesn't exist)
  INSERT INTO shorts_user_profiles (id, user_id, name)
  VALUES (NEW.id, NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  
  -- Create default Ashorts subscription (only if it doesn't exist)
  INSERT INTO shorts_subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: run when a new user is created (Ashorts)
CREATE TRIGGER on_auth_user_created_ashorts
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_ashorts_user();

-- Backfill: Create Ashorts profiles for existing auth users who don't have one
INSERT INTO shorts_user_profiles (id, user_id, name)
SELECT 
  id,
  id as user_id,
  COALESCE(raw_user_meta_data->>'name', email) as name
FROM auth.users
WHERE id NOT IN (SELECT id FROM shorts_user_profiles)
ON CONFLICT (id) DO NOTHING;




