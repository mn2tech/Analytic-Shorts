# Find Your Tunnel Public URL

You have a hostname route configured: `api` → `nm2tech-backend`

Now we need to find the full public URL.

## 🔍 Step 1: Check the Route Details

In the Cloudflare dashboard:
1. Click on the `api` hostname route
2. Or click the context menu (three dots) next to it
3. Look for the full URL or domain

## 🔍 Step 2: Possible URL Formats

Since your hostname is `api`, the full URL might be:

**Option A: Cloudflare Default Domain**
```
https://api-01561ed8-1ebc-4f42-a425-9338438d4f1d.cfargotunnel.com
```

**Option B: Simple Format**
```
https://api.cfargotunnel.com
```

**Option C: Custom Domain**
If you have a domain configured:
```
https://api.yourdomain.com
```

## 🔍 Step 3: Check Tunnel Details

1. Go back to: **Networks** → **Connectors** → **nm2tech-backend**
2. Click on the tunnel
3. Look for:
   - "Public URL"
   - "Hostname"
   - "Domain"
   - Any URL shown in the tunnel details

## 🔍 Step 4: Test Possible URLs

Try these URLs in your browser:

```
https://api-01561ed8-1ebc-4f42-a425-9338438d4f1d.cfargotunnel.com/api/health
https://api.cfargotunnel.com/api/health
```

## 🔧 Step 5: Edit the Route

If you click on the `api` route or its context menu:
1. Look for "Edit" or "Configure"
2. Check what domain/hostname is configured
3. The full URL should be shown there

## 🔧 Step 6: Make Sure Tunnel is Running

On your EC2 instance, make sure the named tunnel is running:

```bash
# Stop any quick tunnels
pkill -9 cloudflared

# Start the named tunnel
cloudflared tunnel run --token eyJhIjoiOWVjMTBjNmYwMjQxNzgzMjQ0N2IzOGUxZGZkNTM1ODkiLCJ0IjoiMDE1NjFlZDgtMWViYy00ZjQyLWE0MjUtOTMzODQzOGQ0ZjFkIiwicyI6IllUZzRZMkV4TVdFdFl6VmpOeTAwTWpobExXSTJZemt0TmpZMU5HWTBNRFJpTlRkbSJ9
```

---

*Click on the `api` route to see its full configuration and URL!*



