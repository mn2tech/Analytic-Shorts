# Fix Tunnel 404 Error

The tunnel is running but returning 404. Let's fix this.

## 🔍 Step 1: Verify Backend is Still Running

On EC2, check if backend is still running:

```bash
curl http://localhost:5000/api/health
```

**If it doesn't work:**
- Backend stopped
- Restart it: `cd ~/Analytic-Shorts/backend && npm start`

## 🔍 Step 2: Restart the Tunnel

The tunnel might have lost connection. Restart it:

```bash
# Kill the current tunnel
pkill cloudflared

# Wait a moment
sleep 2

# Start tunnel again
cloudflared tunnel --url http://localhost:5000
```

**Copy the NEW URL** it gives you (it might be different).

## 🔍 Step 3: Test New URL

Once you get a new URL, test it:

```bash
# On EC2, test the new URL
curl https://new-tunnel-url.trycloudflare.com/api/health
```

**OR** test from browser on your Windows machine.

## 🔍 Step 4: Check Tunnel Logs

Look at the terminal where the tunnel is running. Check for:
- Connection errors
- Routing errors
- Any red error messages

## ✅ Solution: Restart Both

Sometimes both need to be restarted:

```bash
# 1. Kill tunnel
pkill cloudflared

# 2. Kill backend (if needed)
pkill node

# 3. Wait
sleep 2

# 4. Start backend
cd ~/Analytic-Shorts/backend
npm start &
# Keep this running

# 5. Start tunnel (in new terminal/SSH session)
cloudflared tunnel --url http://localhost:5000
```

## 💡 Alternative: Use Different Port

If port 5000 has issues, try a different port:

```bash
# Edit backend to use port 5001
cd ~/Analytic-Shorts/backend
# Create/edit .env file
echo "PORT=5001" > .env

# Restart backend
npm start

# Start tunnel with new port
cloudflared tunnel --url http://localhost:5001
```

---

*Restart the tunnel and get a new URL - that usually fixes 404 errors!*



