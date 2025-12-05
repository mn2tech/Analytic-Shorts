# Debug Tunnel 404 Issue

The tunnel is running but returning 404. Let's debug this step by step.

## 🔍 Step 1: Test API Endpoint (Not Root)

Try the actual API endpoint in your browser:

```
https://surge-grab-refresh-leon.trycloudflare.com/api/health
```

Not just the root `/` - try `/api/health` specifically.

## 🔍 Step 2: Test from EC2

Test the tunnel URL directly from EC2:

```bash
curl https://surge-grab-refresh-leon.trycloudflare.com/api/health
```

If this works from EC2 but not from browser, it's a network issue.

## 🔍 Step 3: Check Tunnel Logs

Look at the terminal where the tunnel is running. Check for:
- Connection errors
- Routing errors
- Any red error messages

## 🔍 Step 4: Verify Backend Routes

Make sure backend has the `/api/health` route:

```bash
# Test all backend routes
curl http://localhost:5000/
curl http://localhost:5000/api/health
curl http://localhost:5000/api/example/medical
```

## 🔧 Solution: Use Named Tunnel with Config

The quick tunnel might have routing issues. Let's try a named tunnel with explicit config:

```bash
# 1. Stop current tunnel
pkill -9 cloudflared

# 2. Create config directory
mkdir -p ~/.cloudflared

# 3. Create config file
cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: quick-tunnel
credentials-file: /dev/null

ingress:
  - service: http://localhost:5000
EOF

# 4. Run tunnel with config
cloudflared tunnel --config ~/.cloudflared/config.yml run
```

## 🔧 Alternative: Check if Backend Needs Specific Host

Some backends need specific host headers. Try:

```bash
# Test with Host header
curl -H "Host: surge-grab-refresh-leon.trycloudflare.com" http://localhost:5000/api/health
```

## 💡 Try Different Approach: Use ngrok Instead

If Cloudflare tunnel keeps having issues, try ngrok:

```bash
# Install ngrok
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
tar -xzf ngrok-v3-stable-linux-amd64.tgz
sudo mv ngrok /usr/local/bin/

# Start ngrok
ngrok http 5000
```

This will give you a URL like: `https://xxxx-xxxx.ngrok.io`

---

*Try testing `/api/health` specifically, and check the tunnel logs for errors!*



