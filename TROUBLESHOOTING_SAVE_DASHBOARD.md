# Troubleshooting: "Failed to save dashboard" Error

## Quick Checks

### 1. Check Browser Console (F12)
Open browser console and look for errors. Common errors:

**"Network Error" or "Failed to fetch"**
- Backend server is not running
- Backend is running on different port
- CORS issue

**"401 Unauthorized" or "Authentication required"**
- Not logged in
- Auth token expired
- Auth token not being sent

**"500 Internal Server Error" or "Database not configured"**
- Backend missing Supabase credentials
- Database tables not created

### 2. Check Backend Server

**Is backend running?**
```powershell
# Check if backend is running
# Should see: "🚀 Server running on http://localhost:5000"
```

**If not running:**
```powershell
cd backend
npm start
```

### 3. Check Backend Environment Variables

**Create `backend/.env` file:**
```env
SUPABASE_URL=https://ybpzhhzadvarebdclykl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlicHpoaHphZHZhcmViZGNseWtsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDc4MjA0NiwiZXhwIjoyMDcwMzU4MDQ2fQ.EZywrFOW2YJfUbchblAVsOxrxflsTEUjVibZkvjkW5Y
```

**Restart backend after adding:**
```powershell
# Stop backend (Ctrl+C)
# Then restart:
cd backend
npm start
```

### 4. Check Database Tables

**Have you run the SQL schema?**
1. Go to Supabase Dashboard → SQL Editor
2. Run `database/schema.sql`
3. Verify tables exist:
   - `shorts_dashboards`
   - `shorts_file_uploads`
   - `shorts_usage_logs`
   - `shorts_subscriptions`

**Check in Supabase:**
- Go to **Table Editor**
- You should see the `shorts_dashboards` table

### 5. Check Authentication

**Are you logged in?**
- Check navbar - should show your name/email, not "Sign In"
- If not logged in, login first

**Check auth token:**
- Open browser console (F12)
- Go to **Network** tab
- Click "Save Dashboard"
- Look for request to `/api/dashboards`
- Check **Headers** → **Authorization** - should have `Bearer <token>`

### 6. Check Backend Logs

**Look at backend terminal output:**
- Should see request logs
- Look for error messages
- Common errors:
  - "Supabase credentials not found"
  - "Database not configured"
  - "relation 'shorts_dashboards' does not exist" (tables not created)

## Step-by-Step Fix

### Step 1: Verify Backend is Running
```powershell
# In backend directory
npm start
# Should see: "🚀 Server running on http://localhost:5000"
```

### Step 2: Test Backend Health
Open browser: `http://localhost:5000/api/health`
Should see: `{"status":"ok","message":"NM2TECH Analytics Shorts API is running"}`

### Step 3: Test Dashboard Endpoint (with auth)
```powershell
# Get your auth token from browser console (Application → Local Storage → supabase.auth.token)
# Then test:
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/dashboards
```

### Step 4: Check Backend .env File
```powershell
# Make sure backend/.env exists with:
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Step 5: Verify Database Tables
1. Go to Supabase Dashboard
2. SQL Editor → Run `database/schema.sql`
3. Table Editor → Verify `shorts_dashboards` exists

### Step 6: Check Backend Dependencies
```powershell
cd backend
npm install @supabase/supabase-js
```

## Common Error Messages

### "Database not configured"
- **Fix:** Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to `backend/.env`
- Restart backend

### "relation 'shorts_dashboards' does not exist"
- **Fix:** Run the SQL schema in Supabase SQL Editor

### "Authentication required"
- **Fix:** Make sure you're logged in
- Check browser console for auth errors

### "Network Error"
- **Fix:** Backend server not running
- Check backend is on port 5000
- Check frontend can reach backend (check vite.config.js proxy)

### "CORS error"
- **Fix:** Backend CORS is configured, but check `backend/server.js` allows your frontend origin

## Still Not Working?

1. **Check browser console (F12)** - Look for specific error messages
2. **Check backend terminal** - Look for error logs
3. **Check Network tab** - See the actual API request/response
4. **Verify you're logged in** - Check navbar shows your name

## Test Checklist

- [ ] Backend server is running (`npm start` in backend folder)
- [ ] Backend `.env` file exists with Supabase credentials
- [ ] Database tables created (run schema.sql)
- [ ] Frontend can reach backend (test `/api/health`)
- [ ] User is logged in (navbar shows name, not "Sign In")
- [ ] Browser console shows no errors
- [ ] Network tab shows API request with 200 status (not 401, 500, etc.)


