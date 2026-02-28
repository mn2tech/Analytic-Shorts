-- Run this in Supabase SQL Editor to verify avatar setup for "Who joined" / Feed.
-- 1. Ensure avatar_url column exists
ALTER TABLE shorts_user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. See who has avatars set (run as a query to inspect)
SELECT user_id, name, 
       CASE WHEN avatar_url IS NOT NULL AND trim(avatar_url) != '' THEN 'yes' ELSE 'no' END AS has_avatar,
       left(avatar_url, 60) AS avatar_preview
FROM shorts_user_profiles
ORDER BY created_at DESC
LIMIT 20;
