-- Add share_id to posts so a post can link to the full shared dashboard (map, filters, opportunity list, etc.)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS share_id TEXT;
