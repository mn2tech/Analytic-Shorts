-- Persist react-grid-layout snapshot per saved dashboard (Studio / Visual Builder).
ALTER TABLE shorts_dashboards
ADD COLUMN IF NOT EXISTS grid_layout jsonb DEFAULT NULL;
