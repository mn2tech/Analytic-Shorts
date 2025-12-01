# Start Your Existing Cloudflare Tunnel

You already have a tunnel named "nm2tech-backend" in Cloudflare, but it's currently DOWN. Here's how to start it:

## 🔍 Your Tunnel Info

- **Tunnel Name:** nm2tech-backend
- **Tunnel ID:** `01561ed8-1ebc-4f42-a425-9338438d4f1d`
- **Status:** DOWN (needs to be started)

---

## 🚀 Step 1: Make Sure Backend is Running

In PowerShell, start your backend:

```powershell
cd C:\Users\kolaw\Projects\NM2-Analytics-Shorts\backend
npm start
```

Keep this running! You should see: `🚀 Server running on http://localhost:5000`

---

## 🚀 Step 2: Login to Cloudflare (If Not Already)

```powershell
cloudflared tunnel login
```

This will:
1. Open a browser window
2. Ask you to login to Cloudflare (you're already logged in)
3. Authorize the tunnel

---

## 🚀 Step 3: Start the Tunnel

Run this command to start your existing tunnel:

```powershell
cloudflared tunnel run nm2tech-backend
```

**OR** if that doesn't work, use the tunnel ID:

```powershell
cloudflared tunnel run 01561ed8-1ebc-4f42-a425-9338438d4f1d
```

---

## ⚠️ If You Get "Tunnel credentials not found"

You need to download the tunnel credentials:

### Option A: Download from Cloudflare Dashboard

1. In the Cloudflare dashboard, click on your tunnel "nm2tech-backend"
2. Look for "Download credentials" or "Configure" button
3. Download the JSON file
4. Save it to: `C:\Users\kolaw\.cloudflared\01561ed8-1ebc-4f42-a425-9338438d4f1d.json`

### Option B: Use Quick Tunnel (Easier for Now)

If the above is complicated, just use a quick tunnel:

```powershell
cloudflared tunnel --url http://localhost:5000
```

This will give you a URL like: `https://xxxx-xxxx-xxxx.trycloudflare.com`

---

## 🔧 Step 4: Configure Routes (If Needed)

If you want to use a custom domain or subdomain:

1. In Cloudflare dashboard, click "Edit" on your tunnel
2. Add a route:
   - **Public hostname:** `api.yourdomain.com` (or use the default)
   - **Service:** `http://localhost:5000`
3. Save

---

## 📍 Step 5: Get Your Backend URL

### If Using Quick Tunnel:

The URL is shown in the terminal output:
```
https://xxxx-xxxx-xxxx.trycloudflare.com
```

### If Using Named Tunnel:

1. Go to Cloudflare dashboard → Your tunnel
2. Check the "Routes" section
3. Your URL will be shown there
4. Or use the default: `https://01561ed8-1ebc-4f42-a425-9338438d4f1d.cfargotunnel.com`

---

## ✅ Step 6: Test the URL

Open a browser and test:

```
https://your-tunnel-url/api/health
```

Should return: `{"status":"ok","message":"NM2TECH Analytics Shorts API is running"}`

---

## 📝 Step 7: Update amplify.yml

Once you have the URL, update `amplify.yml`:

```yaml
environment:
  VITE_API_URL: https://your-tunnel-url-here
```

Then commit and push:

```powershell
git add amplify.yml
git commit -m "Add backend URL"
git push
```

---

## 💡 Recommendation: Use Quick Tunnel for Now

Since your tunnel is down and might need configuration, the **easiest** option is:

1. **Use quick tunnel:**
   ```powershell
   cloudflared tunnel --url http://localhost:5000
   ```

2. **Copy the URL it gives you**

3. **Update amplify.yml with that URL**

4. **Keep both running:**
   - Backend: `npm start`
   - Tunnel: `cloudflared tunnel --url http://localhost:5000`

---

## ⚠️ Important Notes

- **Keep both windows open:**
  - Backend server (PowerShell window 1)
  - Cloudflare tunnel (PowerShell window 2)

- **Tunnel URL changes:**
  - Quick tunnel URLs change when you restart
  - Named tunnel URLs stay the same (but need proper setup)

- **For production:**
  - Later, you can set up the named tunnel properly
  - Or deploy backend to Railway/Render for a permanent URL

---

*Start with the quick tunnel to get it working, then you can configure the named tunnel later!*

