# Debug Studio 404 Error - "studio/:1"

## The Error
`Failed to load resource: the server responded with a status of 404 () studio/:1`

This error suggests:
1. A service worker might be intercepting the request
2. React Router might be catching the API call
3. The backend route might not be registered

## Step-by-Step Debugging

### Step 1: Check Browser Console
After the build completes, open browser console (F12) and look for:
- "API Base URL: https://api.nm2tech-sas.com" (should see this)
- "Full API URL: https://api.nm2tech-sas.com/api/studio/query"
- Any network errors

### Step 2: Check Network Tab
1. Open DevTools (F12) → Network tab
2. Filter by "Failed" or "404"
3. Click on the failed request
4. Check:
   - **Request URL**: Should be `https://api.nm2tech-sas.com/api/studio/query`
   - **Request Method**: Should be `POST`
   - **Status Code**: 404
   - **Response**: What does it say?

### Step 3: Test Backend Directly
SSH into EC2 and test:

```bash
# Test if backend is running
curl http://localhost:5000/api/health

# Test studio routes
curl http://localhost:5000/api/studio/datasets

# Test query endpoint (should return 400 without proper body, NOT 404)
curl -X POST http://localhost:5000/api/studio/query \
  -H "Content-Type: application/json" \
  -d '{"datasetId":"sales","query":{"id":"test","type":"aggregation","metric":"Sales"}}'
```

### Step 4: Restart Backend
```bash
cd /home/raj/Analytic-Shorts
git pull origin main
cd backend
pm2 restart analytics-api --update-env
pm2 logs analytics-api --lines 50
```

### Step 5: Clear Service Worker Cache
The service worker might be caching a 404 response:

1. Open DevTools (F12)
2. Go to **Application** tab
3. Click **Service Workers** in left sidebar
4. Click **Unregister** for any registered service workers
5. Go to **Storage** → **Clear site data**
6. Hard refresh (Ctrl+Shift+R)

### Step 6: Test from Browser Console
Run this in browser console:

```javascript
// Test if backend is reachable
fetch('https://api.nm2tech-sas.com/api/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)

// Test studio datasets endpoint
fetch('https://api.nm2tech-sas.com/api/studio/datasets')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)

// Test query endpoint
fetch('https://api.nm2tech-sas.com/api/studio/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    datasetId: 'sales',
    query: { id: 'test', type: 'aggregation', metric: 'Sales' },
    filterValues: {}
  })
})
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

## Most Likely Fix

**Restart the backend server on EC2:**

```bash
cd /home/raj/Analytic-Shorts
git pull origin main
cd backend
pm2 restart analytics-api --update-env
```

The routes are in the code, but the server needs to be restarted to load them.
