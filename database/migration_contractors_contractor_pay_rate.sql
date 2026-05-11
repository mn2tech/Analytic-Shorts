-- NM2TECH pay vs Prime billing: add a column for what we pay the contractor.
-- Existing `rate` on `contractors` stays for invoicing / Prime (NM2TECH → Onyx); do not expose that in the contractor portal.
-- Run in Supabase SQL Editor.

ALTER TABLE contractors
  ADD COLUMN IF NOT EXISTS contractor_pay_rate NUMERIC(10, 2);

COMMENT ON COLUMN contractors.contractor_pay_rate IS
  'Hourly rate NM2TECH pays this contractor. Not the Prime/client billing amount in `rate`.';
