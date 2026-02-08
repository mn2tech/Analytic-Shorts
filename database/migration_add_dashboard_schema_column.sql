-- Add schema column to shorts_dashboards for storing full Studio/AI Visual Builder dashboard spec (DashboardSpec JSON).
-- Run this if the column is missing; safe to run multiple times.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'shorts_dashboards'
      AND column_name = 'schema'
  ) THEN
    ALTER TABLE shorts_dashboards
    ADD COLUMN schema JSONB;
    COMMENT ON COLUMN shorts_dashboards.schema IS 'Full dashboard spec (DashboardSpec) for Studio/AI Visual Builder apps.';
  END IF;
END $$;
