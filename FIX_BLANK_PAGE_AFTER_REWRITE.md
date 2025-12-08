# 🔧 Fix Blank Page After Rewrite

## ❌ Problem

The page is blank - this means the rewrite rule is likely working (proxying to Analytics Shorts), but the app isn't loading correctly.

---

## ✅ Step 1: Check Browser Console

**Open browser developer tools to see errors:**

1. **Press** `F12` or `Ctrl+Shift+I` to open DevTools
2. **Go to** "Console" tab
3. **Look for** red error messages
4. **Check** for:
   - 404 errors for assets (JS, CSS files)
   - JavaScript errors
   - CORS errors
   - Network errors

**Common errors:**
- `Failed to load resource: 404` - Assets not found
- `CORS policy` - Cross-origin issues
- `Uncaught Error` - JavaScript errors

---

## ✅ Step 2: Check Network Tab

**See what requests are being made:**

1. **Open** DevTools (F12)
2. **Go to** "Network" tab
3. **Reload** the page
4. **Check** the requests:
   - **Status codes:** Are they 200, 404, or other?
   - **Assets loading?** (JS, CSS files)
   - **What's the response?** (HTML, JSON, error)

---

## ✅ Step 3: Verify Analytics Shorts App is Working

**Test if the app works directly:**

1. **Visit:** `https://main.d2swtp6vppsxta.amplifyapp.com`
2. **Does it work?**
   - **If yes:** App is working, issue is with rewrite rule
   - **If no:** App needs to be rebuilt or has errors

---

## ✅ Step 4: Check Rewrite Rule Target

**Verify the rewrite rule is pointing to the correct URL:**

1. **Go to:** NM2_Timesheet app → Rewrites and redirects → Manage redirects
2. **Check** the target URL:
   - Should be: `https://main.d2swtp6vppsxta.amplifyapp.com/<*>`
   - Or: `https://main.d2swtp6vppsxta.amplifyapp.com/`
3. **Verify** it's correct

---

## ✅ Step 5: Check Analytics Shorts App Build

**Verify the app was rebuilt after removing base path:**

1. **Go to:** Amplify Console → Analytics Shorts app
2. **Go to:** Build history
3. **Check** latest build:
   - **Status:** Should be "Succeeded" ✅
   - **Time:** Should be after commit `bd4cd3d` (base path removal)
   - **Look for:** Any errors or warnings

**If build not completed:**
- Wait for it to finish
- Or trigger a rebuild manually

---

## ✅ Step 6: Try Different Rewrite Syntax

**The rewrite rule might need different syntax. Try this:**

**Current:**
```json
{
  "source": "/analytics-shorts/<*>",
  "status": "200",
  "target": "https://main.d2swtp6vppsxta.amplifyapp.com/<*>"
}
```

**Alternative (keep path in target):**
```json
{
  "source": "/analytics-shorts*",
  "status": "200",
  "target": "https://main.d2swtp6vppsxta.amplifyapp.com/analytics-shorts*"
}
```

**This keeps the `/analytics-shorts` prefix**, which might be needed if the app expects it.

---

## 🔍 Common Issues

### Issue 1: Assets Not Loading
**Symptom:** Blank page, 404 errors for JS/CSS
**Solution:** Check if assets are being requested from correct path

### Issue 2: CORS Error
**Symptom:** Blank page, CORS errors in console
**Solution:** Check backend CORS configuration

### Issue 3: App Not Rebuilt
**Symptom:** Blank page, old version loading
**Solution:** Check build status, trigger rebuild

### Issue 4: Rewrite Rule Not Stripping Path
**Symptom:** App trying to load from `/analytics-shorts` path
**Solution:** Try alternative rewrite syntax (keep path in target)

---

## 🎯 Quick Checklist

- [ ] Checked browser console for errors
- [ ] Checked network tab for failed requests
- [ ] Tested direct URL (`main.d2swtp6vppsxta.amplifyapp.com`)
- [ ] Verified Analytics Shorts app was rebuilt
- [ ] Checked rewrite rule target URL
- [ ] Tried alternative rewrite syntax
- [ ] Cleared browser cache

---

## 📝 Next Steps

1. **First:** Check browser console for errors
2. **Second:** Test direct URL to see if app works
3. **Third:** Check build status
4. **Fourth:** Try alternative rewrite syntax if needed

---

**Check the browser console first to see what errors are occurring!** 🔍

The blank page usually means there are JavaScript errors or assets not loading. The console will tell us what's wrong.

