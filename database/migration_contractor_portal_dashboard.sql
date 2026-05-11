-- Contractor portal: profile row (HR / billing fields) and time-off requests.
-- Run in the same Supabase project as contractor portal auth.

CREATE TABLE IF NOT EXISTS contractor_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  company TEXT,
  role TEXT,
  hourly_rate NUMERIC(10, 2),
  start_date DATE,
  payment_terms TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contractor_profiles_user_id ON contractor_profiles(user_id);

CREATE TABLE IF NOT EXISTS contractor_time_off_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contractor_time_off_user ON contractor_time_off_requests(user_id);

ALTER TABLE contractor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_time_off_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contractors read own profile" ON contractor_profiles;
DROP POLICY IF EXISTS "contractors upsert own profile" ON contractor_profiles;
DROP POLICY IF EXISTS "contractors update own profile" ON contractor_profiles;

CREATE POLICY "contractors read own profile"
  ON contractor_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "contractors insert own profile"
  ON contractor_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contractors update own profile"
  ON contractor_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "contractors read own time off" ON contractor_time_off_requests;
DROP POLICY IF EXISTS "contractors insert own time off" ON contractor_time_off_requests;

CREATE POLICY "contractors read own time off"
  ON contractor_time_off_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "contractors insert own time off"
  ON contractor_time_off_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);
