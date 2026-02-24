-- Ensure shorts_dashboards has schema (JSONB) for Studio dashboard save.
-- Safe to run multiple times.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'shorts_dashboards'
      AND column_name = 'schema'
  ) THEN
    ALTER TABLE shorts_dashboards ADD COLUMN schema JSONB;
    COMMENT ON COLUMN shorts_dashboards.schema IS 'Full dashboard spec for Studio/AI Visual Builder (aaiStudioRun or DashboardSpec).';
  END IF;
END $$;
