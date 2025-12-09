# 🔍 Custom Domain Troubleshooting

## ✅ DNS is Resolving Correctly!

DNS is working:
- ✅ `analytics-shorts.nm2tech-sas.com` → `d31g8kmascpp78.cloudfront.net`

**The issue is likely:**
1. CloudFront distribution not fully deployed
2. SSL certificate not ready
3. Domain not configured in CloudFront
4. Browser cache

---

## ✅ Step 1: Check Amplify Domain Status

**Most important - check the domain status:**

1. **Go to:** AWS Amplify Console
2. **Select:** Analytics Shorts app
3. **Go to:** Custom domains
4. **Click** on `analytics-shorts.nm2tech-sas.com`
5. **Check status:**
   - **"Available"** → Domain is ready ✅
   - **"Provisioning"** → Wait 10-15 more minutes
   - **"Failed"** → Check error message

**What status does it show?** (This is the key!)

---

## ✅ Step 2: Test CloudFront URL Directly

**Test if CloudFront is serving your app:**

1. **Try accessing:** `https://d31g8kmascpp78.cloudfront.net`
2. **Does it work?**
   - **If yes:** CloudFront is working, issue is domain configuration
   - **If no:** CloudFront might not be deployed yet

---

## ✅ Step 3: Add Custom Domain to CORS

**Important:** When the domain works, you'll need to add it to CORS!

**On EC2, update `.env`:**

```bash
cd /home/raj/Analytic-Shorts/backend
nano .env
```

**Update `ALLOWED_ORIGINS`:**

```env
ALLOWED_ORIGINS=https://main.d2swtp6vppsxta.amplifyapp.com,https://analytics-shorts.nm2tech-sas.com
```

**Save and restart:**

```bash
pm2 restart analytics-api --update-env
```

---

## ✅ Step 4: Clear All Caches

**Clear everything:**

1. **Flush DNS cache:**
   ```bash
   ipconfig /flushdns
   ```

2. **Clear browser cache:**
   - Press `Ctrl+Shift+Delete`
   - Select "Cached images and files"
   - Time range: "All time"
   - Clear data

3. **Test in incognito mode:**
   - Press `Ctrl+Shift+N` (Chrome)
   - Visit: `https://analytics-shorts.nm2tech-sas.com`

---

## 🔍 Most Likely Issue

**The domain status in Amplify is probably still "Provisioning".**

**Solution:**
1. Check Amplify domain status
2. If "Provisioning", wait 10-15 minutes
3. Once "Available", test the domain
4. Add custom domain to CORS

---

**Check Amplify domain status first - that will tell us what's wrong!** 🔍

DNS is working, so the issue is likely CloudFront still provisioning or SSL not ready.

