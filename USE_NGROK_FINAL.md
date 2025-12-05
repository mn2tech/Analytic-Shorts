# Use ngrok - More Reliable Than Cloudflare Tunnel

Cloudflare tunnel keeps having routing issues. Let's use ngrok instead - it's more reliable for this use case.

## 🚀 Step 1: Install ngrok on EC2

```bash
# Download ngrok
cd ~
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz

# Extract
tar -xzf ngrok-v3-stable-linux-amd64.tgz

# Move to system path
sudo mv ngrok /usr/local/bin/

# Verify
ngrok version
```

## 🚀 Step 2: Kill Cloudflare Tunnel

```bash
pkill -9 cloudflared
```

## 🚀 Step 3: Start ngrok

In a **NEW** terminal/SSH session (keep backend running in the other):

```bash
ngrok http 5000
```

You'll see output like:
```
Session Status                online
Forwarding                    https://xxxx-xxxx.ngrok.io -> http://localhost:5000
```

**Copy the HTTPS URL** (e.g., `https://xxxx-xxxx.ngrok.io`)

## 🚀 Step 4: Test ngrok URL

From your Windows browser:

```
https://xxxx-xxxx.ngrok.io/api/health
```

Should return: `{"status":"ok","message":"NM2TECH Analytics Shorts API is running"}`

## 🚀 Step 5: Update amplify.yml

Once ngrok URL works, update `amplify.yml`:

```yaml
environment:
  VITE_API_URL: https://xxxx-xxxx.ngrok.io
```

Then commit and push.

## ⚠️ Note About ngrok

- **Free tier:** URL changes when you restart (but works reliably)
- **For production:** Later you can get a fixed URL or deploy to Railway/Render

## 💡 Keep Both Running

You need both running:

1. **Backend** (Terminal 1): `npm start` - keep running
2. **ngrok** (Terminal 2): `ngrok http 5000` - keep running

---

*ngrok is more reliable - try it!*



