# Fix Tunnel 404 - Routing Issue

The tunnel is running but not properly routing to the backend. Let's fix this.

## 🔍 Step 1: Verify Backend is Accessible

On EC2, test backend directly:

```bash
curl http://localhost:5000/api/health
```

Should return: `{"status":"ok","message":"NM2TECH Analytics Shorts API is running"}`

## 🔍 Step 2: Check Tunnel Configuration

The tunnel might not be properly configured. Let's check:

```bash
# Check what the tunnel is doing
ps aux | grep cloudflared
```

## 🔍 Step 3: Test Tunnel from EC2

Try accessing the tunnel URL from EC2 itself:

```bash
curl https://incoming-expanding-deferred-respondent.trycloudflare.com/api/health
```

If this works from EC2 but not from your browser, it might be a network/firewall issue.

## 🔧 Solution: Restart Everything

Sometimes both backend and tunnel need a fresh start:

```bash
# 1. Kill everything
pkill cloudflared
pkill node

# 2. Wait
sleep 3

# 3. Start backend first
cd ~/Analytic-Shorts/backend
npm start &
# Wait a few seconds for it to start
sleep 3

# 4. Test backend
curl http://localhost:5000/api/health

# 5. Start tunnel in a NEW terminal/SSH session
cloudflared tunnel --url http://localhost:5000
```

## 🔧 Alternative: Check Backend is Listening on All Interfaces

Make sure backend is listening on 0.0.0.0, not just localhost:

Check `backend/server.js` - it should have:
```javascript
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
})
```

Or just:
```javascript
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
})
```

## 🔧 Alternative: Use Different Tunnel Method

Try using the tunnel with explicit configuration:

```bash
# Create a config file
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << EOF
tunnel: quick-tunnel
credentials-file: /dev/null

ingress:
  - hostname: incoming-expanding-deferred-respondent.trycloudflare.com
    service: http://localhost:5000
  - service: http_status:404
EOF

# Run tunnel with config
cloudflared tunnel --config ~/.cloudflared/config.yml run
```

## 💡 Quick Test: Try Root Path

Sometimes the tunnel works on root but not on /api:

Try in browser:
```
https://incoming-expanding-deferred-respondent.trycloudflare.com/
```

Should show the backend root response.

---

*Try restarting both backend and tunnel completely - that usually fixes routing issues!*

