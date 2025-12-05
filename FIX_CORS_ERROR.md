# 🔧 Fix: "Not allowed by CORS" Error

## ❌ The Problem

Your frontend is running on `http://192.168.1.151:3003`, but your backend's `ALLOWED_ORIGINS` in `backend/.env` doesn't include this URL.

**Current `ALLOWED_ORIGINS`:**
```
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

**Your frontend URL:**
```
http://192.168.1.151:3003
```

---

## ✅ Quick Fix

### Update `backend/.env`

Add your frontend URL to `ALLOWED_ORIGINS`:

```env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://192.168.1.151:3003
```

**Or** if you want to allow all origins (for development):

```env
ALLOWED_ORIGINS=*
```

---

## 🔄 After Updating

**Restart your backend server:**

```powershell
# Stop backend (Ctrl+C)
# Then restart:
cd backend
node server.js
```

---

## ✅ Test

After restarting, try checkout again. The CORS error should be fixed!

---

## 📝 Your Complete `backend/.env` Should Have:

```env
PORT=5000

STRIPE_SECRET_KEY=sk_live_YOUR_SECRET_KEY_HERE

SUPABASE_URL=https://ybpzhhzadvarebdclykl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlicHpoaHphZHZhcmViZGNseWtsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDc4MjA0NiwiZXhwIjoyMDcwMzU4MDQ2fQ.EZywrFOW2YJfUbchblAVsOxrxflsTEUjVibZkvjkW5Y

FRONTEND_URL=http://192.168.1.151:3003

ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://192.168.1.151:3003
```

---

**Update `ALLOWED_ORIGINS` and restart the backend!** 🚀

