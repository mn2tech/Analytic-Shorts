-- Quick verification script to check if trigger is set up correctly
-- Run this in Supabase SQL Editor to diagnose the issue

-- 1. Check if tables exist
SELECT 
  'Tables Check' as check_type,
  table_name,
  CASE 
    WHEN table_name IN ('shorts_user_profiles', 'shorts_subscriptions') THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('shorts_user_profiles', 'shorts_subscriptions');

-- 2. Check if function exists
SELECT 
  'Function Check' as check_type,
  routine_name,
  CASE 
    WHEN routine_name = 'create_default_shorts_user' THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'create_default_shorts_user';

-- 3. Check if trigger exists
SELECT 
  'Trigger Check' as check_type,
  trigger_name,
  event_object_table,
  CASE 
    WHEN trigger_name = 'on_auth_user_created_shorts' THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name = 'on_auth_user_created_shorts';

-- 4. Check RLS policies
SELECT 
  'RLS Check' as check_type,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('shorts_user_profiles', 'shorts_subscriptions');

-- 5. Test the function manually (replace 'USER_ID_HERE' with an actual user ID from auth.users)
-- Uncomment and run this after creating a test user:
/*
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Get a test user ID (use the first user in auth.users)
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE 'No users found in auth.users';
  ELSE
    -- Try to create profile manually
    INSERT INTO shorts_user_profiles (id, user_id, name)
    VALUES (test_user_id, test_user_id, 'Test User')
    ON CONFLICT (id) DO UPDATE SET name = 'Test User';
    
    RAISE NOTICE 'Profile created/updated for user: %', test_user_id;
  END IF;
END $$;
*/




