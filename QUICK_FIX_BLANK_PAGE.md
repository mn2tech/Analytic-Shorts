# Quick Fix for Blank Frontend

## 🔍 Step 1: Check Browser Console (MOST IMPORTANT!)

1. Open `http://localhost:3000`
2. Press **F12** (opens DevTools)
3. Click **Console** tab
4. **Look for red error messages**
5. **Copy the errors and share them**

This will tell us exactly what's wrong!

## 🔧 Step 2: Quick Fixes to Try

### Fix 1: Hard Refresh
- Press **Ctrl + Shift + R** (Windows) or **Cmd + Shift + R** (Mac)

### Fix 2: Clear Browser Cache
1. Press **Ctrl + Shift + Delete**
2. Select "Cached images and files"
3. Click "Clear data"
4. Refresh page

### Fix 3: Check Terminal
Look at the terminal where `npm run dev` is running:
- Should show: `Local: http://localhost:3000/`
- If there are errors, share them

### Fix 4: Create `.env.local` File

Create a file named `.env.local` in the **project root** with:

```env
VITE_API_URL=http://localhost:5000
VITE_SUPABASE_URL=https://placeholder.supabase.co
VITE_SUPABASE_ANON_KEY=placeholder-key
```

**Note:** Use placeholder values if you don't have Supabase set up yet. The app will work, but auth features won't function.

### Fix 5: Restart Frontend

```powershell
# Stop frontend (Ctrl + C)
# Then restart:
npm run dev
```

## 🆘 What to Share

If it's still blank, please share:

1. **Browser console errors** (F12 → Console → copy red errors)
2. **Terminal output** (from `npm run dev`)
3. **What you see** (completely blank? loading spinner?)

## ✅ Most Common Issue

**Missing Supabase credentials** - I've updated the code to handle this gracefully. The app should work now even without Supabase, but you'll need to create `.env.local` with at least:

```env
VITE_API_URL=http://localhost:5000
```

Try restarting the frontend after creating this file!


