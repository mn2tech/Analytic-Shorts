# Troubleshoot Cloudflare Tunnel

## 🔍 Check 1: Is Backend Running?

On your EC2 instance, check if backend is running:

```bash
curl http://localhost:5000/api/health
```

**Expected:** `{"status":"ok","message":"NM2TECH Analytics Shorts API is running"}`

**If it doesn't work:**
- Backend is not running
- Start it: `cd ~/Analytic-Shorts/backend && npm start`

---

## 🔍 Check 2: Is Tunnel Still Running?

Check if the tunnel process is still running:

```bash
ps aux | grep cloudflared
```

You should see the cloudflared process running.

**If not running:**
- Restart it: `cloudflared tunnel --url http://localhost:5000`

---

## 🔍 Check 3: Wait a Bit

The tunnel message said: "it may take some time to be reachable"

**Try again after 30 seconds:**

```bash
curl https://sense-promotion-alcohol-especially.trycloudflare.com/api/health
```

---

## 🔍 Check 4: Test from Browser

Instead of curl, try from a browser:

1. Open browser on your local machine
2. Visit: `https://sense-promotion-alcohol-especially.trycloudflare.com/api/health`
3. Should see: `{"status":"ok","message":"NM2TECH Analytics Shorts API is running"}`

---

## 🔍 Check 5: Check Tunnel Logs

Look at the terminal where you're running the tunnel. You should see connection logs.

**If you see errors:**
- Share them and we can fix

**If tunnel stopped:**
- Restart it: `cloudflared tunnel --url http://localhost:5000`

---

## ✅ Quick Test Checklist

Run these commands on EC2:

```bash
# 1. Check backend is running locally
curl http://localhost:5000/api/health

# 2. Check tunnel is running
ps aux | grep cloudflared

# 3. Check if port 5000 is listening
netstat -tuln | grep 5000
```

---

## 🚀 If Backend is Not Running

Start it:

```bash
cd ~/Analytic-Shorts/backend
npm start
```

Keep this terminal open!

---

## 🚀 If Tunnel is Not Running

Start it in a NEW terminal/SSH session:

```bash
cloudflared tunnel --url http://localhost:5000
```

Keep this terminal open too!

---

## 💡 Pro Tip: Use PM2 to Keep Both Running

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
```

---

*Run the checklist above and let me know what you find!*



