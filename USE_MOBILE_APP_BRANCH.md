# ✅ Use mobile-app Branch App

## ✅ Correct App Identified

**Use the NM2_Timesheet app with `mobile-app` branch!**

This is the app that has:
- ✅ `nm2tech-sas.com` configured
- ✅ Subdomains mapped to `mobile-app` branch
- ✅ Serves `https://nm2tech-sas.com/nm2timesheet`

---

## ✅ Step 1: Open the Correct App

1. **Click** on the **NM2_Timesheet** app with **Prod branch: `mobile-app`**
2. **This is the app** where you need to add the rewrite rule

---

## ✅ Step 2: Add Rewrite Rule

1. **Go to:** Hosting → Rewrites and redirects
2. **Click:** "Manage redirects"
3. **Add** this rule **BEFORE** the `/<*>` rule:

```json
[
  {
    "source": "/analytics-shorts/<*>",
    "status": "200",
    "target": "https://main.d2swtp6vppsxta.amplifyapp.com/<*>"
  },
  {
    "source": "/<*>",
    "status": "404-200",
    "target": "/index.html"
  }
]
```

**Important:**
- `/analytics-shorts/<*>` rule **must come first**
- The `<*>` in the target strips the `/analytics-shorts` prefix
- This proxies to Analytics Shorts app root

---

## ✅ Step 3: Save and Deploy

1. **Click** "Save" button
2. **Wait** 2-5 minutes for deployment
3. **Check** deployment status

---

## ✅ Step 4: Test

After deployment:

1. **Visit:** `https://nm2tech-sas.com/analytics-shorts`
2. **Should show** Analytics Shorts app ✅
3. **All routes** should work correctly

---

## 🎯 Quick Checklist

- [x] Identified correct app: `mobile-app` branch ✅
- [ ] Opened mobile-app branch app
- [ ] Went to Rewrites and redirects
- [ ] Clicked "Manage redirects"
- [ ] Added `/analytics-shorts/<*>` rule before `/<*>` rule
- [ ] Saved changes
- [ ] Waited for deployment (2-5 min)
- [ ] Tested `nm2tech-sas.com/analytics-shorts` - working! ✅

---

**Use the mobile-app branch app to add the rewrite rule!** 🚀

This is the app that has the domain configured and serves your timesheet app.

