# 🔧 Fix 404 Error for analytics-shorts

## ❌ Problem

Visiting `nm2tech-sas.com/analytics-shorts` shows a 404 error from NM2_Timesheet app.

---

## ✅ Possible Causes

1. **Rewrite rule not added yet** - Need to add the rule in NM2_Timesheet app
2. **Rewrite rule not deployed** - Rule added but Amplify hasn't deployed yet
3. **Analytics Shorts app not rebuilt** - App needs to be rebuilt with base path configuration
4. **Rule order incorrect** - `/analytics-shorts*` rule must come before `/<*>` rule

---

## ✅ Step 1: Verify Rewrite Rule

**Check if the rewrite rule was added:**

1. **Go to:** Amplify Console → NM2_Timesheet app
2. **Go to:** Hosting → Rewrites and redirects
3. **Click:** "Manage redirects"
4. **Check** if the rule exists:
   ```json
   {
     "source": "/analytics-shorts*",
     "status": "200",
     "target": "https://main.d2swtp6vppsxta.amplifyapp.com/analytics-shorts*"
   }
   ```

**If the rule doesn't exist:**
- Add it now (see Step 2)

**If the rule exists:**
- Check if it's deployed (see Step 3)

---

## ✅ Step 2: Add Rewrite Rule (If Not Added)

**If the rule wasn't added yet:**

1. **Go to:** Amplify Console → NM2_Timesheet app
2. **Go to:** Hosting → Rewrites and redirects
3. **Click:** "Manage redirects"
4. **Add** this rule **BEFORE** the `/<*>` rule:
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
5. **Save** changes
6. **Wait** 2-5 minutes for deployment

---

## ✅ Step 3: Check Deployment Status

**After adding the rule:**

1. **Go to:** Amplify Console → NM2_Timesheet app
2. **Check** the deployment status
3. **Look for** "Deploying" or "Deployed" status
4. **Wait** until status shows "Deployed"

---

## ✅ Step 4: Verify Analytics Shorts App Rebuild

**Check if Analytics Shorts app was rebuilt with base path:**

1. **Go to:** Amplify Console → Analytics Shorts app
2. **Check** build history
3. **Verify** the latest build includes the base path changes
4. **If not rebuilt:**
   - The push to main should have triggered a rebuild
   - Check if build is in progress or failed
   - Manually trigger a rebuild if needed

---

## ✅ Step 5: Test Again

**After both are deployed:**

1. **Wait** 2-5 minutes after deployment completes
2. **Clear** browser cache (Ctrl+Shift+Delete)
3. **Visit:** `https://nm2tech-sas.com/analytics-shorts`
4. **Should show** Analytics Shorts app ✅

---

## 🔍 Troubleshooting Checklist

- [ ] Rewrite rule added in NM2_Timesheet app?
- [ ] Rule order correct? (`/analytics-shorts*` before `/<*>`)
- [ ] Rule deployed? (Status shows "Deployed")
- [ ] Analytics Shorts app rebuilt? (Check build history)
- [ ] Base path configured? (`basename="/analytics-shorts"` in code)
- [ ] Waited 2-5 minutes after deployment?
- [ ] Cleared browser cache?

---

## 📝 Common Issues

### Issue 1: Rule Not Deployed Yet
**Solution:** Wait 2-5 minutes after saving the rule

### Issue 2: Rule Order Wrong
**Solution:** Make sure `/analytics-shorts*` comes before `/<*>` in the JSON array

### Issue 3: Analytics Shorts App Not Rebuilt
**Solution:** Check build status and trigger rebuild if needed

### Issue 4: Browser Cache
**Solution:** Clear browser cache or try incognito mode

---

## 🎯 Quick Fix Steps

1. **Verify** rewrite rule exists and is deployed
2. **Verify** Analytics Shorts app was rebuilt
3. **Wait** 2-5 minutes after both are deployed
4. **Clear** browser cache
5. **Test** again

---

**Check if the rewrite rule was added and deployed!** 🔍

If it wasn't added yet, add it now. If it was added, wait for deployment to complete.

