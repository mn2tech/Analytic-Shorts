# 🔍 Verify and Fix 404 Error

## ❌ Still Getting 404

The 404 error means the rewrite rule either:
1. **Wasn't added yet**
2. **Was added but not deployed**
3. **Analytics Shorts app not rebuilt**
4. **Rule configuration incorrect**

---

## ✅ Step-by-Step Verification

### Step 1: Check if Rewrite Rule Exists

1. **Go to:** Amplify Console → NM2_Timesheet app
2. **Go to:** Hosting → Rewrites and redirects
3. **Click:** "Manage redirects"
4. **Check** the JSON configuration

**What to look for:**
- Is there a rule with `"source": "/analytics-shorts*"`?
- Is it **before** the `/<*>` rule?
- Is the target correct: `https://main.d2swtp6vppsxta.amplifyapp.com/analytics-shorts*`?

**If rule doesn't exist:**
- Add it now (see Step 2)

**If rule exists:**
- Check deployment status (see Step 3)

---

### Step 2: Add Rewrite Rule (If Missing)

**If the rule wasn't added:**

1. **In the JSON editor**, you should see:
   ```json
   [
     {
       "source": "/<*>",
       "status": "404-200",
       "target": "/index.html"
     }
   ]
   ```

2. **Update it to:**
   ```json
   [
     {
       "source": "/analytics-shorts*",
       "status": "200",
       "target": "https://main.d2swtp6vppsxta.amplifyapp.com/analytics-shorts*"
     },
     {
       "source": "/<*>",
       "status": "404-200",
       "target": "/index.html"
     }
   ]
   ```

3. **Click** "Save"
4. **Wait** 2-5 minutes for deployment

---

### Step 3: Check Deployment Status

**After saving the rule:**

1. **Go back to:** Rewrites and redirects page
2. **Check** if there's a deployment status indicator
3. **Or check:** App settings → General → Last deployment
4. **Wait** until deployment completes

---

### Step 4: Verify Analytics Shorts App Rebuild

**Check if Analytics Shorts app was rebuilt:**

1. **Go to:** Amplify Console → Analytics Shorts app
2. **Go to:** Build history
3. **Check** the latest build:
   - **Status:** Should be "Succeeded"
   - **Branch:** Should be `main`
   - **Time:** Should be after you pushed the base path changes

**If build failed or not triggered:**
- **Manually trigger** a rebuild:
  1. Go to: App settings → Build settings
  2. Click "Redeploy this version" or trigger a new build

---

### Step 5: Test with Full URL

**Try accessing the Analytics Shorts app directly:**

1. **Visit:** `https://main.d2swtp6vppsxta.amplifyapp.com/analytics-shorts`
2. **Does it work?** 
   - **If yes:** The app is configured correctly, issue is with the rewrite rule
   - **If no:** The app needs to be rebuilt with base path configuration

---

### Step 6: Clear Cache and Test

**After both are deployed:**

1. **Clear browser cache:**
   - Press `Ctrl+Shift+Delete`
   - Select "Cached images and files"
   - Clear data
2. **Or try incognito mode:**
   - Press `Ctrl+Shift+N` (Chrome) or `Ctrl+Shift+P` (Firefox)
   - Visit: `https://nm2tech-sas.com/analytics-shorts`
3. **Test again**

---

## 🎯 Quick Checklist

- [ ] Rewrite rule added in NM2_Timesheet app?
- [ ] Rule order correct? (`/analytics-shorts*` before `/<*>`)
- [ ] Rule saved and deployed? (Wait 2-5 min)
- [ ] Analytics Shorts app rebuilt? (Check build history)
- [ ] Base path configured in code? (`basename="/analytics-shorts"`)
- [ ] Direct URL works? (`main.d2swtp6vppsxta.amplifyapp.com/analytics-shorts`)
- [ ] Cleared browser cache?
- [ ] Tested again?

---

## 🔍 Common Issues

### Issue 1: Rule Not Added
**Symptom:** 404 error persists
**Solution:** Add the rewrite rule in NM2_Timesheet app

### Issue 2: Rule Not Deployed
**Symptom:** Rule exists but 404 persists
**Solution:** Wait 2-5 minutes for deployment, check status

### Issue 3: Rule Order Wrong
**Symptom:** 404 or wrong app shows
**Solution:** Make sure `/analytics-shorts*` comes before `/<*>` in JSON array

### Issue 4: App Not Rebuilt
**Symptom:** Direct URL doesn't work with `/analytics-shorts` path
**Solution:** Trigger rebuild of Analytics Shorts app

---

## 📝 Next Steps

1. **First:** Verify rewrite rule exists and is correct
2. **Second:** Check if Analytics Shorts app was rebuilt
3. **Third:** Wait for deployments to complete
4. **Fourth:** Clear cache and test

---

**Check if the rewrite rule was added!** 🔍

If it wasn't added, add it now. If it was added, verify the deployment status and Analytics Shorts app rebuild.

