-- Database Schema for NM2TECH Analytics Shorts SaaS (Clean Version)
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- All tables are prefixed with "shorts_" for better organization
-- This version uses DROP IF EXISTS to avoid conflicts

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS shorts_usage_logs CASCADE;
DROP TABLE IF EXISTS shorts_file_uploads CASCADE;
DROP TABLE IF EXISTS shorts_dashboards CASCADE;
DROP TABLE IF EXISTS shorts_subscriptions CASCADE;
DROP TABLE IF EXISTS shorts_user_profiles CASCADE;

-- Drop existing functions and triggers
DROP FUNCTION IF EXISTS create_default_shorts_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- User profiles table - extends auth.users with additional user data
CREATE TABLE shorts_user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255),
  company VARCHAR(255),
  role VARCHAR(100),
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dashboards table - stores user dashboards
CREATE TABLE shorts_dashboards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL DEFAULT 'Untitled Dashboard',
  data JSONB NOT NULL,
  columns JSONB,
  numeric_columns JSONB,
  categorical_columns JSONB,
  date_columns JSONB,
  selected_numeric VARCHAR(255),
  selected_categorical VARCHAR(255),
  selected_date VARCHAR(255),
  dashboard_view VARCHAR(50) DEFAULT 'advanced',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- File uploads table - tracks user file uploads
CREATE TABLE shorts_file_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dashboard_id UUID REFERENCES shorts_dashboards(id) ON DELETE SET NULL,
  filename VARCHAR(255) NOT NULL,
  file_size INTEGER,
  file_type VARCHAR(50),
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage logs table - tracks user actions for usage limits
CREATE TABLE shorts_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions table - tracks user subscription plans
CREATE TABLE shorts_subscriptions (
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

-- Create indexes for better performance
CREATE INDEX idx_shorts_user_profiles_user_id ON shorts_user_profiles(user_id);
CREATE INDEX idx_shorts_dashboards_user_id ON shorts_dashboards(user_id);
CREATE INDEX idx_shorts_dashboards_created_at ON shorts_dashboards(created_at DESC);
CREATE INDEX idx_shorts_file_uploads_user_id ON shorts_file_uploads(user_id);
CREATE INDEX idx_shorts_usage_logs_user_id ON shorts_usage_logs(user_id);
CREATE INDEX idx_shorts_usage_logs_created_at ON shorts_usage_logs(created_at DESC);
CREATE INDEX idx_shorts_subscriptions_user_id ON shorts_subscriptions(user_id);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE shorts_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shorts_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE shorts_file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE shorts_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shorts_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shorts_user_profiles
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

-- RLS Policies for shorts_dashboards
CREATE POLICY "Users can view own shorts dashboards"
  ON shorts_dashboards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shorts dashboards"
  ON shorts_dashboards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shorts dashboards"
  ON shorts_dashboards FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own shorts dashboards"
  ON shorts_dashboards FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for shorts_file_uploads
CREATE POLICY "Users can view own shorts file uploads"
  ON shorts_file_uploads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shorts file uploads"
  ON shorts_file_uploads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shorts file uploads"
  ON shorts_file_uploads FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own shorts file uploads"
  ON shorts_file_uploads FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for shorts_usage_logs
CREATE POLICY "Users can view own shorts usage logs"
  ON shorts_usage_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shorts usage logs"
  ON shorts_usage_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for shorts_subscriptions
CREATE POLICY "Users can view own shorts subscriptions"
  ON shorts_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shorts subscriptions"
  ON shorts_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shorts subscriptions"
  ON shorts_subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_shorts_user_profiles_updated_at
  BEFORE UPDATE ON shorts_user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shorts_dashboards_updated_at
  BEFORE UPDATE ON shorts_dashboards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shorts_subscriptions_updated_at
  BEFORE UPDATE ON shorts_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create user profile and subscription for new users
CREATE OR REPLACE FUNCTION create_default_shorts_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user profile
  INSERT INTO shorts_user_profiles (id, user_id, name)
  VALUES (NEW.id, NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  
  -- Create default subscription
  INSERT INTO shorts_subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default profile and subscription when user signs up
CREATE TRIGGER on_auth_user_created_shorts
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_shorts_user();




