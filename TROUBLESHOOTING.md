# Troubleshooting: Backend Not Working

## Quick Checklist

### 1. Verify Backend is Running on EC2

SSH into your EC2 instance and run:
```bash
pm2 status
curl http://localhost:5000/api/health
```

Should return: `{"status":"ok","message":"NM2TECH Analytics Shorts API is running"}`

### 2. Get Your EC2 Public IP

```bash
curl http://169.254.169.254/latest/meta-data/public-ipv4
```

Or check in AWS Console → EC2 → Your instance → Public IPv4 address

### 3. Test API from Outside EC2

From your local machine or browser, try:
```
http://YOUR-EC2-PUBLIC-IP:5000/api/health
```

**If this doesn't work**, the security group needs to be configured.

### 4. Configure EC2 Security Group

1. Go to AWS Console → EC2
2. Select your instance
3. Click "Security" tab
4. Click on the Security Group
5. **Inbound Rules** → **Edit inbound rules**
6. **Add rule:**
   - Type: Custom TCP
   - Port: 5000
   - Source: 0.0.0.0/0 (or restrict to specific IPs)
   - Description: Analytics API
7. **Save rules**

### 5. Set Environment Variable in Amplify

1. Go to AWS Amplify Console
2. Select your app
3. **App settings** → **Environment variables**
4. **Add variable:**
   - Key: `VITE_API_URL`
   - Value: `http://YOUR-EC2-PUBLIC-IP:5000` (or `https://` if using Nginx with SSL)
5. **Save**
6. **Redeploy** the app (or it will auto-redeploy)

### 6. Verify CORS is Working

Check browser console (F12) for CORS errors. If you see:
```
Access to XMLHttpRequest at 'http://...' from origin 'https://...' has been blocked by CORS policy
```

Update `backend/server.js` CORS configuration to include your Amplify domain.

### 7. Check Backend Logs

On EC2:
```bash
pm2 logs analytics-api
```

Look for errors when you try to upload.

### 8. Test API Endpoints Directly

```bash
# Health check
curl http://YOUR-EC2-IP:5000/api/health

# Test example data
curl http://YOUR-EC2-IP:5000/api/example/medical
```

## Common Issues

### Issue: "Network Error" or "Failed to connect"
**Solution:** Security group not allowing port 5000, or backend not running

### Issue: CORS errors
**Solution:** Update CORS in backend/server.js to allow your Amplify domain

### Issue: 404 Not Found
**Solution:** Check that routes are correct, backend is running on port 5000

### Issue: Timeout
**Solution:** Increase Lambda timeout (if using Lambda) or check EC2 instance health

## Quick Fix Commands

```bash
# On EC2 - Restart backend
pm2 restart analytics-api

# Check if port is open
sudo netstat -tlnp | grep 5000

# Check PM2 status
pm2 status
pm2 logs analytics-api --lines 50
```



