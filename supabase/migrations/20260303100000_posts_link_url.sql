-- Add link_url for "Add to Feed" template/link posts (Hospital Bed Command Center, Federal Entry Report).
-- When dashboard_id = 'link', the post is a link post and link_url points to the page.
ALTER TABLE posts ADD COLUMN IF NOT EXISTS link_url TEXT;
