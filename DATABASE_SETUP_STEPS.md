# Database & Multi-Tenancy Setup Steps

## Step 1: Set Up Database in Supabase

1. **Go to Supabase SQL Editor:**
   - Open https://supabase.com/dashboard
   - Select your project
   - Click **SQL Editor** in the left sidebar
   - Click **New query**

2. **Run the Schema:**
   - Open `database/schema.sql` file
   - Copy the entire contents
   - Paste into Supabase SQL Editor
   - Click **Run** (or press Ctrl+Enter)

3. **Verify Tables:**
   - Go to **Table Editor** in Supabase dashboard
   - You should see 4 tables:
     - `shorts_dashboards`
     - `shorts_file_uploads`
     - `shorts_usage_logs`
     - `shorts_subscriptions`

## Step 2: Install Backend Dependencies

**On Windows (local):**
```powershell
cd C:\Users\kolaw\Projects\NM2-Analytics-Shorts\backend
npm install @supabase/supabase-js
```

**On Linux (EC2) - when ready:**
```bash
cd ~/Analytic-Shorts/backend
npm install @supabase/supabase-js
```

## Step 3: Add Backend Environment Variables

**On Windows - create `backend/.env`:**
```env
SUPABASE_URL=https://ybpzhhzadvarebdclykl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlicHpoaHphZHZhcmViZGNseWtsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDc4MjA0NiwiZXhwIjoyMDcwMzU4MDQ2fQ.EZywrFOW2YJfUbchblAVsOxrxflsTEUjVibZkvjkW5Y
```

**Important:** 
- Use the **service_role** key (not anon key) for backend
- This key has admin privileges - keep it secret!
- Never commit this to git

## Step 4: Test the Setup

1. **Start Backend:**
   ```powershell
   cd backend
   npm start
   ```

2. **Start Frontend:**
   ```powershell
   npm run dev
   ```

3. **Test Save Dashboard:**
   - Login to your app
   - Upload a file or use example data
   - Click "Save Dashboard" button
   - Check Supabase Dashboard → Table Editor → `shorts_dashboards`
   - You should see a new row with your dashboard data

## Step 5: Verify Multi-Tenancy

1. **Create two test users:**
   - Sign up with email1@test.com
   - Sign up with email2@test.com

2. **Save dashboards for each:**
   - Login as user1, save a dashboard
   - Login as user2, save a dashboard

3. **Check Supabase:**
   - Go to `shorts_dashboards` table
   - Each dashboard should have a different `user_id`
   - Users can only see their own dashboards (RLS enforces this)

## What's Working Now

✅ **Database tables created** with proper structure
✅ **Row Level Security (RLS)** - Users can only access their own data
✅ **Backend API** - `/api/dashboards` endpoints
✅ **Frontend service** - Functions to save/load dashboards
✅ **Save button** - Added to Dashboard page
✅ **Automatic subscription** - New users get 'free' plan automatically

## Next Steps

1. ✅ Database schema - Done
2. ✅ Backend routes - Done
3. ✅ Frontend save functionality - Done
4. 📝 Add "Load Dashboard" feature (list saved dashboards)
5. 📝 Add "My Dashboards" page
6. 📝 Track file uploads in database
7. 📝 Implement usage limits based on subscription

## Troubleshooting

### "Database not configured" error
- Check `backend/.env` has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Restart backend server after adding env vars

### "Authentication required" error
- Make sure you're logged in
- Check browser console for auth token errors
- Verify Supabase credentials in frontend `.env.local`

### Can't see dashboards in Supabase
- Check RLS policies are enabled
- Verify you're looking at the correct user_id
- Check browser console for API errors

### Save button not working
- Check browser console (F12) for errors
- Verify backend is running
- Check network tab for API request/response

