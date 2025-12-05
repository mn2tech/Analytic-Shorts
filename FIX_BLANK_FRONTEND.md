# Fix Blank Frontend - Troubleshooting Guide

## 🔍 Quick Checks

### 1. Check Browser Console

**Most Important Step!**

1. Open `http://localhost:3000` in your browser
2. Press **F12** to open DevTools
3. Go to **Console** tab
4. Look for **red error messages**
5. **Copy and share the errors** - they'll tell us what's wrong

### 2. Check Network Tab

1. Press **F12** → **Network** tab
2. Refresh the page (F5)
3. Look for failed requests (red status codes)
4. Check if `main.jsx` or other files are loading

### 3. Common Issues & Fixes

#### Issue: Missing Supabase Environment Variables

**Error in console:**
```
Supabase credentials not found
```

**Fix:**
Create `.env.local` in project root with:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_API_URL=http://localhost:5000
```

#### Issue: JavaScript Error

**Error in console:**
```
Cannot read property 'X' of undefined
```

**Fix:**
- Check the error message
- Usually means a component is trying to access something that doesn't exist
- Share the error and I'll help fix it

#### Issue: Build/Compilation Error

**Error in terminal:**
```
Failed to compile
```

**Fix:**
- Check the terminal where `npm run dev` is running
- Look for error messages
- Fix the syntax/import errors shown

#### Issue: CORS Error

**Error in console:**
```
Access to fetch blocked by CORS policy
```

**Fix:**
- Make sure backend is running on port 5000
- Check `backend/.env` has correct `ALLOWED_ORIGINS`

### 4. Quick Fixes to Try

#### Fix 1: Clear Browser Cache

1. Press **Ctrl + Shift + Delete**
2. Select "Cached images and files"
3. Click "Clear data"
4. Refresh page (F5)

#### Fix 2: Hard Refresh

- **Windows:** `Ctrl + Shift + R`
- **Mac:** `Cmd + Shift + R`

#### Fix 3: Try Incognito/Private Mode

- **Chrome:** `Ctrl + Shift + N`
- **Firefox:** `Ctrl + Shift + P`
- **Edge:** `Ctrl + Shift + N`

#### Fix 4: Restart Frontend

1. Stop frontend (Ctrl + C in terminal)
2. Clear node cache:
   ```powershell
   Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
   ```
3. Restart:
   ```powershell
   npm run dev
   ```

#### Fix 5: Check Terminal Output

Look at the terminal where `npm run dev` is running:
- Should show: `Local: http://localhost:3000/`
- If there are errors, share them

### 5. Verify Files Exist

Check these files exist:
- ✅ `index.html` (in root)
- ✅ `src/main.jsx`
- ✅ `src/App.jsx`
- ✅ `src/index.css`

### 6. Check Environment Variables

Make sure `.env.local` exists in project root:
```env
VITE_API_URL=http://localhost:5000
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

## 🆘 Still Blank?

**Please share:**
1. **Browser console errors** (F12 → Console)
2. **Terminal output** (from `npm run dev`)
3. **Network tab** (F12 → Network → look for failed requests)
4. **What you see** (completely blank? loading spinner? error message?)

With this info, I can help fix it quickly!




