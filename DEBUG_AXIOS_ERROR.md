# 🔍 Debug Axios Request Error

## ❌ Stack Trace Shows Axios Request Failing

The stack trace shows an axios request is failing. This is likely the "Cannot connect to backend server" error.

**The stack trace shows:**
- `xhr` - XMLHttpRequest (axios uses this)
- `request` - Axios request function
- `_request` - Internal axios request handler

**This means the frontend is trying to connect to the backend but failing.**

---

## ✅ Step 1: Check the Actual Error Message

**In browser console, look for the actual error message (not just stack trace):**

1. **Open browser console** (F12)
2. **Look for red error messages** above the stack trace
3. **Common errors:**
   - "Network Error" → Backend not reachable
   - "CORS policy" → CORS blocking the request
   - "Failed to fetch" → Network issue
   - "Request timeout" → Backend not responding

**Share the actual error message** (not just the stack trace).

---

## ✅ Step 2: Verify VITE_API_URL in Amplify

**Check if `VITE_API_URL` is set in Amplify:**

1. **Go to:** AWS Amplify Console
2. **Select:** Analytics Shorts app
3. **Go to:** App settings → Environment variables
4. **Check** if `VITE_API_URL` exists
5. **Value should be:** `https://api.nm2tech-sas.com` (no trailing slash)

**If not set:**
- Add it: `VITE_API_URL` = `https://api.nm2tech-sas.com`
- Redeploy the app

---

## ✅ Step 3: Test Backend from Browser Console

**Test the backend connection directly:**

1. **Go to:** `https://main.d2swtp6vppsxta.amplifyapp.com/`
2. **Open browser console** (F12)
3. **Run:**
   ```javascript
   fetch('https://api.nm2tech-sas.com/api/health')
     .then(r => r.json())
     .then(console.log)
     .catch(console.error)
   ```

**What do you see?**
- ✅ Success → Backend is reachable, issue is in frontend code
- ❌ CORS error → Add origin to `ALLOWED_ORIGINS` and restart PM2
- ❌ Network error → Backend not reachable from browser
- ❌ Timeout → Backend not responding

---

## ✅ Step 4: Check Network Tab

**Check the Network tab in browser console:**

1. **Open browser console** (F12)
2. **Go to:** Network tab
3. **Try uploading a file** (or whatever triggers the error)
4. **Look for the failed request:**
   - Click on it
   - Check "Headers" tab
   - Check "Response" tab
   - Check "Preview" tab

**Look for:**
- Request URL (should be `https://api.nm2tech-sas.com/api/...`)
- Status code (404, 500, CORS error, etc.)
- Error message in response

---

## ✅ Step 5: Check Backend Logs

**On EC2, check if the request is reaching the backend:**

```bash
pm2 logs analytics-api --lines 50
```

**Look for:**
- Request logs when you try to upload
- CORS errors
- Any errors or warnings

**If you don't see any logs:**
- Request is not reaching the backend
- Check `VITE_API_URL` is set correctly
- Check network connectivity

---

## 🔍 Most Likely Issues

### Issue 1: VITE_API_URL Not Set
**Symptom:** Frontend can't find backend URL
**Fix:** Set `VITE_API_URL=https://api.nm2tech-sas.com` in Amplify

### Issue 2: CORS Error
**Symptom:** CORS policy error in console
**Fix:** Add `https://main.d2swtp6vppsxta.amplifyapp.com` to `ALLOWED_ORIGINS` and restart PM2

### Issue 3: Network Error
**Symptom:** "Network Error" or "Failed to fetch"
**Fix:** Check backend is running, check `VITE_API_URL` is correct

---

## 📝 What to Share

**Please share:**
1. **The actual error message** (not just stack trace)
2. **Result of the fetch test** from browser console
3. **Network tab details** (status code, response)
4. **Backend logs** (if any requests are reaching it)

---

**Check the actual error message and test from browser console!** 🔍

The stack trace shows axios is failing, but we need the actual error message to diagnose it.

