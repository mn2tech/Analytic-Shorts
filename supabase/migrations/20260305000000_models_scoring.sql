-- Model Scoring as a Service: models table, analytics_jobs extensions, storage bucket

-- Models table
CREATE TABLE IF NOT EXISTS public.models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('joblib', 'pickle', 'pkl', 'onnx', 'xgboost', 'lightgbm')),
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_models_owner ON public.models(owner_id);

ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;

CREATE POLICY models_owner_select ON public.models
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY models_owner_insert ON public.models
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY models_owner_update ON public.models
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY models_owner_delete ON public.models
  FOR DELETE USING (auth.uid() = owner_id);

-- Add callback_url to analytics_jobs for webhook support
ALTER TABLE public.analytics_jobs
  ADD COLUMN IF NOT EXISTS callback_url TEXT;

-- Make dataset_id nullable for score jobs (no dataset, uses model + input)
ALTER TABLE public.analytics_jobs
  ALTER COLUMN dataset_id DROP NOT NULL;

-- Storage bucket for models (Supabase Storage)
INSERT INTO storage.buckets (id, name, public)
VALUES ('models', 'models', false)
ON CONFLICT (id) DO NOTHING;

-- Storage bucket for scoring results
INSERT INTO storage.buckets (id, name, public)
VALUES ('scoring-results', 'scoring-results', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for models bucket: users can CRUD their own folder
DROP POLICY IF EXISTS models_bucket_owner ON storage.objects;
CREATE POLICY models_bucket_owner ON storage.objects
  FOR ALL USING (
    bucket_id = 'models'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'models'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Note: Backend uses service role key which bypasses storage RLS for server-side operations.
