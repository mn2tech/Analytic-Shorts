# ✅ Add analytics-shorts Rewrite Rule

## ✅ Perfect! You're in the Right App

You're now in the **NM2_Timesheet** app on the "Rewrites and redirects" page. I can see there's already one rule for SPA routing (`/<*>` → `/index.html`).

Now let's add the rewrite rule for `/analytics-shorts*`.

---

## ✅ Step 1: Click "Manage redirects"

1. **Click** the purple **"Manage redirects"** button (top right of the content area)
2. **This will open** the JSON editor for managing redirects

---

## ✅ Step 2: Add the Rewrite Rule

**In the JSON editor, you'll see the current configuration. Add the new rule BEFORE the existing `/<*>` rule:**

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

**Updated configuration (add analytics-shorts rule first):**
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

**Important points:**
- The `/analytics-shorts*` rule **must come first** (before `/<*>`)
- Use `"status": "200"` for rewrite (proxies the request)
- The target includes the full Analytics Shorts app URL with the path

---

## ✅ Step 3: Save Changes

1. **Click** "Save" button
2. **Amplify will deploy** the changes (takes 2-5 minutes)
3. **Wait** for deployment to complete

---

## ✅ Step 4: Verify Rule Order

**After saving, verify the rules are in this order:**
1. `/analytics-shorts*` → Analytics Shorts app (first)
2. `/<*>` → SPA routing (second)

**Why order matters:**
- Rules are evaluated **top to bottom**
- If `/<*>` comes first, it will catch `/analytics-shorts*` too
- More specific rules should come before wildcard rules

---

## ✅ Step 5: Test

After deployment (2-5 minutes):

1. **Visit:** `https://nm2tech-sas.com/analytics-shorts`
2. **Should show** Analytics Shorts app ✅
3. **All routes** should work correctly
4. **Navigation** should work properly

---

## 🎯 Quick Checklist

- [x] In NM2_Timesheet app ✅
- [x] On Rewrites and redirects page ✅
- [ ] Clicked "Manage redirects" button
- [ ] Added `/analytics-shorts*` rule BEFORE `/<*>` rule
- [ ] Saved changes
- [ ] Verified rule order
- [ ] Waited for deployment (2-5 min)
- [ ] Tested `nm2tech-sas.com/analytics-shorts` - working! ✅

---

## 📝 Rule Configuration Details

**New rule:**
```json
{
  "source": "/analytics-shorts*",
  "status": "200",
  "target": "https://main.d2swtp6vppsxta.amplifyapp.com/analytics-shorts*"
}
```

**What this does:**
- Matches all requests to `/analytics-shorts*` (e.g., `/analytics-shorts`, `/analytics-shorts/dashboard`, etc.)
- Proxies them to your Analytics Shorts app
- Keeps the URL as `nm2tech-sas.com/analytics-shorts` in the browser
- Returns status 200 (rewrite, not redirect)

---

**Click "Manage redirects" and add the rule!** 🚀

Make sure the `/analytics-shorts*` rule comes BEFORE the `/<*>` rule!

