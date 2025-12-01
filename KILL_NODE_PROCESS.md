# Kill Node Process on Port 5000

There's a node process (PID 373679) still running. Kill it first.

## 🔧 Step 1: Kill the Existing Node Process

```bash
# Kill the specific process
kill -9 373679

# Or kill all node processes (more aggressive)
pkill -9 -f "node.*server.js"

# Wait
sleep 2
```

## 🔧 Step 2: Verify Port 5000 is Free

```bash
# Check if port 5000 is free
ss -tlnp | grep 5000
```

Should show nothing (port is free).

## 🔧 Step 3: Start Backend

```bash
cd ~/Analytic-Shorts/backend
npm start
```

**Keep this terminal open!** You should see: `🚀 Server running on http://localhost:5000`

## 🔧 Step 4: Start Tunnel (New Terminal)

In a **NEW** SSH session/terminal:

```bash
cloudflared tunnel --url http://localhost:5000
```

Copy the new URL it gives you.

---

*Kill process 373679 first, then restart backend!*

