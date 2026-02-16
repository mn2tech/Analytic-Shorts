-- Stores admin-managed visibility for public API reports.
-- Run this in Supabase SQL editor for persistent hide/show behavior across restarts.

CREATE TABLE IF NOT EXISTS shorts_api_report_visibility (
  report_id TEXT PRIMARY KEY,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Keep update timestamp current when values change.
CREATE OR REPLACE FUNCTION update_api_report_visibility_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_shorts_api_report_visibility_updated_at ON shorts_api_report_visibility;
CREATE TRIGGER update_shorts_api_report_visibility_updated_at
  BEFORE UPDATE ON shorts_api_report_visibility
  FOR EACH ROW
  EXECUTE FUNCTION update_api_report_visibility_updated_at();
