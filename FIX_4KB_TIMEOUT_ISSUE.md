# 🔍 Fix 4KB File Upload Timeout

## ❌ Problem: 4KB File Timing Out

A 4KB file timing out suggests the issue is **NOT about file size**, but rather:

1. **Backend server not responding**
2. **Supabase queries hanging** (in middleware)
3. **Network connectivity issues**
4. **Backend processing hanging**

---

## 🔍 Most Likely Causes

### 1. Supabase Query Hanging
**The `checkUploadLimit` middleware makes Supabase queries that could hang:**

- If Supabase is slow or unreachable
- If there's a network issue
- If the query takes too long

### 2. Backend Server Not Running
**The backend might not be running or reachable:**

- Check if backend is running: `pm2 status` (on EC2)
- Check backend logs: `pm2 logs analytics-api`
- Test backend health: `curl https://api.nm2tech-sas.com/api/health`

### 3. Network Issues
**Network connectivity between frontend and backend:**

- CORS issues
- Firewall blocking requests
- Backend URL incorrect

---

## ✅ Quick Fixes

### Fix 1: Add Timeout to Supabase Queries

**Add timeout to Supabase operations in middleware:**

```javascript
// In backend/middleware/usageLimits.js
// Add timeout wrapper for Supabase queries
const withTimeout = (promise, timeoutMs) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
    )
  ])
}
```

### Fix 2: Add Better Error Handling

**Add try-catch and timeout handling in upload route:**

```javascript
// In backend/routes/upload.js
// Add timeout for middleware operations
```

### Fix 3: Check Backend Status

**Verify backend is running and reachable:**

1. **On EC2:**
   ```bash
   pm2 status
   pm2 logs analytics-api --lines 50
   ```

2. **Test backend:**
   ```bash
   curl https://api.nm2tech-sas.com/api/health
   ```

3. **Check for errors:**
   - Look for Supabase connection errors
   - Look for timeout errors
   - Look for network errors

---

## 🧪 Debugging Steps

### Step 1: Check Backend Logs

**On EC2, check backend logs:**

```bash
pm2 logs analytics-api --lines 100
```

**Look for:**
- Supabase connection errors
- Timeout errors
- Processing errors
- Any errors when uploading

### Step 2: Test Backend Directly

**Test the upload endpoint directly:**

```bash
curl -X POST https://api.nm2tech-sas.com/api/upload \
  -F "file=@test.csv" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**If this times out:**
- Backend issue (not frontend)
- Check backend logs
- Check Supabase connection

### Step 3: Check Supabase Connection

**Verify Supabase is reachable:**

```bash
# On EC2
curl https://ybpzhhzadvarebdclykl.supabase.co/rest/v1/
```

**If this fails:**
- Supabase might be down
- Network issue
- Firewall blocking

---

## ✅ Immediate Actions

1. **Check backend status:**
   ```bash
   pm2 status
   pm2 logs analytics-api
   ```

2. **Restart backend if needed:**
   ```bash
   pm2 restart analytics-api --update-env
   ```

3. **Test backend health:**
   ```bash
   curl https://api.nm2tech-sas.com/api/health
   ```

4. **Check Supabase connection:**
   - Verify Supabase URL and key in `.env`
   - Test Supabase connectivity

---

## 📝 Most Likely Issue

**The `checkUploadLimit` middleware is probably hanging on a Supabase query.**

**Solution:**
1. Check backend logs for Supabase errors
2. Verify Supabase is reachable
3. Add timeout to Supabase queries
4. Consider making Supabase optional for uploads (if auth is optional)

---

**Check backend logs first to see what's happening!** 🔍

A 4KB file shouldn't timeout - this suggests a backend connectivity or Supabase issue.

