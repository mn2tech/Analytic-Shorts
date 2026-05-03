-- Persist Ask Claude / Custom tab DashboardSpec (JSON) on saved Shorts dashboards.
ALTER TABLE shorts_dashboards
ADD COLUMN IF NOT EXISTS custom_dashboard_spec jsonb DEFAULT NULL;
