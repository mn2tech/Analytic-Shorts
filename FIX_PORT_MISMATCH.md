# 🔧 Fix Port Mismatch Issue

## ❌ Problem Identified

**Your frontend is on port 3004, but:**
- Vite proxy is configured for port 3000
- Backend should be on port 5000
- The proxy only works when frontend runs on the configured port

---

## ✅ Solution Options

### Option 1: Use Port 3000 for Frontend (Recommended)

**Vite is configured to run on port 3000 with proxy to backend on 5000:**

1. **Stop** your current frontend (Ctrl+C)
2. **Start** frontend on port 3000:
   ```powershell
   npm run dev
   ```
3. **Access** frontend at: `http://localhost:3000`
4. **The proxy will work** - `/api` requests will go to `http://localhost:5000`

**This is the easiest fix!**

---

### Option 2: Update Vite Config for Port 3004

**If you need to use port 3004:**

1. **Update** `vite.config.js`:
   ```javascript
   server: {
     port: 3004,  // Change from 3000 to 3004
     host: '0.0.0.0',
     proxy: {
       '/api': {
         target: 'http://localhost:5000',
         changeOrigin: true
       }
     }
   }
   ```

2. **Restart** frontend:
   ```powershell
   npm run dev
   ```

---

### Option 3: Use Direct Backend URL

**If proxy isn't working, use direct backend URL:**

1. **Create/update** `.env.local`:
   ```env
   VITE_API_URL=http://localhost:5000
   ```

2. **Restart** frontend:
   ```powershell
   npm run dev
   ```

**This bypasses the proxy and calls backend directly.**

---

## 🔍 Step 1: Verify Backend is Running

**Make sure backend is running on port 5000:**

1. **Check** backend console
2. **Should see:** `🚀 Server running on http://localhost:5000`
3. **If not running:**
   ```powershell
   cd backend
   npm run dev
   ```

---

## 🔍 Step 2: Check Current Setup

**What port is your frontend actually running on?**

- If it's 3004, the proxy won't work (proxy is for port 3000)
- If it's 3000, the proxy should work

**What port is your backend running on?**

- Should be 5000 (as per `.env` and Vite proxy config)

---

## 🚀 Quick Fix (Recommended)

**Use port 3000 for frontend:**

1. **Stop** frontend (Ctrl+C)
2. **Start** frontend:
   ```powershell
   npm run dev
   ```
3. **Access** at: `http://localhost:3000`
4. **Test** checkout - should work now!

**The proxy will automatically forward `/api` requests to `http://localhost:5000`.**

---

## 📝 Summary

**The issue:**
- Frontend on port 3004
- Vite proxy configured for port 3000
- Proxy doesn't work on wrong port

**The fix:**
- Use port 3000 for frontend (easiest)
- Or update Vite config for port 3004
- Or use direct backend URL in `.env.local`

---

**Try using port 3000 for frontend - that's the quickest fix!** 🚀

The proxy is already configured correctly, you just need to use the right port.

