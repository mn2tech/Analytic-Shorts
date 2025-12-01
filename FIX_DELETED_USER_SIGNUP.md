# Fix: "Email Already Registered" After Deleting User

If you deleted a user from Supabase but still get "This email is already registered" error, try these steps:

## Step 1: Verify User is Actually Deleted

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Search for the email address
3. **Confirm the user is NOT in the list**
4. If the user still exists, delete it again

## Step 2: Clear Browser Storage

Supabase stores authentication data in browser storage. Clear it:

### Option A: Clear via Browser Settings
1. Open browser DevTools (F12)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Find **Local Storage** → Your app's domain
4. Delete all entries (especially anything with "supabase" in the name)
5. Find **Session Storage** → Your app's domain
6. Delete all entries
7. Refresh the page

### Option B: Clear via Console
Open browser console (F12) and run:

```javascript
// Clear all Supabase-related storage
localStorage.clear()
sessionStorage.clear()

// Reload the page
location.reload()
```

## Step 3: Wait for Supabase to Process Deletion

Sometimes Supabase needs a few moments to fully process a user deletion:

1. Wait **30-60 seconds** after deleting the user
2. Try signing up again

## Step 4: Check for Cached Sessions

Even if the user is deleted, there might be a cached session:

1. Open browser console (F12)
2. Run:
```javascript
// Check for Supabase session
const { data: { session } } = await supabase.auth.getSession()
console.log('Current session:', session)

// If session exists, sign out
if (session) {
  await supabase.auth.signOut()
  console.log('Signed out')
}
```

## Step 5: Try Incognito/Private Mode

1. Open a new **Incognito/Private** window
2. Go to your app
3. Try signing up with the same email
4. This bypasses any cached data

## Step 6: Check Supabase Database Tables

The user might be deleted from `auth.users` but still exist in your custom tables:

1. Go to **Supabase Dashboard** → **Table Editor**
2. Check these tables for the user's email or user_id:
   - `shorts_user_profiles`
   - `shorts_dashboards`
   - `shorts_file_uploads`
   - `shorts_usage_logs`
   - `shorts_subscriptions`
3. If found, delete those records too

## Step 7: Force Delete via Supabase SQL

If the user still exists but you can't see it in the UI:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run this query (replace `'user-email@example.com'` with the actual email):

```sql
-- Find the user
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email = 'user-email@example.com';

-- If user exists, delete it (CASCADE will delete related records)
DELETE FROM auth.users 
WHERE email = 'user-email@example.com';
```

**⚠️ Warning:** This permanently deletes the user and all related data!

## Step 8: Check for Multiple Supabase Projects

Make sure you're:
1. Deleting from the **correct Supabase project**
2. Using the **correct project credentials** in your `.env.local`

## Step 9: Verify Environment Variables

Make sure your app is using the correct Supabase project:

1. Check `.env.local` file:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
2. Verify these match the project where you deleted the user
3. Restart your dev server after changing `.env.local`

## Step 10: Try Different Email (Temporary Test)

To verify signup works at all:

1. Try signing up with a **completely different email** you've never used
2. If that works, the issue is specific to that email/user
3. If that also fails, there's a broader configuration issue

## Still Not Working?

If none of the above works:

1. **Check browser console** for the exact error message
2. **Check Supabase Dashboard** → **Authentication** → **Users** - is the user really gone?
3. **Try in a different browser** (Chrome, Firefox, Edge)
4. **Check Supabase logs**:
   - Go to **Supabase Dashboard** → **Logs** → **Auth Logs**
   - Look for any errors related to signup

## Quick Fix Script

Run this in browser console to completely reset auth state:

```javascript
// Get Supabase client (adjust import based on your setup)
import { supabase } from './lib/supabase'

// Sign out any existing session
await supabase.auth.signOut()

// Clear all storage
localStorage.clear()
sessionStorage.clear()

// Reload
location.reload()
```

Then try signing up again.


