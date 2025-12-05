# Check Backend Status on EC2

The 502 error means the backend isn't running. Check and restart it.

## Check if backend is running

```bash
# Check if node process is running
ps aux | grep node

# Check if port 5000 is in use
ss -tlnp | grep 5000

# Check PM2 status (if using PM2)
pm2 status
```

## If backend is not running, start it

```bash
cd ~/Analytic-Shorts/backend

# Check if .env file exists
cat .env

# Start backend
npm start
```

Or with PM2:
```bash
cd ~/Analytic-Shorts/backend
pm2 start server.js --name analytics-api
pm2 save
```

## Test backend

```bash
curl http://localhost:5000/api/health
```

Should return: `{"status":"ok","message":"NM2TECH Analytics Shorts API is running"}`



