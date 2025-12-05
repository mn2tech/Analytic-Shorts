# Fix: "Database error saving new user"

This error occurs when the user is created in Supabase Auth, but the database trigger that creates the user profile fails.

## Quick Fix Steps:

### Step 1: Verify Database Schema is Run

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Check if the trigger exists by running:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created_shorts';
   ```
3. If it doesn't exist, run the full `database/schema.sql` file

### Step 2: Check if Tables Exist

Run this in Supabase SQL Editor:
```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('shorts_user_profiles', 'shorts_subscriptions');
```

Both tables should exist. If not, run `database/schema.sql`.

### Step 3: Check if Function Exists

Run this in Supabase SQL Editor:
```sql
-- Check if function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'create_default_shorts_user';
```

If it doesn't exist, the trigger can't work.

### Step 4: Recreate the Trigger (If Needed)

If the trigger or function is missing, run this in Supabase SQL Editor:

```sql
-- Recreate the function
CREATE OR REPLACE FUNCTION create_default_shorts_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user profile (with error handling)
  INSERT INTO shorts_user_profiles (id, user_id, name)
  VALUES (NEW.id, NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  
  -- Create default subscription (with error handling)
  INSERT INTO shorts_subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created_shorts ON auth.users;

CREATE TRIGGER on_auth_user_created_shorts
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_shorts_user();
```

### Step 5: Check RLS Policies

Make sure RLS policies allow the trigger to insert:

```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('shorts_user_profiles', 'shorts_subscriptions');
```

The trigger uses `SECURITY DEFINER`, so it should bypass RLS, but verify the policies exist.

### Step 6: Test the Trigger Manually

After fixing, test by creating a test user:

```sql
-- This should trigger the function
-- (You'll need to do this through Supabase Auth UI or your app)
```

Then check if profile was created:

```sql
SELECT * FROM shorts_user_profiles ORDER BY created_at DESC LIMIT 1;
SELECT * FROM shorts_subscriptions ORDER BY created_at DESC LIMIT 1;
```

## Common Causes:

1. **Schema not run** - The trigger/function doesn't exist
2. **Tables missing** - `shorts_user_profiles` or `shorts_subscriptions` don't exist
3. **RLS blocking** - Row Level Security is blocking the insert (shouldn't happen with SECURITY DEFINER)
4. **Function error** - The function has a bug

## Quick Test:

Run this in Supabase SQL Editor to see what's missing:

```sql
-- Check what exists
SELECT 'Tables' as type, table_name as name
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'shorts_%'
UNION ALL
SELECT 'Functions' as type, routine_name as name
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%shorts%'
UNION ALL
SELECT 'Triggers' as type, trigger_name as name
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name LIKE '%shorts%';
```

This will show you what's missing.




