-- Fix for "Database error saving new user"
-- Run this in Supabase SQL Editor if you're getting database errors during signup

-- First, make sure tables exist
CREATE TABLE IF NOT EXISTS shorts_user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255),
  company VARCHAR(255),
  role VARCHAR(100),
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shorts_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan VARCHAR(50) NOT NULL DEFAULT 'free',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  stripe_subscription_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_shorts_user_profiles_user_id ON shorts_user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_shorts_subscriptions_user_id ON shorts_subscriptions(user_id);

-- Enable RLS
ALTER TABLE shorts_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shorts_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (if they don't exist)
DROP POLICY IF EXISTS "Users can view own profile" ON shorts_user_profiles;
CREATE POLICY "Users can view own profile"
  ON shorts_user_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON shorts_user_profiles;
CREATE POLICY "Users can insert own profile"
  ON shorts_user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON shorts_user_profiles;
CREATE POLICY "Users can update own profile"
  ON shorts_user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own shorts subscriptions" ON shorts_subscriptions;
CREATE POLICY "Users can view own shorts subscriptions"
  ON shorts_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own shorts subscriptions" ON shorts_subscriptions;
CREATE POLICY "Users can insert own shorts subscriptions"
  ON shorts_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Recreate the function with better error handling
CREATE OR REPLACE FUNCTION create_default_shorts_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user profile (with conflict handling)
  INSERT INTO shorts_user_profiles (id, user_id, name)
  VALUES (NEW.id, NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  
  -- Create default subscription (with conflict handling)
  INSERT INTO shorts_subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    -- This allows users to sign up even if profile creation fails
    RAISE WARNING 'Error creating user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created_shorts ON auth.users;

CREATE TRIGGER on_auth_user_created_shorts
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_shorts_user();

-- Verify the trigger exists
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created_shorts';




