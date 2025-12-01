# Fix Tunnel Route Configuration

The route exists but the URL doesn't work. Let's fix the configuration.

## 🔍 Step 1: Check Service Configuration

In the Cloudflare dashboard, on the "Edit hostname route" page:

1. **Look for "Service" field** - it should show: `http://localhost:5000`
2. **If it's empty or wrong**, update it to: `http://localhost:5000`
3. **Save** the changes

## 🔍 Step 2: Make Sure Named Tunnel is Running

On your EC2 instance, make sure you're running the **named tunnel** (not quick tunnel):

```bash
# Kill any quick tunnels
pkill -9 cloudflared

# Start the named tunnel with your token
cloudflared tunnel run --token eyJhIjoiOWVjMTBjNmYwMjQxNzgzMjQ0N2IzOGUxZGZkNTM1ODkiLCJ0IjoiMDE1NjFlZDgtMWViYy00ZjQyLWE0MjUtOTMzODQzOGQ0ZjFkIiwicyI6IllUZzRZMkV4TVdFdFl6VmpOeTAwTWpobExXSTJZemt0TmpZMU5HWTBNRFJpTlRkbSJ9
```

**Important:** Use the named tunnel command, not `cloudflared tunnel --url http://localhost:5000`

## 🔍 Step 3: Check Route Domain

The hostname `api` needs a domain. Check:

1. In the edit route page, look for **"Domain"** or **"Public hostname"** field
2. It might need to be: `api.yourdomain.com` (if you have a domain)
3. Or it might use Cloudflare's default domain

## 🔧 Step 4: Alternative - Use Quick Tunnel for Now

Since the named tunnel route isn't working, let's use a quick tunnel:

```bash
# On EC2, stop named tunnel
pkill -9 cloudflared

# Start quick tunnel
cloudflared tunnel --url http://localhost:5000
```

This will give you a working URL immediately.

## 🔧 Step 5: Or Configure Route Properly

If you want to use the named tunnel:

1. In Cloudflare dashboard, edit the `api` route
2. Make sure **Service** is: `http://localhost:5000`
3. Check if there's a **Domain** field - you might need to add a domain
4. Save

Then the URL might be:
- `https://api.yourdomain.com` (if you have a domain)
- Or check the dashboard for the actual URL

---

*For now, use quick tunnel to get it working, then we can fix the named tunnel route later!*

