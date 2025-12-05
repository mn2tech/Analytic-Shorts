# Restore Working Tunnel Configuration

Since it was working on Wednesday, let's check the Cloudflare dashboard to see what changed.

## 🔍 Step 1: Check Cloudflare Dashboard

1. Go to: https://one.dash.cloudflare.com
2. Navigate to: **Networks** → **Connectors** → **nm2tech-backend**
3. Click **"Edit"** on your tunnel

## 🔍 Step 2: Check Routes Configuration

Look for:
- **Public hostnames** section
- **Routes** section
- Any configured hostnames

**If routes are missing or empty:**
- That's why it's not working
- You need to add a route

## 🔧 Step 3: Add/Configure Route

1. In the tunnel edit page, look for **"Public hostnames"** or **"Routes"**
2. Click **"Add a public hostname"** or **"Configure"**
3. Add:
   - **Public hostname:** Leave empty for default, or use a subdomain
   - **Service:** `http://localhost:5000`
   - **Path:** Leave empty (or set to `/`)
4. **Save**

## 🔧 Step 4: Get the Public URL

After saving, the dashboard should show:
- The public URL for your tunnel
- It might be something like: `https://01561ed8-1ebc-4f42-a425-9338438d4f1d.cfargotunnel.com`
- Or a custom domain if you configured one

## 🔧 Step 5: Use Named Tunnel (Not Quick Tunnel)

Once routes are configured, use the named tunnel:

```bash
# Stop quick tunnel
pkill -9 cloudflared

# Start named tunnel
cloudflared tunnel run nm2tech-backend
# OR
cloudflared tunnel run --token eyJhIjoiOWVjMTBjNmYwMjQxNzgzMjQ0N2IzOGUxZGZkNTM1ODkiLCJ0IjoiMDE1NjFlZDgtMWViYy00ZjQyLWE0MjUtOTMzODQzOGQ0ZjFkIiwicyI6IllUZzRZMkV4TVdFdFl6VmpOeTAwTWpobExXSTJZemt0TmpZMU5HWTBNRFJpTlRkbSJ9
```

## 🔍 Step 6: Check What Changed

Since it worked before, something might have:
- Routes were removed
- Tunnel was reconfigured
- Backend URL changed
- Cloudflare settings changed

Check the Cloudflare dashboard to see the current configuration.

---

## 💡 Quick Fix: Check Dashboard First

**Before trying anything else, check the Cloudflare dashboard:**
1. See if routes are configured
2. See what the public URL should be
3. Check if tunnel status shows as "UP" or "DOWN"

The dashboard will tell us what's wrong!

---

*Check the Cloudflare dashboard first - that will show us what changed since Wednesday!*



