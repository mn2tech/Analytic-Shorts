-- SIMPLE FIX for "Database error saving new user"
-- Run this ENTIRE script in Supabase SQL Editor
-- This will fix the trigger and make signup work

-- Step 1: Make sure tables exist (with proper structure)
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

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_shorts_user_profiles_user_id ON shorts_user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_shorts_subscriptions_user_id ON shorts_subscriptions(user_id);

-- Step 3: Enable RLS
ALTER TABLE shorts_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shorts_subscriptions ENABLE ROW LEVEL SECURITY;

-- Step 4: Create/Update RLS policies
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

-- Step 5: Create/Update the trigger function with better error handling
CREATE OR REPLACE FUNCTION create_default_shorts_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user profile (with conflict handling)
  INSERT INTO shorts_user_profiles (id, user_id, name)
  VALUES (
    NEW.id, 
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Create default subscription (with conflict handling)
  INSERT INTO shorts_subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    -- This allows users to sign up even if profile creation has issues
    RAISE WARNING 'Error creating user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created_shorts ON auth.users;

CREATE TRIGGER on_auth_user_created_shorts
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_shorts_user();

-- Step 7: Verify everything is set up
SELECT 
  'Setup Complete!' as message,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('shorts_user_profiles', 'shorts_subscriptions')) as tables_count,
  (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name = 'create_default_shorts_user') as function_exists,
  (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created_shorts') as trigger_exists;

-- Step 8: Backfill profiles for existing users (if any)
INSERT INTO shorts_user_profiles (id, user_id, name)
SELECT 
  id,
  id as user_id,
  COALESCE(raw_user_meta_data->>'name', SPLIT_PART(email, '@', 1)) as name
FROM auth.users
WHERE id NOT IN (SELECT id FROM shorts_user_profiles)
ON CONFLICT (id) DO NOTHING;

INSERT INTO shorts_subscriptions (user_id, plan, status)
SELECT 
  id,
  'free' as plan,
  'active' as status
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM shorts_subscriptions)
ON CONFLICT (user_id) DO NOTHING;

SELECT '✅ All done! Try signing up again.' as result;




