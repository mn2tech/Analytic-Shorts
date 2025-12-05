# Kill All Node Processes

Something keeps restarting node. Let's kill all node processes.

## 🔧 Kill All Node Processes

```bash
# Kill all node processes
pkill -9 node

# Or more specifically
pkill -9 -f "node.*server.js"
pkill -9 -f "node.*backend"

# Wait
sleep 3

# Verify
ps aux | grep node
ss -tlnp | grep 5000
```

Should show nothing.

## 🔧 Then Start Backend

```bash
cd ~/Analytic-Shorts/backend
npm start
```

Keep this terminal open!

---

*Kill all node processes, then start backend fresh!*



