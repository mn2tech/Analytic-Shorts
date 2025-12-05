# Fix Cloudflare Tunnel Error 1033

Error 1033 means Cloudflare can't reach your tunnel. This usually means the tunnel stopped running.

## 🔍 Step 1: Check if Tunnel is Running on EC2

On your EC2 instance, check:

```bash
# Check if cloudflared is running
ps aux | grep cloudflared
```

**If nothing shows up:** Tunnel stopped → Restart it

**If it shows a process:** Tunnel is running but might have lost connection

## 🔍 Step 2: Check if Backend is Running

```bash
# Test backend
curl http://localhost:5000/api/health
```

Should return: `{"status":"ok","message":"NM2TECH Analytics Shorts API is running"}`

**If it doesn't work:** Backend stopped → Restart it

## ✅ Step 3: Restart Both

### Restart Backend:

```bash
# Kill any node processes
pkill -9 node

# Start backend
cd ~/Analytic-Shorts/backend
npm start &
# Wait a moment
sleep 3

# Verify it's running
curl http://localhost:5000/api/health
```

### Restart Tunnel:

```bash
# Kill any cloudflared processes
pkill -9 cloudflared

# Wait a moment
sleep 2

# Start tunnel
cloudflared tunnel --url http://localhost:5000
```

**You'll get a NEW URL** - copy it!

## ✅ Step 4: Test New URL

From your Windows browser, test the new URL:

```
https://new-tunnel-url.trycloudflare.com/api/health
```

Should return: `{"status":"ok","message":"NM2TECH Analytics Shorts API is running"}`

## ✅ Step 5: Update amplify.yml

Once you have a working new URL, update `amplify.yml`:

```yaml
environment:
  VITE_API_URL: https://new-tunnel-url.trycloudflare.com
```

Then commit and push.

## 💡 Keep Both Running with PM2

To prevent them from stopping:

```bash
# Install PM2
npm install -g pm2

# Start backend
cd ~/Analytic-Shorts/backend
pm2 start server.js --name backend-api

# Start tunnel (use nohup)
nohup cloudflared tunnel --url http://localhost:5000 > /tmp/tunnel.log 2>&1 &

# Check both are running
pm2 status
ps aux | grep cloudflared

# View tunnel logs
tail -f /tmp/tunnel.log
```

## 🔧 Alternative: Use Screen/Tmux

To keep processes running after disconnecting:

```bash
# Install screen
sudo yum install screen  # or: sudo apt-get install screen

# Start screen session
screen -S backend
cd ~/Analytic-Shorts/backend
npm start
# Press Ctrl+A then D to detach

# Start another screen for tunnel
screen -S tunnel
cloudflared tunnel --url http://localhost:5000
# Press Ctrl+A then D to detach

# Reattach later: screen -r backend or screen -r tunnel
```

---

*Restart both backend and tunnel, get a new URL, and update amplify.yml!*



