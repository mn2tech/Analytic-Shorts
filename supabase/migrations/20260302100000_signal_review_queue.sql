-- NM2TECH Signal Engine - Review queue for low-confidence predictions
CREATE TABLE IF NOT EXISTS signal_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  opportunity_id TEXT NOT NULL,
  label_type TEXT NOT NULL,
  predicted_value TEXT,
  confidence NUMERIC,
  needs_review BOOLEAN DEFAULT true,
  UNIQUE (opportunity_id, label_type)
);

CREATE INDEX IF NOT EXISTS idx_signal_review_queue_opportunity ON signal_review_queue(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_signal_review_queue_needs_review ON signal_review_queue(needs_review) WHERE needs_review = true;

COMMENT ON TABLE signal_review_queue IS 'NM2 Signal Engine - opportunities needing human review for label confirmation';
