# Force Restart Backend - Route Not Found Fix

## 🔍 The Problem

The route `/api/subscription/checkout` returns "Route not found" even though:
- ✅ Backend is running (health check works)
- ✅ Route is defined in code
- ✅ Server.js registers the route

**This means the subscription routes file isn't loading when the server starts.**

## ✅ Solution: Force Restart

The backend process might be an old one that started before we fixed the webhook route.

### Step 1: Stop ALL Backend Processes

```powershell
# Find and kill process on port 5000
$process = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($process) { 
    Stop-Process -Id $process -Force
    Write-Host "✅ Stopped backend process $process"
}
```

### Step 2: Wait 2 Seconds

```powershell
Start-Sleep -Seconds 2
```

### Step 3: Start Backend Fresh

```powershell
cd backend
npm start
```

**Look for:**
- ✅ `🚀 Server running on http://localhost:5000`
- ⚠️ Warnings about Supabase/Stripe (OK)
- ❌ Any red errors (bad - share them)

### Step 4: Test the Route

After restart, the route should work. Test it:

```powershell
# Should return 401 (auth required) or 400 (missing priceId), NOT 404
curl http://localhost:5000/api/subscription/checkout -Method POST -ContentType "application/json" -Body '{"priceId":"test"}'
```

If you get **404**, the routes still aren't loading. If you get **401** or **400**, the route is working!

## 🔧 Alternative: Check if Routes Are Loading

Add this to `backend/server.js` after line 58:

```javascript
console.log('📋 Registered routes:')
console.log('  - /api/subscription (checkout, portal, usage)')
```

If you don't see this message, the routes aren't loading.

## 🆘 Still Not Working?

If routes still don't load after restart:

1. **Check backend terminal** for errors when starting
2. **Share the full startup output**
3. **Check if subscription.js has syntax errors**

The most likely issue is the backend process is old and needs a fresh restart.


