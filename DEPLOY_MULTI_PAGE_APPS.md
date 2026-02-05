# Deploy Multi-Page Apps Feature

## ✅ Code Already Pushed to GitHub

The multi-page apps feature has been pushed to GitHub. Now you need to:

## Step 1: Frontend (AWS Amplify)

**AWS Amplify should auto-deploy**, but check:

1. **Go to AWS Amplify Console:**
   - https://console.aws.amazon.com/amplify
   - Select your Analytics Shorts app

2. **Check Build Status:**
   - Look at "Build history"
   - Should see a new build starting automatically
   - Wait 3-5 minutes for build to complete

3. **If build didn't start automatically:**
   - Click "Redeploy this version" on the latest commit
   - Or trigger a new deployment manually

## Step 2: Backend (EC2 Server)

**SSH into your EC2 server and run:**

```bash
# SSH into EC2
ssh -i your-key.pem raj@your-ec2-ip

# Navigate to project
cd /home/raj/Analytic-Shorts

# Pull latest changes
git pull origin main

# Navigate to backend
cd backend

# Restart PM2 to apply changes
pm2 restart analytics-api --update-env

# Verify it's running
pm2 logs analytics-api --lines 20
```

**This will:**
- ✅ Update backend with new `/api/dashboards/:id/publish` endpoint
- ✅ Apply all multi-page app backend changes

## Step 3: Clear Browser Cache

**After both deployments complete:**

1. **Hard refresh browser:**
   - Windows/Linux: `Ctrl + Shift + R` or `Ctrl + F5`
   - Mac: `Cmd + Shift + R`

2. **Or clear cache:**
   - Press `F12` to open DevTools
   - Right-click refresh button → "Empty Cache and Hard Reload"

## Step 4: Test the Feature

1. **Create new multi-page app:**
   - Navigate to: `https://your-amplify-url.com/studio/app/new`
   - Should see the sample 2-page app

2. **Test routes:**
   - `/studio/app/new` - Create new app
   - `/studio/app/:id` - Edit existing app
   - `/apps/:id` - View published app

3. **Test drilldown:**
   - Click on a bar chart
   - Should navigate to details page with filters applied

## Troubleshooting

### "Route not found" error
- ✅ Check that Amplify build completed successfully
- ✅ Clear browser cache
- ✅ Verify routes in `src/App.jsx` are correct

### "Cannot connect to backend" error
- ✅ Check backend is running: `pm2 logs analytics-api`
- ✅ Verify backend has latest code: `git log` in backend folder
- ✅ Test publish endpoint: `curl http://localhost:5000/api/dashboards/test-id/publish`

### Build fails in Amplify
- ✅ Check build logs in Amplify console
- ✅ Verify all imports are correct
- ✅ Check for TypeScript/ESLint errors

## What Was Added

### Frontend Routes:
- `/studio/app/:id` - Editor mode
- `/apps/:id` - View mode (published)
- `/apps/:id/:pageId` - View specific page

### Backend Endpoint:
- `POST /api/dashboards/:id/publish` - Publish and lock version

### New Components:
- `AppShell` - Top nav, page tabs, Save/Publish
- `PageRenderer` - Renders pages with widgets
- `FilterBar` - Filter controls
- Widget components with drilldown support

## Expected Timeline

- **Amplify Build:** 3-5 minutes (auto-starts)
- **EC2 Update:** 2-3 minutes (manual)
- **Total:** ~5-8 minutes

## Verification Checklist

- [ ] Amplify build completed successfully
- [ ] Backend updated on EC2
- [ ] PM2 restarted
- [ ] Browser cache cleared
- [ ] Can access `/studio/app/new`
- [ ] Can create and save app
- [ ] Can publish app
- [ ] Can view published app at `/apps/:id`
- [ ] Drilldown navigation works
