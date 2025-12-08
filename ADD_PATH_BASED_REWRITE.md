# ✅ Add Path-Based Rewrite Rule

## ✅ Current Status

I can see that `analytics-shorts.nm2tech-sas.com` is already configured as a subdomain pointing to the `mobile-app` branch. This is why you're seeing the timesheet app.

**For path-based routing** (`nm2tech-sas.com/analytics-shorts`), we need to add a **rewrite rule**, not use the subdomain.

---

## ✅ Step 1: Go to Rewrites and Redirects

1. **In the left sidebar**, click **"Rewrites and redirects"** (under Hosting)
2. **This is where** you'll add the path-based rewrite rule

---

## ✅ Step 2: Add Rewrite Rule

1. **Click** the purple **"Manage redirects"** button
2. **In the JSON editor**, you'll see the current configuration
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

**What this does:**
- Matches requests to `/analytics-shorts*`
- Strips the `/analytics-shorts` prefix (using `<*>`)
- Proxies to Analytics Shorts app at root
- Keeps the URL as `nm2tech-sas.com/analytics-shorts` in the browser

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

## 📝 Note About Subdomain

**The subdomain `analytics-shorts.nm2tech-sas.com` is already configured**, but it's pointing to the `mobile-app` branch (timesheet app).

**You have two options:**

### Option A: Keep Subdomain (Remove from Domain Management)
- **Remove** `analytics-shorts.nm2tech-sas.com` from Custom domains
- **Use** path-based routing only (`nm2tech-sas.com/analytics-shorts`)

### Option B: Update Subdomain to Point to Analytics Shorts
- **Keep** the subdomain
- **Update** it to point to Analytics Shorts app (if possible)
- **Use** both subdomain and path-based routing

**For now, let's use path-based routing** (Option A is simpler).

---

## 🎯 Quick Checklist

- [x] In NM2_Timesheet app (mobile-app branch) ✅
- [x] On Custom domains page ✅
- [ ] Clicked "Rewrites and redirects" in sidebar
- [ ] Clicked "Manage redirects"
- [ ] Added `/analytics-shorts/<*>` rule before `/<*>` rule
- [ ] Saved changes
- [ ] Waited for deployment (2-5 min)
- [ ] Tested `nm2tech-sas.com/analytics-shorts` - working! ✅

---

**Go to "Rewrites and redirects" and add the path-based rewrite rule!** 🚀

This will make `nm2tech-sas.com/analytics-shorts` work without needing the subdomain.

