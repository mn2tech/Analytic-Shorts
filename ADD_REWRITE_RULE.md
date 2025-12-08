# ✅ Add Rewrite Rule for analytics-shorts

## ✅ Current Status

I can see you're on the "Rewrites and redirects" page in NM2_Timesheet app. There's already one rule for SPA routing (`/<*>` → `/index.html`).

Now we need to add a new rule to proxy `/analytics-shorts*` to your Analytics Shorts app.

---

## ✅ Step 1: Click "Manage redirects"

1. **Click** the purple **"Manage redirects"** button (top right of the content area)
2. **This will open** the redirect management interface

---

## ✅ Step 2: Add New Rewrite Rule

1. **Click** "Add rule" or "+ Add redirect" button
2. **Configure the rule:**
   - **Source address:** `/analytics-shorts*`
     - This matches all paths starting with `/analytics-shorts`
   - **Target address:** `https://main.d2swtp6vppsxta.amplifyapp.com/analytics-shorts*`
     - This is your Analytics Shorts app URL with the same path
   - **Type:** Select **"Rewrite"** (not Redirect)
     - Rewrite keeps the URL as `nm2tech-sas.com/analytics-shorts`
     - Redirect would change the URL in the browser
   - **Status code:** `200` (for rewrite)
   - **Country Code:** Leave empty (or select if needed)

---

## ✅ Step 3: Save Changes

1. **Click** "Save" or "Add redirect"
2. **The rule will be added** to the table
3. **Amplify will deploy** the changes (takes a few minutes)

---

## ✅ Step 4: Verify Rule Order

**Important:** Make sure the `/analytics-shorts*` rule comes **before** the `/<*>` rule.

**Why:** Amplify processes rules in order. If `/<*>` comes first, it will catch all requests including `/analytics-shorts*`.

**If needed:**
- **Reorder** the rules so `/analytics-shorts*` is first
- **Or** ensure the wildcard rule `/<*>` doesn't match `/analytics-shorts*`

---

## ✅ Step 5: Wait for Deployment

1. **Amplify will deploy** the rewrite rule changes
2. **Wait 2-5 minutes** for deployment
3. **Status** will show when ready

---

## ✅ Step 6: Test

After deployment:

1. **Visit:** `https://nm2tech-sas.com/analytics-shorts`
2. **Should show** Analytics Shorts app ✅
3. **All routes** should work correctly
4. **Navigation** should work properly

---

## 🎯 Quick Checklist

- [ ] Clicked "Manage redirects" button
- [ ] Added rule: Source `/analytics-shorts*`, Target `https://main.d2swtp6vppsxta.amplifyapp.com/analytics-shorts*`
- [ ] Selected Type: Rewrite (not Redirect)
- [ ] Saved changes
- [ ] Verified rule order (analytics-shorts before wildcard)
- [ ] Waited for deployment (2-5 min)
- [ ] Tested `nm2tech-sas.com/analytics-shorts` - working! ✅

---

## 📝 Notes

- **Rewrite** keeps the URL in the browser as `nm2tech-sas.com/analytics-shorts`
- **Redirect** would change the URL to the Analytics Shorts app URL
- **Rule order matters** - more specific rules should come first
- **Wildcard `*`** matches any characters after `/analytics-shorts`

---

## 🔍 Rule Configuration Summary

```
Source: /analytics-shorts*
Target: https://main.d2swtp6vppsxta.amplifyapp.com/analytics-shorts*
Type: Rewrite
Status: 200
```

---

**Click "Manage redirects" and add the rewrite rule!** 🚀

After adding the rule and waiting for deployment, `https://nm2tech-sas.com/analytics-shorts` will work!

