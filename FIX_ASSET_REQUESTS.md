# 🔧 Fix Asset 404 Errors

## ❌ Problem

Assets are being requested from `nm2tech-sas.com/assets/...` but returning 404. The rewrite rule is working for the HTML, but asset requests aren't being proxied to the Analytics Shorts app.

**The issue:**
- HTML loads from Analytics Shorts app ✅
- But assets (`/assets/*`, `/manifest.json`, `/registerSW.js`) are requested from `nm2tech-sas.com` ❌
- These need to also be proxied to Analytics Shorts app

---

## ✅ Solution: Add Asset Rewrite Rules

**Update the rewrite rule to also handle asset requests:**

### Step 1: Go to Rewrites and Redirects

1. **Go to:** NM2_Timesheet app → Rewrites and redirects → Manage redirects
2. **Update** the JSON configuration

### Step 2: Add Asset Rewrite Rules

**Add rules to proxy asset requests to Analytics Shorts app:**

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
    "source": "/<*>",
    "status": "404-200",
    "target": "/index.html"
  }
]
```

**This will:**
- Proxy `/analytics-shorts*` requests to Analytics Shorts app
- Proxy `/assets/*` requests to Analytics Shorts app
- Proxy `/manifest.json` to Analytics Shorts app
- Proxy `/registerSW.js` to Analytics Shorts app
- Handle all other requests for SPA routing

---

## ✅ Step 3: Save and Deploy

1. **Click** "Save" button
2. **Wait** 5-10 minutes for deployment
3. **Clear** browser cache
4. **Test** again

---

## 🔍 Alternative: Use Wildcard for All Assets

**If the above doesn't work, try a more general approach:**

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
    "source": "/assets*",
    "status": "200",
    "target": "https://main.d2swtp6vppsxta.amplifyapp.com/assets*"
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
    "source": "/<*>",
    "status": "404-200",
    "target": "/index.html"
  }
]
```

---

## 🎯 Quick Checklist

- [ ] Added `/assets/*` rewrite rule
- [ ] Added `/manifest.json` rewrite rule
- [ ] Added `/registerSW.js` rewrite rule
- [ ] Rules come before `/<*>` rule
- [ ] Saved changes
- [ ] Waited 5-10 minutes for deployment
- [ ] Cleared browser cache
- [ ] Tested - assets loading! ✅

---

**Add rewrite rules for assets, manifest, and service worker!** 🚀

The assets need to be proxied to the Analytics Shorts app just like the HTML.

