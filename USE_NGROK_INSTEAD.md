# Use ngrok Instead - Cloudflare Tunnel Has Issues

Since Cloudflare tunnel keeps giving 404, let's use ngrok which is more reliable for this use case.

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

## 🚀 Step 2: Start ngrok

```bash
# Kill cloudflared
pkill -9 cloudflared

# Start ngrok (in a new terminal/SSH session)
ngrok http 5000
```

You'll see output like:
```
Session Status                online
Account                       (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://xxxx-xxxx.ngrok.io -> http://localhost:5000
```

**Copy the HTTPS URL** (e.g., `https://xxxx-xxxx.ngrok.io`)

## 🚀 Step 3: Test ngrok URL

From your Windows browser:

```
https://xxxx-xxxx.ngrok.io/api/health
```

Should return: `{"status":"ok","message":"NM2TECH Analytics Shorts API is running"}`

## 🚀 Step 4: Update amplify.yml

Once ngrok URL works, update `amplify.yml`:

```yaml
environment:
  VITE_API_URL: https://xxxx-xxxx.ngrok.io
```

## ⚠️ Note About ngrok

- **Free tier:** URL changes when you restart (but works reliably)
- **Paid tier:** Can get a fixed URL
- **For now:** Free tier is fine for testing

## 💡 Keep Both Running

You need both running:

1. **Backend:**
   ```bash
   cd ~/Analytic-Shorts/backend
   node server.js
   ```

2. **ngrok:**
   ```bash
   ngrok http 5000
   ```

## 🔧 Use PM2 to Keep Running

```bash
# Install PM2
npm install -g pm2

# Start backend
cd ~/Analytic-Shorts/backend
pm2 start server.js --name backend-api

# Start ngrok with PM2
pm2 start "ngrok http 5000" --name ngrok-tunnel

# Save
pm2 save
pm2 startup
```

---

*ngrok is more reliable for this use case - try it!*



