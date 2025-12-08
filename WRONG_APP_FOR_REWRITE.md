# ⚠️ Wrong App for Rewrite Rule!

## ❌ Problem

You're currently in the **Analytics Shorts** app's "Manage rewrites and redirects" page, but the rewrite rule needs to be in the **NM2_Timesheet** app!

**Why:**
- The root domain `nm2tech-sas.com` is configured in **NM2_Timesheet** app
- Rewrite rules need to be in the app that owns the domain
- Analytics Shorts app doesn't have the domain, so its rewrite rules won't work for `nm2tech-sas.com/analytics-shorts`

---

## ✅ Solution: Add Rule to NM2_Timesheet App

### Step 1: Switch to NM2_Timesheet App

1. **Go to:** Amplify Console → All apps
2. **Click** on **NM2_Timesheet** app (the one with `mobile-app` branch)
3. **This is the app** that has `nm2tech-sas.com` configured

### Step 2: Go to Rewrites and Redirects

1. **In NM2_Timesheet app**, go to: Hosting → Rewrites and redirects
2. **Click:** "Manage redirects"
3. **This is where** you need to add the rewrite rule

### Step 3: Add Rewrite Rule

**In the JSON editor, add this configuration:**

```json
[
  {
    "source": "/analytics-shorts/<*>",
    "status": "200",
    "target": "https://main.d2swtp6vppsxta.amplifyapp.com/<*>"
  },
  {
    "source": "/analytics-shorts",
    "status": "200",
    "target": "https://main.d2swtp6vppsxta.amplifyapp.com/"
  },
  {
    "source": "/<*>",
    "status": "404-200",
    "target": "/index.html"
  }
]
```

**Important:**
- Rules must be in **NM2_Timesheet** app, not Analytics Shorts app
- `/analytics-shorts` rules must come BEFORE `/<*>` rule
- This will proxy requests from `nm2tech-sas.com/analytics-shorts` to Analytics Shorts app

### Step 4: Save and Deploy

1. **Click** "Save" button
2. **Wait** 5-10 minutes for deployment
3. **Test:** `https://nm2tech-sas.com/analytics-shorts`

---

## 🔍 Why It's Not Working

**The rewrite rules in Analytics Shorts app won't work because:**
- Analytics Shorts app doesn't own `nm2tech-sas.com` domain
- Rewrite rules only work for domains owned by that app
- The domain is owned by NM2_Timesheet app

**The rewrite rule must be in the app that owns the domain!**

---

## 🎯 Quick Checklist

- [ ] Switched to NM2_Timesheet app (mobile-app branch)
- [ ] Went to Rewrites and redirects
- [ ] Clicked "Manage redirects"
- [ ] Added `/analytics-shorts` rules BEFORE `/<*>` rule
- [ ] Saved changes
- [ ] Waited 5-10 minutes for deployment
- [ ] Tested `nm2tech-sas.com/analytics-shorts` - working! ✅

---

## 📝 Note

**You can remove the rewrite rules from Analytics Shorts app** - they're not needed there and won't work anyway.

---

**Switch to NM2_Timesheet app and add the rewrite rule there!** 🚀

The rewrite rule must be in the app that owns the `nm2tech-sas.com` domain, which is NM2_Timesheet app.

