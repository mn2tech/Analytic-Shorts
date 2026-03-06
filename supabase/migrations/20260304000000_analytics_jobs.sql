-- Analytics jobs for Execution API
CREATE TABLE IF NOT EXISTS analytics_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id TEXT NOT NULL,
  engine TEXT NOT NULL DEFAULT 'python',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  spec JSONB NOT NULL,
  mode TEXT DEFAULT 'spec' CHECK (mode IN ('spec', 'sas_proc')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  error_message TEXT,
  tokens_used INTEGER,
  logs TEXT
);

CREATE TABLE IF NOT EXISTS analytics_job_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES analytics_jobs(id) ON DELETE CASCADE,
  result JSONB NOT NULL,
  preview JSONB,
  storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_jobs_status ON analytics_jobs(status);
CREATE INDEX IF NOT EXISTS idx_analytics_jobs_created ON analytics_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_job_results_job ON analytics_job_results(job_id);

ALTER TABLE analytics_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_job_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY analytics_jobs_all ON analytics_jobs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY analytics_job_results_all ON analytics_job_results FOR ALL USING (true) WITH CHECK (true);
