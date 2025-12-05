# Check Port 5000 - Alternative Commands

Since `netstat` and `lsof` aren't available, use these alternatives:

## 🔍 Check Port 5000

```bash
# Option 1: Using ss (should be available)
ss -tuln | grep 5000

# Option 2: Using /proc
cat /proc/net/tcp | grep :1388
# Note: 5000 in hex is 1388

# Option 3: Check if something is listening
timeout 1 bash -c "</dev/tcp/localhost/5000" 2>/dev/null && echo "Port 5000 is open" || echo "Port 5000 is closed"
```

## 🔍 Check Node Processes

```bash
# Check all node processes
ps aux | grep node

# Check processes by port (using ss)
ss -tlnp | grep 5000
```

## 🔍 Kill Processes on Port 5000

```bash
# Find PID using ss
ss -tlnp | grep 5000

# Kill by PID (replace PID with actual number)
kill -9 <PID>

# Or kill all node processes
pkill -9 node
```

---

*Use `ss` command - it's usually available on modern Linux systems!*



