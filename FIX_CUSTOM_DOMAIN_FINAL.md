# 🔧 Fix Custom Domain - Final Troubleshooting

## ❌ Custom Domain Still Not Working

The custom domain `analytics-shorts.nm2tech-sas.com` is still not working. Let's troubleshoot systematically.

---

## ✅ Step 1: Verify DNS is Resolving

**Test DNS resolution:**

```bash
nslookup analytics-shorts.nm2tech-sas.com
nslookup -type=CNAME analytics-shorts.nm2tech-sas.com
```

**Should show:**
- Domain resolves to CloudFront: `d31g8kmascpp78.cloudfront.net`

**If DNS doesn't resolve:**
- Check Route 53 record exists
- Verify CNAME value is correct
- Wait for DNS propagation (can take 15-30 minutes)

---

## ✅ Step 2: Check Amplify Domain Status

**Verify domain status in Amplify:**

1. **Go to:** AWS Amplify Console
2. **Select:** Analytics Shorts app
3. **Go to:** Custom domains
4. **Click** on `analytics-shorts.nm2tech-sas.com`
5. **Check status:**
   - **"Available"** → Domain is ready ✅
   - **"Provisioning"** → Wait 5-10 more minutes
   - **"Failed"** → Check error message

**If status is "Provisioning":**
- Amplify is still setting up CloudFront
- Wait 10-15 minutes
- Check status again

---

## ✅ Step 3: Test CloudFront URL Directly

**Test if CloudFront is serving your app:**

1. **Try accessing:** `https://d31g8kmascpp78.cloudfront.net`
2. **Does it work?**
   - **If yes:** CloudFront is working, issue is DNS/domain
   - **If no:** CloudFront might not be deployed yet

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

3. **Close all browser windows**

4. **Restart browser**

5. **Test in incognito mode:**
   - Press `Ctrl+Shift+N` (Chrome)
   - Visit: `https://analytics-shorts.nm2tech-sas.com`

---

## ✅ Step 5: Check Route 53 Record

**Verify DNS record is correct:**

1. **Go to:** Route 53 Console
2. **Select** hosted zone: `nm2tech-sas.com`
3. **Find** CNAME record for `analytics-shorts`
4. **Verify:**
   - **Name:** `analytics-shorts`
   - **Type:** CNAME
   - **Value:** `d31g8kmascpp78.cloudfront.net` (or correct CloudFront domain)
   - **Status:** Active

**If record is wrong:**
- Update it with correct CloudFront domain
- Wait 2-5 minutes for DNS propagation

---

## ✅ Step 6: Add Custom Domain to CORS

**Important:** Add the custom domain to backend CORS!

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

## ✅ Step 7: Wait for Full Deployment

**If everything looks correct but still not working:**

1. **Wait** 15-30 minutes for:
   - DNS global propagation
   - CloudFront full deployment
   - SSL certificate activation

2. **Try from different network:**
   - Use mobile data (hotspot)
   - Or try from different computer

3. **Check again**

---

## 🔍 Most Likely Issues

### Issue 1: CloudFront Still Provisioning
**Symptom:** Domain configured but not working
**Solution:** Wait 10-15 minutes for CloudFront to fully deploy

### Issue 2: DNS Not Fully Propagated
**Symptom:** Works locally but not globally
**Solution:** Wait 15-30 minutes for global DNS propagation

### Issue 3: Browser Cache
**Symptom:** Old error still showing
**Solution:** Clear browser cache and DNS cache, test in incognito

### Issue 4: CORS Not Configured for Custom Domain
**Symptom:** Domain loads but API calls fail
**Solution:** Add custom domain to `ALLOWED_ORIGINS` in backend `.env`

---

## 📝 Quick Checklist

- [ ] DNS resolves correctly?
- [ ] Amplify domain status is "Available"?
- [ ] CloudFront URL works directly?
- [ ] Cleared browser cache?
- [ ] Cleared DNS cache?
- [ ] Tested in incognito mode?
- [ ] Route 53 record is correct?
- [ ] Custom domain added to `ALLOWED_ORIGINS`?
- [ ] PM2 restarted after updating CORS?
- [ ] Waited 15-30 minutes for propagation?

---

**Check Amplify domain status and add custom domain to CORS!** 🔍

The domain might be ready, but we need to verify status and add it to CORS.

