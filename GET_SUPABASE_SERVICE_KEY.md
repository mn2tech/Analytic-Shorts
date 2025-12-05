# Get Supabase Service Role Key

## 🔍 The Issue

Your `backend/.env` needs the **Supabase Service Role Key** (not the anon key).

## ✅ Step-by-Step

### Step 1: Go to Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/ybpzhhzadvarebdclykl/settings/api
2. Or navigate: **Project Settings** → **API**

### Step 2: Find Service Role Key

1. Scroll down to **"Project API keys"** section
2. You'll see two keys:
   - **anon** `public` key (this is what's in your frontend)
   - **service_role** `secret` key ← **This is what we need!**

3. **⚠️ Important:** The service_role key has admin privileges - keep it secret!

### Step 3: Copy the Service Role Key

1. Find the **service_role** key
2. Click **"Reveal"** or **"Copy"** button
3. It starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (long JWT token)

### Step 4: Add to backend/.env

1. Open `backend/.env` file
2. Replace this line:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```
   
3. With your actual service role key:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### Step 5: Restart Backend

After updating `backend/.env`:

```powershell
# Stop backend (Ctrl+C)
cd backend
npm start
```

## 🎯 Quick Link

**Direct link to your API settings:**
https://supabase.com/dashboard/project/ybpzhhzadvarebdclykl/settings/api

## ⚠️ Security Note

- ✅ **Service Role Key** = Backend only (has admin access)
- ✅ **Anon Key** = Frontend (limited permissions)
- ❌ **Never** put Service Role Key in frontend code!

## ✅ After Adding the Key

1. Restart backend
2. Test checkout again
3. Should work! 🚀

---

**Once you have the Service Role Key, paste it here and I'll add it to your backend/.env file!**

