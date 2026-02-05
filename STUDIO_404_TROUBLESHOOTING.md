# Studio 404 Error Troubleshooting

## Issue
Getting 404 errors when trying to load data in Studio multi-page apps.

## Quick Fixes

### 1. Restart Backend Server (Most Likely Fix)
SSH into your EC2 instance and restart PM2:

```bash
cd /home/raj/Analytic-Shorts/backend
pm2 restart analytics-api --update-env
pm2 logs analytics-api --lines 50
```

### 2. Check Which Endpoint is Failing
Open browser DevTools (F12) → Network tab:
- Look for failed requests (red status)
- Check the exact URL that's failing:
  - `/api/studio/query` - Query execution
  - `/api/studio/options` - Dropdown options
  - `/api/example/sales` - Dataset data

### 3. Test Backend Endpoints Directly
SSH into EC2 and test:

```bash
# Test health endpoint
curl http://localhost:5000/api/health

# Test studio routes
curl http://localhost:5000/api/studio/datasets

# Test query endpoint (should return error without proper body, but should not be 404)
curl -X POST http://localhost:5000/api/studio/query \
  -H "Content-Type: application/json" \
  -d '{"datasetId":"sales","query":{"id":"test","type":"aggregation","metric":"Sales"}}'
```

### 4. Verify Routes are Registered
Check `backend/server.js` line 67:
```javascript
app.use('/api/studio', studioRoutes)
```

### 5. Check Backend Logs
```bash
pm2 logs analytics-api --lines 100
```

Look for:
- Route registration messages
- 404 errors with specific paths
- Any errors loading the studio routes module

## Common Issues

### Issue 1: Backend Not Restarted
**Symptom**: Routes exist in code but return 404
**Fix**: Restart PM2: `pm2 restart analytics-api`

### Issue 2: Wrong API Base URL
**Symptom**: Requests going to wrong domain
**Fix**: Check `VITE_API_URL` environment variable in Amplify

### Issue 3: Dataset Not Found
**Symptom**: 404 on `/api/example/sales`
**Fix**: Verify dataset exists in `backend/routes/examples.js`

### Issue 4: CORS Issues
**Symptom**: 404 or CORS errors
**Fix**: Check CORS configuration in `backend/server.js`

## Expected Endpoints

- `GET /api/studio/datasets` - List available datasets
- `GET /api/studio/options?datasetId=sales&field=Region` - Get dropdown options
- `POST /api/studio/query` - Execute query
- `GET /api/example/sales` - Get sales dataset

## Next Steps

1. Check browser console for exact failing URL
2. Restart backend: `pm2 restart analytics-api`
3. Test endpoint directly with curl
4. Check backend logs for errors
