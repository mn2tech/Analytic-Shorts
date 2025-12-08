# 🔧 Troubleshoot 404 Error with Rewrite Rule

## ❌ Still Getting 404

Even though the rewrite rule is configured, you're still getting a 404. Let's troubleshoot step by step.

---

## ✅ Step 1: Verify Rule is Saved and Deployed

1. **Go to:** Amplify Console → NM2_Timesheet app
2. **Go to:** Hosting → Rewrites and redirects (not the editor)
3. **Check** if the rule appears in the table
4. **Look for** deployment status or timestamp

**If rule not in table:**
- Go back to "Manage redirects"
- Make sure you clicked "Save"
- Wait for it to appear in the table

---

## ✅ Step 2: Check Analytics Shorts App Build Status

**The Analytics Shorts app must be rebuilt after removing base path:**

1. **Go to:** Amplify Console → Analytics Shorts app
2. **Go to:** Build history
3. **Check** the latest build:
   - **Status:** Should be "Succeeded" ✅
   - **Time:** Should be after you pushed the base path removal (commit `bd4cd3d`)
   - **Look for:** Any errors

**If build not completed or failed:**
- Wait for it to finish
- Or manually trigger a rebuild

---

## ✅ Step 3: Try Alternative Rewrite Syntax

**Amplify might need a different syntax. Try this:**

**Current (might not work):**
```json
{
  "source": "/analytics-shorts/<*>",
  "status": "200",
  "target": "https://main.d2swtp6vppsxta.amplifyapp.com/<*>"
}
```

**Alternative 1 (without wildcard in target):**
```json
{
  "source": "/analytics-shorts*",
  "status": "200",
  "target": "https://main.d2swtp6vppsxta.amplifyapp.com"
}
```

**Alternative 2 (with full path):**
```json
{
  "source": "/analytics-shorts/<*>",
  "status": "200",
  "target": "https://main.d2swtp6vppsxta.amplifyapp.com/<*>"
}
```

**Try updating the rule and save again.**

---

## ✅ Step 4: Check Direct Access to Analytics Shorts

**Test if Analytics Shorts app works directly:**

1. **Visit:** `https://main.d2swtp6vppsxta.amplifyapp.com`
2. **Does it work?**
   - **If yes:** App is working, issue is with rewrite rule
   - **If no:** App needs to be rebuilt

---

## ✅ Step 5: Wait Longer

**Amplify deployments can take time:**

1. **Wait** 5-10 minutes after saving the rewrite rule
2. **CloudFront** needs to propagate the changes
3. **Clear** browser cache completely
4. **Try** in incognito mode

---

## ✅ Step 6: Check Browser Console

**Open browser developer tools to see what's happening:**

1. **Press** `F12` to open DevTools
2. **Go to** "Network" tab
3. **Reload** the page
4. **Check** the request to `/analytics-shorts`:
   - **Status code:** What is it? (404, 200, etc.)
   - **Response:** What does it return?
   - **Headers:** Check if it's being proxied

---

## 🔍 Common Issues

### Issue 1: Rule Not Deployed
**Symptom:** Rule configured but 404 persists
**Solution:** Wait 5-10 minutes, check deployment status

### Issue 2: Wrong Syntax
**Symptom:** Rule saved but not working
**Solution:** Try alternative syntax (see Step 3)

### Issue 3: App Not Rebuilt
**Symptom:** Direct access doesn't work
**Solution:** Check build status, trigger rebuild if needed

### Issue 4: Cache Issue
**Symptom:** Works in incognito but not normal browser
**Solution:** Clear browser cache completely

---

## 🎯 Quick Checklist

- [ ] Rewrite rule saved and appears in table?
- [ ] Analytics Shorts app rebuilt? (Check build history)
- [ ] Direct access works? (`main.d2swtp6vppsxta.amplifyapp.com`)
- [ ] Waited 5-10 minutes after saving?
- [ ] Cleared browser cache?
- [ ] Checked browser console/network tab?
- [ ] Tried alternative rewrite syntax?

---

## 📝 Next Steps

1. **First:** Verify Analytics Shorts app was rebuilt
2. **Second:** Check if rewrite rule is deployed (wait 5-10 min)
3. **Third:** Try alternative rewrite syntax if needed
4. **Fourth:** Check browser console for errors

---

**Check the Analytics Shorts app build status first!** 🔍

The most likely issue is that the app hasn't been rebuilt yet after removing the base path.

