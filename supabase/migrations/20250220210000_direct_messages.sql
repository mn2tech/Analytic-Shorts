-- Direct messages between members (for "message other members" on the feed)
CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  read_at TIMESTAMPTZ,
  CHECK (from_user_id != to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_direct_messages_from ON direct_messages(from_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_to ON direct_messages(to_user_id, created_at DESC);
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Users can only see messages where they are sender or recipient (backend uses service role; this is for direct Supabase client if needed)
CREATE POLICY direct_messages_select ON direct_messages FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY direct_messages_insert ON direct_messages FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

COMMENT ON TABLE direct_messages IS 'DMs between feed members';
