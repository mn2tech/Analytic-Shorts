-- Contractor portal: access flag separate from profile "role" (job title in Analytics Shorts).
-- Run in Supabase SQL Editor for the same project as Timesheet + Shorts.

ALTER TABLE shorts_user_profiles
  ADD COLUMN IF NOT EXISTS portal_access VARCHAR(32) NOT NULL DEFAULT 'none';

COMMENT ON COLUMN shorts_user_profiles.portal_access IS
  'Portal access: none | contractor. Use instead of job-title role for contractor portal.';

-- Optional: backfill existing contractors if you already used role = 'contractor' for access.
UPDATE shorts_user_profiles
SET portal_access = 'contractor'
WHERE portal_access = 'none'
  AND LOWER(TRIM(COALESCE(role, ''))) = 'contractor';
