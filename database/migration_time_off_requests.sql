-- Contractor portal: time-off requests (separate from legacy contractor_time_off_requests if present).
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS time_off_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  type TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_off_requests_user ON time_off_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_created ON time_off_requests(created_at DESC);

ALTER TABLE time_off_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own time off requests" ON time_off_requests;
DROP POLICY IF EXISTS "Users insert own time off requests" ON time_off_requests;

CREATE POLICY "Users read own time off requests"
  ON time_off_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own time off requests"
  ON time_off_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);
