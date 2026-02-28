# Online indicator (green dot) not showing

The green dot means "last active on Shorts within the last 3 minutes". If you're logged in but don't see it for yourself (or for others), check the following.

## 1. Run the database migration

The online indicator uses a `last_seen_at` column on `shorts_user_profiles`. If that column doesn't exist, the heartbeat fails and no one shows as online.

**In Supabase:** SQL Editor → run:

```sql
ALTER TABLE shorts_user_profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE;
```

(Or run the full file `database/migration_add_last_seen.sql`.)

## 2. Confirm the heartbeat is working

When you're logged in, the app calls `POST /api/profiles/me/seen` about every 30 seconds to update your `last_seen_at`.

- **Browser:** Open DevTools → Network tab → filter by "seen" or "profiles". You should see periodic `me/seen` requests with status 200.
- **Console:** In development, if the request fails you should see a warning:  
  `[Shorts] Presence heartbeat failed — run database/migration_add_last_seen.sql...`

If you see 4xx/5xx on `me/seen`, fix the backend (e.g. run the migration, check backend logs).

## 3. Where the green dot appears

- **Feed sidebar — "Who joined (recent)":** Small green dot on the **bottom-right of the avatar** for users active in the last 3 minutes. You must be in the "recent" list (up to 20 users); if you joined a while ago you might be outside that list.
- **Feed sidebar — "News from the feed":** Green dot next to the name in the "joined the feed" lines.
- **Profile page:** An **"Online"** pill with a green pulsing dot next to the name when that user was active in the last 3 minutes.

So you’ll see your own green dot on the **Feed** only if you’re in the recent signups list, and on **your profile page** when you open `/profile/<your-user-id>` (or your profile from the menu) if the heartbeat has run and the migration is in place.

## 4. Backend must return `last_seen_at`

- **GET /api/profiles/:userId** includes `last_seen_at` and `is_online`.
- **GET /api/analytics/community** includes `last_seen_at` for each entry in `recent_signups`.

If the migration wasn’t run, these fields will be missing or null and the UI will not show the indicator.
