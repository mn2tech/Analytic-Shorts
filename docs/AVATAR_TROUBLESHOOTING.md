# Why profile pictures (avatars) don’t show in “Who joined”

Avatars in the Feed sidebar come from **`shorts_user_profiles.avatar_url`**. If everyone shows initials instead of photos, check the following.

## 1. Same Supabase project everywhere

The **frontend** (Profile page) writes to Supabase using **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_ANON_KEY`**.  
The **backend** (community API) reads from **`SUPABASE_URL`** and **`SUPABASE_SERVICE_ROLE_KEY`**.

If these point to **different** Supabase projects (e.g. dev vs prod), then:

- Avatars are saved in project A (frontend).
- The Feed reads from project B (backend), where `avatar_url` is never set.

**Check:** In your backend `.env`, ensure `SUPABASE_URL` is the same project as `VITE_SUPABASE_URL` in the frontend env (e.g. `.env.local`). Same project = same database and same `shorts_user_profiles` table.

## 2. `avatar_url` column exists and has data

The table must have an `avatar_url` column and profiles must have URLs stored there.

**Run in Supabase SQL Editor** (same project as your app):

```sql
-- Ensure column exists
ALTER TABLE shorts_user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- See who has avatars set
SELECT user_id, name,
       CASE WHEN avatar_url IS NOT NULL AND trim(avatar_url) != '' THEN 'yes' ELSE 'no' END AS has_avatar,
       left(avatar_url, 80) AS avatar_preview
FROM shorts_user_profiles
ORDER BY created_at DESC
LIMIT 20;
```

If `has_avatar` is always `no`, then either:

- No one has uploaded a profile picture yet, or  
- The frontend is writing to a **different** Supabase project (see step 1).

## 3. Storage bucket is public

Profile pictures are stored in the **`avatars`** storage bucket. The URL in `avatar_url` is a “public” URL. If the bucket is **private**, the browser will get **403** when loading the image and the UI will fall back to initials.

**In Supabase Dashboard:**

1. Go to **Storage**.
2. Open the **`avatars`** bucket.
3. Set the bucket to **Public** (or add a policy that allows public read for that bucket).

After making it public, existing `avatar_url` values will work without changing the database.

## 4. Quick API check

Call the community endpoint and see if `avatar_url` is present:

```bash
curl -s "http://localhost:5000/api/analytics/community" | jq '.recent_signups[] | {name, avatar_url}'
```

- If `avatar_url` is always `null`, the problem is in the **database** or **backend project** (steps 1 and 2).
- If `avatar_url` has URLs but the Feed still shows initials, the problem is usually **Storage** (step 3: bucket not public).

## Summary

| Symptom | Likely cause |
|--------|----------------|
| API returns `avatar_url: null` for everyone | Wrong Supabase project in backend env, or `avatar_url` column missing/empty (run the SQL above). |
| API returns URLs but images don’t load (initials shown) | `avatars` bucket is private → make it public in Supabase Storage. |
