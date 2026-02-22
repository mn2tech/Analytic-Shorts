-- Jobs (admin-posted) and user resumes for community careers section

-- Job postings (admin only to create/update/delete)
CREATE TABLE IF NOT EXISTS job_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT,
  employment_type TEXT CHECK (employment_type IN ('full-time', 'part-time', 'contract', 'internship', 'other')),
  apply_url TEXT,
  posted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_postings_created ON job_postings(created_at DESC);
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;

CREATE POLICY job_postings_select ON job_postings FOR SELECT USING (true);
-- Insert/update/delete enforced by backend (admin check); allow service role
CREATE POLICY job_postings_all ON job_postings FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE job_postings IS 'Job listings posted by admins for the community';

-- User resumes (any member can add one; displayed like job cards)
CREATE TABLE IF NOT EXISTS user_resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  headline TEXT NOT NULL,
  summary TEXT NOT NULL,
  resume_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_resumes_created ON user_resumes(created_at DESC);
ALTER TABLE user_resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_resumes_select ON user_resumes FOR SELECT USING (true);
CREATE POLICY user_resumes_insert ON user_resumes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_resumes_update ON user_resumes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_resumes_delete ON user_resumes FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE user_resumes IS 'Member resumes for careers section; one per user';
