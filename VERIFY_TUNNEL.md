# Verify Cloudflare Tunnel is Working

## ✅ Backend is Running

Your backend is working: `{"status":"ok","message":"NM2TECH Analytics Shorts API is running"}`

## 🔍 Check Tunnel Status

### Step 1: Check if Tunnel Process is Running

```bash
ps aux | grep cloudflared
```

You should see a cloudflared process running.

### Step 2: Check Tunnel Terminal

Look at the terminal where you started the tunnel. You should see:
- Connection logs
- No errors
- Active connections

### Step 3: Test Tunnel URL from Browser

**On your local Windows machine**, open a browser and visit:

```
https://sense-promotion-alcohol-especially.trycloudflare.com/api/health
```

**Expected:** You should see the JSON response in the browser.

### Step 4: Test with curl (verbose)

On EC2, try with verbose flag to see what's happening:

```bash
curl -v https://sense-promotion-alcohol-especially.trycloudflare.com/api/health
```

This will show:
- Connection details
- HTTP headers
- Response

---

## 🚀 If Tunnel is Not Running

If `ps aux | grep cloudflared` shows nothing, restart the tunnel:

```bash
cloudflared tunnel --url http://localhost:5000
```

**Keep this terminal open!** The tunnel must stay running.

---

## 💡 Keep Both Running with PM2

To keep both backend and tunnel running:

```bash
# Install PM2 if not installed
npm install -g pm2

# Start backend
cd ~/Analytic-Shorts/backend
pm2 start server.js --name backend-api

# Start tunnel (use nohup to run in background)
nohup cloudflared tunnel --url http://localhost:5000 > /tmp/tunnel.log 2>&1 &

# Check tunnel is running
ps aux | grep cloudflared

# View tunnel logs
tail -f /tmp/tunnel.log
```

---

## ✅ Once Tunnel Works

Once the tunnel URL works (test from browser), you can:

1. **Commit and push amplify.yml** (already updated with the URL)
2. **Wait for Amplify to redeploy**
3. **Test your app!**

---

*Test the tunnel URL from your browser first - that's the easiest way to verify it's working!*



