# Verify Deployment Steps

## ✅ Step 1: Test Tunnel URL First

Before deploying, make sure the tunnel URL works:

**From your Windows browser, test:**
```
https://drawing-grounds-adaptor-advertisers.trycloudflare.com/api/health
```

Should return: `{"status":"ok","message":"NM2TECH Analytics Shorts API is running"}`

**If it doesn't work:**
- Tunnel might have stopped
- Backend might have stopped
- Check both are running on EC2

## ✅ Step 2: Commit and Push (Windows)

On your Windows machine:

```powershell
cd C:\Users\kolaw\Projects\NM2-Analytics-Shorts

# Check if amplify.yml has the changes
git status

# If amplify.yml shows as modified:
git add amplify.yml
git commit -m "Update Cloudflare tunnel backend URL"
git push
```

## ✅ Step 3: Verify Amplify Deployment

1. Go to AWS Amplify Console
2. Your app → **Build history**
3. Check if there's a new build running or completed
4. If no new build, trigger one manually:
   - Go to your app
   - Click **"Redeploy this version"** or trigger a new deployment

## ✅ Step 4: Check Build Logs

In Amplify build logs, look for:
- Environment variables being set
- `VITE_API_URL` being used
- Any errors

## ✅ Step 5: Verify After Deployment

After Amplify finishes deploying:

1. Open your app in browser
2. Press **F12** → **Console** tab
3. Look for log messages:
   ```
   API Base URL: https://drawing-grounds-adaptor-advertisers.trycloudflare.com
   VITE_API_URL env var: https://drawing-grounds-adaptor-advertisers.trycloudflare.com
   ```

If you see `API Base URL: Not set` → The environment variable isn't being used.

## 🔧 Troubleshooting

### If tunnel URL doesn't work:
- Check tunnel is running on EC2: `ps aux | grep cloudflared`
- Check backend is running: `curl http://localhost:5000/api/health`
- Restart tunnel if needed

### If Amplify build didn't pick up changes:
- Make sure you committed and pushed
- Check git status shows amplify.yml as committed
- Trigger a manual redeploy in Amplify

### If environment variable isn't set:
- Check amplify.yml has the environment section
- Make sure it's committed and pushed
- Redeploy Amplify app

---

*Test the tunnel URL first, then commit/push, then check Amplify deployment!*

