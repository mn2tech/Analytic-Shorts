# 🔧 Fix Rewrite Rule - It's Routing to Wrong App

## ❌ Problem

The rewrite rule is routing `/analytics-shorts` to NM2_Timesheet app instead of Analytics Shorts app.

**This means the rewrite rule isn't working correctly.**

---

## ✅ Solution: Fix Rewrite Rule Syntax

**Amplify's rewrite syntax might be different. Let's try a different approach:**

### Option 1: Use Redirect Instead of Rewrite

**Try using a redirect that preserves the path:**

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

**Note:** This keeps the `/analytics-shorts` prefix in the target, so the Analytics Shorts app needs to handle it.

---

### Option 2: Use Full Path Rewrite (Recommended)

**Since we removed the base path, try this:**

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

**This handles both:**
- `/analytics-shorts` → Analytics Shorts app root
- `/analytics-shorts/*` → Analytics Shorts app with path

---

### Option 3: Check Rule Order

**Make sure the `/analytics-shorts*` rule comes BEFORE `/<*>`:**

The order in the JSON array matters! The first matching rule wins.

**Correct order:**
1. `/analytics-shorts*` (more specific) - FIRST
2. `/<*>` (wildcard) - LAST

---

## ✅ Step 1: Update Rewrite Rule

1. **Go to:** NM2_Timesheet app → Rewrites and redirects → Manage redirects
2. **Update** the JSON to Option 2 (above)
3. **Make sure** `/analytics-shorts` rules come BEFORE `/<*>`
4. **Save** changes

---

## ✅ Step 2: Verify Rule Order

**After saving, verify the order in the table:**

1. **Go back to:** Rewrites and redirects page (not editor)
2. **Check** the table order:
   - `/analytics-shorts/<*>` should be first
   - `/analytics-shorts` should be second (if added)
   - `/<*>` should be last

---

## ✅ Step 3: Wait and Test

1. **Wait** 5-10 minutes for deployment
2. **Clear** browser cache
3. **Test:** `https://nm2tech-sas.com/analytics-shorts`
4. **Should show** Analytics Shorts app, not NM2_Timesheet ✅

---

## 🔍 Why It's Going to NM2_Timesheet

**Possible reasons:**
1. **Rule not matching** - Syntax might be wrong
2. **Rule order wrong** - `/<*>` catching it first
3. **Rule not deployed** - Changes not propagated yet
4. **Target URL wrong** - Pointing to wrong app

---

## 🎯 Quick Checklist

- [ ] Updated rewrite rule syntax
- [ ] Added both `/analytics-shorts` and `/analytics-shorts/<*>` rules
- [ ] Rules come BEFORE `/<*>` rule
- [ ] Saved changes
- [ ] Verified rule order in table
- [ ] Waited 5-10 minutes
- [ ] Cleared browser cache
- [ ] Tested - shows Analytics Shorts app! ✅

---

**Update the rewrite rule with the correct syntax and order!** 🚀

The issue is likely the rule syntax or order. Try Option 2 above.

