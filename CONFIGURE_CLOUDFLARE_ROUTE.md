# Configure Cloudflare Tunnel Route

The tunnel is running but needs a route configured to get a public URL.

## 🔧 Step 1: Go to Cloudflare Dashboard

1. Go to: https://one.dash.cloudflare.com
2. Navigate to: **Networks** → **Connectors**
3. Click on your tunnel: **nm2tech-backend**

## 🔧 Step 2: Configure a Route

1. Click **"Edit"** button on your tunnel
2. Look for **"Public hostnames"** or **"Routes"** section
3. Click **"Add a public hostname"** or **"Configure"**

## 🔧 Step 3: Add Route Configuration

You'll need to configure:

**Option A: Use a Subdomain (If you have a domain)**
- **Public hostname:** `api.yourdomain.com` (or any subdomain)
- **Service:** `http://localhost:5000`
- **Path:** Leave empty or set to `/`

**Option B: Use Cloudflare's Default Domain**
- Look for option to use Cloudflare's default tunnel domain
- Or create a route that uses the tunnel ID

## 🔧 Step 4: Save and Get URL

After saving, the public URL will be shown in the dashboard. Copy that URL.

---

## 🚀 Option 2: Use Quick Tunnel (Faster Alternative)

If configuring routes is complicated, use a quick tunnel instead:

### On Your EC2 Instance:

```bash
# Stop the current tunnel (Ctrl+C)
# Then run:
cloudflared tunnel --url http://localhost:5000
```

This will give you a URL like:
```
https://xxxx-xxxx-xxxx.trycloudflare.com
```

**Copy that URL** - that's your backend URL!

### Update amplify.yml

```yaml
environment:
  VITE_API_URL: https://xxxx-xxxx-xxxx.trycloudflare.com
```

---

## 💡 Recommendation

**Use Quick Tunnel for now** - it's faster and works immediately:

1. Stop the current tunnel (Ctrl+C in the terminal running it)
2. Run: `cloudflared tunnel --url http://localhost:5000`
3. Copy the URL it gives you
4. Update `amplify.yml` with that URL
5. Commit and push

You can configure the named tunnel properly later!



