# Fix Backend Startup Issue

The backend exited with error but health check still works. Let's check what's running.

## 🔍 Step 1: Check What's Running on Port 5000

```bash
# Check what process is using port 5000
netstat -tuln | grep 5000
# or
lsof -i :5000
# or
ss -tuln | grep 5000
```

## 🔍 Step 2: Check Node Processes

```bash
ps aux | grep node
```

See if there's already a node process running the backend.

## 🔍 Step 3: Kill All Node Processes

```bash
pkill node
# Wait
sleep 2
```

## 🔍 Step 4: Check Backend Directory

Make sure you're in the right directory:

```bash
cd ~/Analytic-Shorts/backend
pwd
ls -la
```

Verify you see: `server.js`, `package.json`, `node_modules/`

## 🔍 Step 5: Check for Errors in package.json

```bash
cat package.json | grep start
```

Should show: `"start": "node server.js"`

## ✅ Step 6: Start Backend Properly

```bash
cd ~/Analytic-Shorts/backend

# Make sure dependencies are installed
npm install

# Start backend (not in background for now)
node server.js
```

You should see: `🚀 Server running on http://localhost:5000`

**Keep this terminal open!**

## ✅ Step 7: Test Backend

In a NEW terminal/SSH session:

```bash
curl http://localhost:5000/api/health
```

Should return: `{"status":"ok","message":"NM2TECH Analytics Shorts API is running"}`

## ✅ Step 8: Start Tunnel

In another NEW terminal/SSH session:

```bash
cloudflared tunnel --url http://localhost:5000
```

Copy the new URL.

---

## 💡 Use PM2 for Better Management

```bash
# Install PM2
npm install -g pm2

# Start backend with PM2
cd ~/Analytic-Shorts/backend
pm2 start server.js --name backend-api

# Check status
pm2 status
pm2 logs backend-api

# Start tunnel with PM2
pm2 start "cloudflared tunnel --url http://localhost:5000" --name cloudflare-tunnel

# Save
pm2 save
pm2 startup
```

---

*Start the backend properly and keep it running, then start the tunnel!*

