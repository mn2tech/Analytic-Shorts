# 🔍 Verify and Fix Rewrite Rule

## ❌ Still Getting 404

The 404 error means the rewrite rule in NM2_Timesheet app either:
1. **Wasn't added yet**
2. **Not configured correctly**
3. **Not deployed yet**

---

## ✅ Step 1: Check if Rewrite Rule Exists

1. **Go to:** Amplify Console → NM2_Timesheet app
2. **Go to:** Hosting → Rewrites and redirects
3. **Click:** "Manage redirects"
4. **Check** the JSON configuration

**What to look for:**
- Is there a rule with `"source": "/analytics-shorts*"` or `"/analytics-shorts/<*>"`?
- Is it **before** the `/<*>` rule?
- What's the target URL?

---

## ✅ Step 2: Add/Update Rewrite Rule

**Since we removed the base path, the rewrite rule should strip the prefix:**

**In the JSON editor, you should have:**

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
- The `/analytics-shorts/<*>` rule **must come first**
- The `<*>` in the target captures everything after `/analytics-shorts`
- This strips the `/analytics-shorts` prefix when proxying

---

## ✅ Step 3: Alternative Rewrite Syntax

**If the above doesn't work, try this syntax:**

```json
[
  {
    "source": "/analytics-shorts*",
    "status": "200",
    "target": "https://main.d2swtp6vppsxta.amplifyapp.com"
  },
  {
    "source": "/<*>",
    "status": "404-200",
    "target": "/index.html"
  }
]
```

**Note:** This might not strip the path correctly. You may need to test different syntaxes.

---

## ✅ Step 4: Save and Wait

1. **Click** "Save" button
2. **Wait** 2-5 minutes for deployment
3. **Check** deployment status

---

## ✅ Step 5: Test

After deployment:

1. **Visit:** `https://nm2tech-sas.com/analytics-shorts`
2. **Should show** Analytics Shorts app ✅
3. **All routes** should work correctly

---

## 🔍 Troubleshooting

### Issue 1: Rule Not Working
**Try different source patterns:**
- `/analytics-shorts/<*>`
- `/analytics-shorts*`
- `/analytics-shorts/*`

### Issue 2: Path Not Stripped
**The target might need to be:**
- `https://main.d2swtp6vppsxta.amplifyapp.com/<*>` (strips prefix)
- `https://main.d2swtp6vppsxta.amplifyapp.com` (might keep path)

### Issue 3: Still 404
**Check:**
- Is the rule deployed? (Wait 2-5 min)
- Is Analytics Shorts app rebuilt? (Check build status)
- Is the rule order correct? (`/analytics-shorts*` before `/<*>`)

---

## 🎯 Quick Checklist

- [ ] Went to NM2_Timesheet app → Rewrites and redirects
- [ ] Clicked "Manage redirects"
- [ ] Added/updated `/analytics-shorts*` rule
- [ ] Rule comes before `/<*>` rule
- [ ] Saved changes
- [ ] Waited for deployment (2-5 min)
- [ ] Tested `nm2tech-sas.com/analytics-shorts` - working! ✅

---

**Check if the rewrite rule exists and is configured correctly!** 🔍

If it doesn't exist, add it. If it exists, verify the configuration and wait for deployment.

