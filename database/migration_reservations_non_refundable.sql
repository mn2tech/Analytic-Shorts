-- Non-refundable rate flag: suppress automatic overpayment refunds on early departure
-- while still allowing optional proration of room/tax to nights stayed.
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS non_refundable BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.reservations.non_refundable IS 'When true, early-checkout proration does not post automatic refund ledger entries for overpayment.';
