# ✅ Test Backend from EC2 Terminal

## ❌ JavaScript Doesn't Work in Bash

**You tried to run JavaScript in a bash terminal - that won't work!**

**Use `curl` instead to test the backend from EC2.**

---

## ✅ Step 1: Test Backend Health from EC2

**On EC2, use curl to test:**

```bash
curl https://api.nm2tech-sas.com/api/health
```

**Should return:**
```json
{"status":"ok","message":"NM2TECH Analytics Shorts API is running"}
```

**If it works:** Backend is accessible ✅

---

## ✅ Step 2: Test CORS Headers

**Test if CORS headers are being sent:**

```bash
curl -H "Origin: https://main.d2swtp6vppsxta.amplifyapp.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://api.nm2tech-sas.com/api/upload \
     -v
```

**Look for these headers in the response:**
- `Access-Control-Allow-Origin: https://main.d2swtp6vppsxta.amplifyapp.com`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Credentials: true`

**If you see these headers:** CORS is configured correctly ✅

**If you don't see them:** CORS is not working, check `.env` and restart PM2

---

## ✅ Step 3: Test from Browser Console (Not SSH)

**The JavaScript fetch code should be run in the browser, not SSH:**

1. **Go to:** `https://main.d2swtp6vppsxta.amplifyapp.com/`
2. **Open browser console** (F12)
3. **Run:**
   ```javascript
   fetch('https://api.nm2tech-sas.com/api/health')
     .then(r => r.json())
     .then(console.log)
     .catch(console.error)
   ```

**This will test CORS from the browser (where it matters).**

---

## ✅ Step 4: Verify ALLOWED_ORIGINS

**On EC2, check the `.env` file:**

```bash
cd /home/raj/Analytic-Shorts/backend
cat .env | grep ALLOWED_ORIGINS
```

**Should show:**
```
ALLOWED_ORIGINS=https://main.d2swtp6vppsxta.amplifyapp.com
```

**If it's different, update it and restart PM2:**

```bash
# Edit .env
nano .env

# Make sure it has:
ALLOWED_ORIGINS=https://main.d2swtp6vppsxta.amplifyapp.com

# Save: Ctrl+X, Y, Enter

# Restart PM2
pm2 restart analytics-api --update-env
```

---

## ✅ Step 5: Check Backend Logs

**Check if requests are reaching the backend:**

```bash
pm2 logs analytics-api --lines 50
```

**Look for:**
- CORS errors
- Request logs when you try to upload
- Any errors

---

## 📝 Quick Test Commands

**On EC2 (bash):**
```bash
# Test health endpoint
curl https://api.nm2tech-sas.com/api/health

# Test CORS headers
curl -H "Origin: https://main.d2swtp6vppsxta.amplifyapp.com" \
     -X OPTIONS \
     https://api.nm2tech-sas.com/api/upload \
     -v
```

**In Browser Console (JavaScript):**
```javascript
fetch('https://api.nm2tech-sas.com/api/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

---

**Use curl on EC2, JavaScript in browser!** 🚀

Test the backend from EC2 using curl, then test CORS from the browser console.

