# Test Tunnel from EC2

The tunnel is running but returning 404. Let's test from EC2 to see if it's a routing issue.

## 🔍 Step 1: Test from EC2

On your EC2 instance, test the tunnel URL:

```bash
curl https://fcc-floyd-condition-fires.trycloudflare.com/api/health
```

**If it works from EC2 but not from browser:**
- Network/firewall issue
- Try waiting a few minutes (tunnel said "it may take some time")

**If it doesn't work from EC2 either:**
- Tunnel routing issue
- Backend not accessible from tunnel

## 🔍 Step 2: Wait a Bit

The tunnel message said: "it may take some time to be reachable"

**Wait 1-2 minutes**, then try again in your browser.

## 🔍 Step 3: Check Backend is Still Running

In the terminal where backend is running, make sure you still see:
```
🚀 Server running on http://localhost:5000
```

If not, restart it.

## 🔍 Step 4: Check Tunnel Logs

Look at the terminal where tunnel is running. Check for:
- Connection errors
- Routing errors
- Any red error messages

## 🔧 Alternative: Try Root Path

Sometimes `/api/health` doesn't work but root does:

Try in browser:
```
https://fcc-floyd-condition-fires.trycloudflare.com/
```

Should show the backend's root response.

## 🔧 Alternative: Use ngrok

If Cloudflare tunnel keeps having issues, try ngrok:

```bash
# On EC2
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
tar -xzf ngrok-v3-stable-linux-amd64.tgz
sudo mv ngrok /usr/local/bin/

# Kill cloudflared
pkill -9 cloudflared

# Start ngrok
ngrok http 5000
```

This will give you a URL like: `https://xxxx-xxxx.ngrok.io`

---

*Test from EC2 first, and try waiting a minute or two - tunnels sometimes need time to become reachable!*

