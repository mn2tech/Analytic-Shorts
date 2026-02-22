-- Social Analytics MVP: posts, likes, comments, saves, follows, live_sessions
-- Run in Supabase SQL Editor or via Supabase CLI
-- Tables use auth.users(id) for author_id / user_id

-- 1) posts
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  caption TEXT,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('private','org','public','unlisted')),
  tags TEXT[] DEFAULT '{}',
  thumbnail_url TEXT,
  kpi_summary JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2) post_likes
CREATE TABLE IF NOT EXISTS post_likes (
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

-- 3) post_comments
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4) post_saves
CREATE TABLE IF NOT EXISTS post_saves (
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

-- 5) follows (future-ready)
CREATE TABLE IF NOT EXISTS follows (
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- 6) live_sessions
CREATE TABLE IF NOT EXISTS live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  room_name TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended')),
  created_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

-- 7) live_session_participants
CREATE TABLE IF NOT EXISTS live_session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name TEXT,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('host','viewer')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_created ON post_comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_live_sessions_post_status ON live_sessions(post_id, status);
CREATE INDEX IF NOT EXISTS idx_live_sessions_room_name ON live_sessions(room_name);

-- Enable RLS on all tables
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_session_participants ENABLE ROW LEVEL SECURITY;

-- RLS: posts
-- select: public or own
CREATE POLICY posts_select ON posts FOR SELECT USING (
  visibility = 'public' OR author_id = auth.uid()
  -- TODO: org visibility: OR (visibility = 'org' AND author_id IN (SELECT ... FROM org_members WHERE user_id = auth.uid()))
);
CREATE POLICY posts_insert ON posts FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND author_id = auth.uid());
CREATE POLICY posts_update ON posts FOR UPDATE USING (author_id = auth.uid());
CREATE POLICY posts_delete ON posts FOR DELETE USING (author_id = auth.uid());

-- RLS: post_likes (select if post visible; insert/delete own)
CREATE POLICY post_likes_select ON post_likes FOR SELECT USING (
  EXISTS (SELECT 1 FROM posts p WHERE p.id = post_likes.post_id AND (p.visibility = 'public' OR p.author_id = auth.uid()))
);
CREATE POLICY post_likes_insert ON post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY post_likes_delete ON post_likes FOR DELETE USING (auth.uid() = user_id);

-- RLS: post_comments
CREATE POLICY post_comments_select ON post_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM posts p WHERE p.id = post_comments.post_id AND (p.visibility = 'public' OR p.author_id = auth.uid()))
);
CREATE POLICY post_comments_insert ON post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY post_comments_delete ON post_comments FOR DELETE USING (auth.uid() = user_id);

-- RLS: post_saves
CREATE POLICY post_saves_select ON post_saves FOR SELECT USING (
  EXISTS (SELECT 1 FROM posts p WHERE p.id = post_saves.post_id AND (p.visibility = 'public' OR p.author_id = auth.uid()))
);
CREATE POLICY post_saves_insert ON post_saves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY post_saves_delete ON post_saves FOR DELETE USING (auth.uid() = user_id);

-- RLS: follows (select own; insert/delete own rows)
CREATE POLICY follows_select ON follows FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = following_id);
CREATE POLICY follows_insert ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY follows_delete ON follows FOR DELETE USING (auth.uid() = follower_id);

-- RLS: live_sessions (select if post visible; insert authenticated, update only created_by)
CREATE POLICY live_sessions_select ON live_sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM posts p WHERE p.id = live_sessions.post_id AND (p.visibility = 'public' OR p.author_id = auth.uid()))
);
CREATE POLICY live_sessions_insert ON live_sessions FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());
CREATE POLICY live_sessions_update ON live_sessions FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY live_sessions_delete ON live_sessions FOR DELETE USING (created_by = auth.uid());

-- RLS: live_session_participants (select if session's post visible; insert/update for participation)
CREATE POLICY live_session_participants_select ON live_session_participants FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM live_sessions ls
    JOIN posts p ON p.id = ls.post_id
    WHERE ls.id = live_session_participants.session_id
      AND (p.visibility = 'public' OR p.author_id = auth.uid())
  )
);
CREATE POLICY live_session_participants_insert ON live_session_participants FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY live_session_participants_update ON live_session_participants FOR UPDATE USING (true);
