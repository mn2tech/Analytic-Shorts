-- Quick Fix: Drop existing policies and recreate them
-- Run this in Supabase SQL Editor if you get "policy already exists" errors

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON shorts_user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON shorts_user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON shorts_user_profiles;

DROP POLICY IF EXISTS "Users can view own shorts dashboards" ON shorts_dashboards;
DROP POLICY IF EXISTS "Users can insert own shorts dashboards" ON shorts_dashboards;
DROP POLICY IF EXISTS "Users can update own shorts dashboards" ON shorts_dashboards;
DROP POLICY IF EXISTS "Users can delete own shorts dashboards" ON shorts_dashboards;

DROP POLICY IF EXISTS "Users can view own shorts file uploads" ON shorts_file_uploads;
DROP POLICY IF EXISTS "Users can insert own shorts file uploads" ON shorts_file_uploads;
DROP POLICY IF EXISTS "Users can update own shorts file uploads" ON shorts_file_uploads;
DROP POLICY IF EXISTS "Users can delete own shorts file uploads" ON shorts_file_uploads;

DROP POLICY IF EXISTS "Users can view own shorts usage logs" ON shorts_usage_logs;
DROP POLICY IF EXISTS "Users can insert own shorts usage logs" ON shorts_usage_logs;

DROP POLICY IF EXISTS "Users can view own shorts subscriptions" ON shorts_subscriptions;
DROP POLICY IF EXISTS "Users can insert own shorts subscriptions" ON shorts_subscriptions;
DROP POLICY IF EXISTS "Users can update own shorts subscriptions" ON shorts_subscriptions;

-- Now run the rest of schema.sql (the CREATE POLICY statements)
-- Or just run the full schema_clean.sql which has everything




