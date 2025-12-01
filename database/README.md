# Database Setup Instructions

## Step 1: Open Supabase SQL Editor

1. Go to your Supabase project: https://supabase.com/dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New query**

## Step 2: Run the Schema

1. Open `database/schema.sql` file
2. Copy the entire contents
3. Paste into the Supabase SQL Editor
4. Click **Run** (or press Ctrl+Enter)

## Step 3: Verify Tables Were Created

1. Go to **Table Editor** in Supabase dashboard
2. You should see these tables:
   - `shorts_dashboards`
   - `shorts_file_uploads`
   - `shorts_usage_logs`
   - `shorts_subscriptions`

## Step 4: Verify RLS is Enabled

1. Click on any table (e.g., `dashboards`)
2. Go to **Policies** tab
3. You should see policies like:
   - "Users can view own dashboards"
   - "Users can insert own dashboards"
   - etc.

## What This Schema Does

### Tables Created:

1. **shorts_dashboards** - Stores user dashboards with all their data
2. **shorts_file_uploads** - Tracks which files users have uploaded
3. **shorts_usage_logs** - Logs user actions for usage tracking
4. **shorts_subscriptions** - Manages user subscription plans

### Security Features:

- **Row Level Security (RLS)** - Users can only see their own data
- **Automatic policies** - Users can only insert/update/delete their own records
- **Cascade deletes** - When a user is deleted, their data is automatically deleted

### Automatic Features:

- **Default subscription** - New users automatically get a 'free' subscription
- **Auto timestamps** - `updated_at` is automatically updated on changes
- **Indexes** - Fast queries on user_id and created_at

## Testing

After running the schema:

1. Sign up a new user in your app
2. Check Supabase Dashboard → Table Editor → `shorts_subscriptions`
3. You should see a new row with `plan: 'free'` for that user

## Next Steps

Once the database is set up:
1. Backend API routes will be created to interact with these tables
2. Frontend will be updated to save/load dashboards
3. Usage tracking will be implemented

