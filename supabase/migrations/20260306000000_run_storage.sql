-- Storage buckets for /api/v1/run: datasets (input), results (output)
INSERT INTO storage.buckets (id, name, public)
VALUES ('datasets', 'datasets', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('results', 'results', false)
ON CONFLICT (id) DO NOTHING;

-- analytics_jobs: add result_path, finished_at for /run
ALTER TABLE public.analytics_jobs
  ADD COLUMN IF NOT EXISTS result_path TEXT;

ALTER TABLE public.analytics_jobs
  ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;
