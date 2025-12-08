# 🔧 Fix: Domain Already in Use - Add Subdomain Directly

## ❌ Error

```
One or more domains requested are already associated with another Amplify app: www.nm2tech-sas.com, nm2tech-sas.com
```

**This means:** The root domain is locked to NM2_Timesheet app, so we can't add it to Analytics Shorts app.

---

## ✅ Solution Options

### Option 1: Try Adding Subdomain Directly (Recommended)

**Try adding just the subdomain without the root domain:**

1. **In Analytics Shorts app**, go to: Custom domains
2. **Click:** "Add domain"
3. **Try entering:** `analytics-shorts.nm2tech-sas.com` (full subdomain)
4. **Amplify might allow** adding subdomains even if root is in another app
5. **If it works:**
   - Select branch: `main`
   - Save changes
   - Wait for SSL

**If this works, you're done!** ✅

---

### Option 2: Use Path-Based Routing (Fix It Properly)

**If Option 1 doesn't work, let's fix path-based routing properly:**

The issue is that assets need to be proxied. Instead of adding rules for each asset, we can use a catch-all approach.

**Update rewrite rule in NM2_Timesheet app:**

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
    "source": "/assets/<*>",
    "status": "200",
    "target": "https://main.d2swtp6vppsxta.amplifyapp.com/assets/<*>"
  },
  {
    "source": "/manifest.json",
    "status": "200",
    "target": "https://main.d2swtp6vppsxta.amplifyapp.com/manifest.json"
  },
  {
    "source": "/registerSW.js",
    "status": "200",
    "target": "https://main.d2swtp6vppsxta.amplifyapp.com/registerSW.js"
  },
  {
    "source": "/sw.js",
    "status": "200",
    "target": "https://main.d2swtp6vppsxta.amplifyapp.com/sw.js"
  },
  {
    "source": "/<*>",
    "status": "404-200",
    "target": "/index.html"
  }
]
```

**Then check Network tab for any other 404s and add rules for those too.**

---

### Option 3: Contact AWS Support

**If neither option works:**

1. **Contact** AWS Support
2. **Ask** to move `analytics-shorts.nm2tech-sas.com` subdomain to Analytics Shorts app
3. **Or** ask for guidance on the best approach

---

## 🎯 Recommended: Try Option 1 First

**Try adding the subdomain directly:**

1. **Go to:** Analytics Shorts app → Custom domains
2. **Click:** "Add domain"
3. **Enter:** `analytics-shorts.nm2tech-sas.com` (full subdomain)
4. **See if it works**

**If it works:** You're done! ✅  
**If it doesn't:** Use Option 2 (path-based routing with all asset rules)

---

## 📝 Why This Happens

- **Root domain** `nm2tech-sas.com` is locked to NM2_Timesheet app
- **Amplify doesn't allow** adding root domain to multiple apps
- **But subdomains** might be addable directly

---

**Try adding the subdomain directly first!** 🚀

If that doesn't work, we'll fix the path-based routing with all the necessary asset rules.

