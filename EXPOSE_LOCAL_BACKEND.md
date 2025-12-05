# Expose Local Backend for Amplify

Since your backend works locally, we need to expose it so your Amplify frontend can access it.

## 🚀 Quick Solution: Cloudflare Tunnel

### Step 1: Download Cloudflared (Windows)

1. **Download cloudflared:**
   - Go to: https://github.com/cloudflare/cloudflared/releases/latest
   - Download: `cloudflared-windows-amd64.exe`
   - Or use direct link: https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe

2. **Rename and move it:**
   ```powershell
   # Rename to cloudflared.exe
   # Move to a folder in your PATH (e.g., C:\Windows\System32)
   # Or keep it in a folder and add that folder to PATH
   ```

3. **Or use Chocolatey (if installed):**
   ```powershell
   choco install cloudflared
   ```

### Step 2: Make Sure Backend is Running

In one PowerShell window, make sure backend is running:

```powershell
cd C:\Users\kolaw\Projects\NM2-Analytics-Shorts\backend
npm start
```

You should see: `🚀 Server running on http://localhost:5000`

**Keep this window open!**

### Step 3: Start Cloudflare Tunnel

Open a **NEW** PowerShell window and run:

```powershell
cloudflared tunnel --url http://localhost:5000
```

**You'll see output like:**
```
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
|  https://xxxx-xxxx-xxxx.trycloudflare.com                                                 |
+--------------------------------------------------------------------------------------------+
```

**Copy that HTTPS URL!** (e.g., `https://addresses-population-eat-settled.trycloudflare.com`)

**Keep this window open too!** The tunnel needs to stay running.

### Step 4: Test the Tunnel URL

Open a browser and test:

```
https://xxxx-xxxx-xxxx.trycloudflare.com/api/health
```

Should return: `{"status":"ok","message":"NM2TECH Analytics Shorts API is running"}`

### Step 5: Update amplify.yml

Open `amplify.yml` and update it:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  environment:
    VITE_API_URL: https://xxxx-xxxx-xxxx.trycloudflare.com  # ← Replace with your tunnel URL
```

**Important:**
- Replace `https://xxxx-xxxx-xxxx.trycloudflare.com` with the actual URL from Step 3
- No trailing slash
- No `/api` in the URL

### Step 6: Commit and Push

```powershell
git add amplify.yml
git commit -m "Add backend URL from Cloudflare tunnel"
git push
```

Amplify will automatically detect the change and redeploy!

---

## ⚠️ Important Notes

### Keep These Running:

1. **Backend server** (PowerShell window 1):
   ```powershell
   cd backend
   npm start
   ```

2. **Cloudflare Tunnel** (PowerShell window 2):
   ```powershell
   cloudflared tunnel --url http://localhost:5000
   ```

**Both must stay running** for your app to work!

### Tunnel URL Changes

⚠️ **Note:** The Cloudflare tunnel URL changes each time you restart it. If you restart the tunnel, you'll need to:
1. Get the new URL
2. Update `amplify.yml` again
3. Commit and push

---

## 🔄 Alternative: Use ngrok (Another Option)

If Cloudflare Tunnel doesn't work, try ngrok:

### Step 1: Install ngrok

```powershell
# Using Chocolatey
choco install ngrok

# Or download from: https://ngrok.com/download
```

### Step 2: Start Tunnel

```powershell
ngrok http 5000
```

### Step 3: Copy the HTTPS URL

You'll see something like:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:5000
```

Use: `https://abc123.ngrok.io`

### Step 4: Update amplify.yml

Same as Step 5 above, but use the ngrok URL.

---

## ✅ After Setup

1. ✅ Backend running on `localhost:5000`
2. ✅ Tunnel running (Cloudflare or ngrok)
3. ✅ `amplify.yml` updated with tunnel URL
4. ✅ Changes committed and pushed
5. ✅ Amplify redeploys automatically

**Test your app:** Go to your Amplify URL and try uploading a file or using example data!

---

## 🚨 Troubleshooting

### Tunnel URL Not Working?

1. **Check backend is running:**
   ```powershell
   curl http://localhost:5000/api/health
   ```

2. **Check tunnel is running:**
   - Look at the tunnel window - it should show the URL
   - If it closed, restart it

3. **Test tunnel URL directly:**
   ```
   https://your-tunnel-url.trycloudflare.com/api/health
   ```

### Amplify Still Can't Connect?

1. **Check `amplify.yml` is correct:**
   - No trailing slash
   - No `/api` in URL
   - Uses `https://`

2. **Check Amplify build logs:**
   - Go to Amplify Console → Build history
   - Check latest build for errors

3. **Verify environment variable:**
   - After build, check browser console (F12)
   - Should see: `API Base URL: https://your-tunnel-url.trycloudflare.com`

---

## 💡 Pro Tip: Keep Tunnel Running

To keep the tunnel running even if you close PowerShell:

1. **Use Windows Task Scheduler** to run it on startup
2. **Or use a service manager** like NSSM
3. **Or just keep the PowerShell window open** (simplest)

---

*Once everything is working, you can later deploy the backend to a permanent server (Railway, Render, EC2) for a more stable solution.*



