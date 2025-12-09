# ✅ Test CORS Headers

## ✅ Backend is Working!

The backend is accessible and responding correctly! ✅

**Now let's test if CORS headers are being sent:**

---

## ✅ Step 1: Test CORS Headers with curl

**On EC2, test if CORS headers are being sent:**

```bash
curl -H "Origin: https://main.d2swtp6vppsxta.amplifyapp.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://api.nm2tech-sas.com/api/upload \
     -v
```

**Look for these headers in the response:**
- ✅ `Access-Control-Allow-Origin: https://main.d2swtp6vppsxta.amplifyapp.com`
- ✅ `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- ✅ `Access-Control-Allow-Credentials: true`

**If you see these headers:** CORS is configured correctly ✅

**If you DON'T see them:** CORS is not working, need to restart PM2

---

## ✅ Step 2: Check ALLOWED_ORIGINS

**Verify the `.env` file has the correct origin:**

```bash
cat .env | grep ALLOWED_ORIGINS
```

**Should show:**
```
ALLOWED_ORIGINS=https://main.d2swtp6vppsxta.amplifyapp.com
```

**If it's different or missing:**
- Edit `.env`: `nano .env`
- Make sure it has: `ALLOWED_ORIGINS=https://main.d2swtp6vppsxta.amplifyapp.com`
- Save and restart PM2: `pm2 restart analytics-api --update-env`

---

## ✅ Step 3: Restart PM2 (If CORS Headers Missing)

**If CORS headers are missing, restart PM2:**

```bash
pm2 restart analytics-api --update-env
```

**Verify it restarted:**

```bash
pm2 logs analytics-api --lines 10
```

**Should see:**
```
🚀 Server running on http://localhost:5000
```

---

## ✅ Step 4: Test Again from Browser

**After restarting, test from browser console:**

1. **Go to:** `https://main.d2swtp6vppsxta.amplifyapp.com/`
2. **Open browser console** (F12)
3. **Run:**
   ```javascript
   fetch('https://api.nm2tech-sas.com/api/health')
     .then(r => r.json())
     .then(console.log)
     .catch(console.error)
   ```

**Should return:** `{status: "ok", message: "NM2TECH Analytics Shorts API is running"}`

**If you still see CORS error:**
- Check backend logs: `pm2 logs analytics-api`
- Try allowing all origins: `ALLOWED_ORIGINS=*`

---

**Test CORS headers with the curl command above!** 🔍

The backend is working - now we need to verify CORS headers are being sent.

