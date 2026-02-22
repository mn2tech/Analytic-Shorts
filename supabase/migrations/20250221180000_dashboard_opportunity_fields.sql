-- Add opportunity_keyword and selected_opportunity_notice_type to shorts_dashboards
-- so saved dashboards match shared dashboards (filters and base type for pie).
-- Run in Supabase SQL Editor or via Supabase CLI. Idempotent.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shorts_dashboards' AND column_name = 'opportunity_keyword'
  ) THEN
    ALTER TABLE shorts_dashboards ADD COLUMN opportunity_keyword TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shorts_dashboards' AND column_name = 'selected_opportunity_notice_type'
  ) THEN
    ALTER TABLE shorts_dashboards ADD COLUMN selected_opportunity_notice_type VARCHAR(100);
  END IF;
END $$;
