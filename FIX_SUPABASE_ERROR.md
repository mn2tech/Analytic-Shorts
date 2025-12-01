# Fix Supabase Error

## ❌ Error You're Seeing

```
Error: Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.
```

## ✅ Solution

The `.env` file in the `backend` folder needs valid Supabase credentials.

### Step 1: Check Your `.env` File

Make sure `backend/.env` exists and has:

```env
PORT=5000
STRIPE_SECRET_KEY=sk_test_51RilIPCAL4InIKRQHV5dojJeHkbDZWmUCI8wNw92VTSIOqKiHNCuFrbPk1dX0VD4TajuAMFs3gB1PrmKva61Sw4200508lsk6x
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Step 2: Get Your Supabase Credentials

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → Use for `SUPABASE_URL`
   - **service_role key** (secret) → Use for `SUPABASE_SERVICE_ROLE_KEY`

### Step 3: Update `.env` File

Edit `backend/.env` and replace:
- `your-project-id.supabase.co` → Your actual Supabase URL
- `your_service_role_key_here` → Your actual service role key

**Important:** 
- URL must start with `https://`
- Example: `https://abcdefghijklmnop.supabase.co`

### Step 4: Restart Backend

Since you're already in the backend folder, just run:

```powershell
npm start
```

(No need for `cd backend` - you're already there!)

## 🔧 Alternative: Make Supabase Optional

If you don't have Supabase set up yet, I've updated the code to handle missing Supabase gracefully. The server should start, but usage limits won't work until Supabase is configured.

## ✅ Quick Fix Commands

**If you're in backend folder:**
```powershell
npm start
```

**If you're in project root:**
```powershell
cd backend
npm start
```

**To check if .env exists:**
```powershell
Test-Path backend\.env
```


