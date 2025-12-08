# ✅ Add Rewrite Rule to NM2_Timesheet App

## ⚠️ Important: Wrong App!

You're currently in the **Analytics Shorts** app, but the rewrite rule needs to be added in the **NM2_Timesheet** app (the one with the root domain `nm2tech-sas.com`).

---

## ✅ Step 1: Switch to NM2_Timesheet App

1. **Go to:** AWS Amplify Console
2. **Select** the **NM2_Timesheet** app (not Analytics Shorts)
3. **Go to:** Hosting → Rewrites and redirects
4. **Click:** "Manage redirects" button

---

## ✅ Step 2: Add Rewrite Rule

**In the JSON editor, you'll see the current configuration. Add a new rule BEFORE the existing `/<*>` rule:**

**Current configuration:**
```json
[
  {
    "source": "/<*>",
    "status": "404-200",
    "target": "/index.html"
  }
]
```

**Updated configuration (add the analytics-shorts rule first):**
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

**Important:** The `/analytics-shorts*` rule must come **before** the `/<*>` rule so it matches first!

---

## ✅ Step 3: Save Changes

1. **Click** "Save" button
2. **Amplify will deploy** the changes (takes 2-5 minutes)
3. **Wait** for deployment to complete

---

## ✅ Step 4: Test

After deployment:

1. **Visit:** `https://nm2tech-sas.com/analytics-shorts`
2. **Should show** Analytics Shorts app ✅
3. **All routes** should work correctly

---

## 🎯 Quick Checklist

- [ ] Switched to NM2_Timesheet app
- [ ] Went to Rewrites and redirects
- [ ] Clicked "Manage redirects"
- [ ] Added `/analytics-shorts*` rule BEFORE `/<*>` rule
- [ ] Saved changes
- [ ] Waited for deployment (2-5 min)
- [ ] Tested `nm2tech-sas.com/analytics-shorts` - working! ✅

---

## 📝 Rule Configuration

**New rule to add:**
```json
{
  "source": "/analytics-shorts*",
  "status": "200",
  "target": "https://main.d2swtp6vppsxta.amplifyapp.com/analytics-shorts*"
}
```

**Why status "200":**
- This is a **rewrite** (not redirect)
- Status "200" means it proxies the request
- The URL stays as `nm2tech-sas.com/analytics-shorts` in the browser

---

## 🔍 Rule Order Matters!

**Rules are evaluated in order:**
1. **First:** `/analytics-shorts*` → Matches and proxies to Analytics Shorts app
2. **Second:** `/<*>` → Catches everything else for SPA routing

**If `/<*>` comes first, it will catch `/analytics-shorts*` too!**

---

**Switch to NM2_Timesheet app and add the rewrite rule there!** 🚀

The rule needs to be in the app that owns the root domain (`nm2tech-sas.com`).

