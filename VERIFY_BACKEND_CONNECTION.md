# 🔍 Verify Backend Connection

## ✅ CORS Should Be OK

Since you're using `https://main.d2swtp6vppsxta.amplifyapp.com/` which is in `ALLOWED_ORIGINS`, CORS should be working.

**The issue might be something else. Let's verify:**

---

## ✅ Step 1: Verify VITE_API_URL in Amplify

**Check if `VITE_API_URL` is set correctly in Amplify:**

1. **Go to:** AWS Amplify Console
2. **Select:** Analytics Shorts app
3. **Go to:** App settings → Environment variables
4. **Check** if `VITE_API_URL` is set to: `https://api.nm2tech-sas.com`
5. **If not set or wrong:** Add/update it

**Important:** 
- Should be: `https://api.nm2tech-sas.com` (no trailing slash)
- Should NOT be: `https://api.nm2tech-sas.com/` (with trailing slash)
- Should NOT include `/api` in the URL

---

## ✅ Step 2: Verify Backend is Responding

**Test the backend from your browser console:**

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

**If you see CORS error:**
- Check `ALLOWED_ORIGINS` includes `https://main.d2swtp6vppsxta.amplifyapp.com`
- Make sure you restarted PM2 after updating `.env`

**If you see network error:**
- Backend might be down
- Check backend logs: `pm2 logs analytics-api`

---

## ✅ Step 3: Check Browser Console for Errors

**Look for specific error messages:**

1. **CORS error:** "Access to fetch at '...' from origin '...' has been blocked by CORS policy"
   - **Fix:** Add origin to `ALLOWED_ORIGINS` and restart PM2

2. **Network error:** "Failed to fetch" or "NetworkError"
   - **Fix:** Check backend is running, check network connectivity

3. **404 error:** "Not Found"
   - **Fix:** Check `VITE_API_URL` is correct, check backend routes

4. **Timeout error:** "Request timeout"
   - **Fix:** Check backend is responding, check network

---

## ✅ Step 4: Verify Backend Logs

**On EC2, check backend logs:**

```bash
pm2 logs analytics-api --lines 50
```

**Look for:**
- CORS errors
- Request logs when you try to upload
- Any errors or warnings

---

## ✅ Step 5: Test Upload Endpoint Directly

**Test the upload endpoint from browser console:**

```javascript
const formData = new FormData()
formData.append('file', new File(['test,data\n1,2'], 'test.csv', { type: 'text/csv' }))

fetch('https://api.nm2tech-sas.com/api/upload', {
  method: 'POST',
  body: formData,
  credentials: 'include'
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

**This will show:**
- If CORS is working
- If the endpoint is accessible
- What error you're getting

---

## 🔍 Most Likely Issues

### Issue 1: VITE_API_URL Not Set in Amplify
**Symptom:** Frontend can't find backend
**Fix:** Set `VITE_API_URL=https://api.nm2tech-sas.com` in Amplify

### Issue 2: CORS Still Blocking
**Symptom:** CORS error in browser console
**Fix:** Verify `ALLOWED_ORIGINS` and restart PM2

### Issue 3: Backend Not Responding to API Calls
**Symptom:** Health check works but API calls fail
**Fix:** Check backend logs for errors

---

## 📝 Quick Checklist

- [ ] `VITE_API_URL` is set in Amplify Console?
- [ ] `VITE_API_URL` is `https://api.nm2tech-sas.com` (no trailing slash)?
- [ ] `ALLOWED_ORIGINS` includes `https://main.d2swtp6vppsxta.amplifyapp.com`?
- [ ] PM2 restarted after updating `.env`?
- [ ] Backend health check works: `curl https://api.nm2tech-sas.com/api/health`?
- [ ] Tested from browser console?

---

**Check VITE_API_URL in Amplify and test from browser console!** 🔍

CORS should be OK, so the issue might be VITE_API_URL not set or backend not responding to API calls.

