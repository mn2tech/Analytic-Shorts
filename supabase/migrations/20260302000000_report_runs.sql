-- Federal Entry Intelligence Report runs
CREATE TABLE IF NOT EXISTS report_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  input_json JSONB NOT NULL DEFAULT '{}',
  data_json JSONB,
  summary_json JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_report_runs_created_at ON report_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_runs_status ON report_runs(status);

COMMENT ON TABLE report_runs IS 'Federal Entry Intelligence Report run storage';
