# ✅ Save CNAME Record

## ✅ Record Configuration Looks Good!

I can see the CNAME record is configured:
- **Record name:** `analytics-shorts` ✅
- **Record type:** CNAME ✅
- **Value:** `d31g8kmascpp78.cloudfront.net` ✅
- **TTL:** 300 ✅

---

## ⚠️ Important: Turn Off Alias

**I see the "Alias" toggle is ON (blue).**

**For CloudFront domain names entered manually, you should turn Alias OFF:**

1. **Click** the "Alias" toggle to turn it OFF (gray)
2. **This is important** - Alias is for selecting AWS resources from dropdown
3. **Since you're entering** the CloudFront domain manually, use regular CNAME (not Alias)

---

## ✅ Step 1: Turn Off Alias

1. **Click** the "Alias" toggle
2. **It should turn gray** (OFF)
3. **The record** will be a regular CNAME, not an Alias

---

## ✅ Step 2: Save the Record

1. **Scroll down** to find the "Save" button
2. **Click** "Save" or "Save changes"
3. **The record** will be updated

---

## ✅ Step 3: Wait for DNS Propagation

1. **After saving**, wait 1-5 minutes for DNS to propagate
2. **The subdomain** should become accessible

---

## ✅ Step 4: Wait for SSL Certificate

1. **The verification record** is already there
2. **Wait** 5-10 minutes for SSL certificate to be issued
3. **Check** Amplify Console for SSL status

---

## ✅ Step 5: Test

After DNS propagation and SSL are ready:

1. **Visit:** `https://analytics-shorts.nm2tech-sas.com`
2. **Should show** Analytics Shorts app ✅
3. **SSL certificate** working (green lock) ✅

---

## 🎯 Quick Checklist

- [x] Record name: `analytics-shorts` ✅
- [x] Record type: CNAME ✅
- [x] Value: `d31g8kmascpp78.cloudfront.net` ✅
- [ ] Turned OFF Alias toggle
- [ ] Saved the record
- [ ] Waited 1-5 minutes for DNS propagation
- [ ] Waited 5-10 minutes for SSL certificate
- [ ] Tested `analytics-shorts.nm2tech-sas.com` - working! ✅

---

## 📝 Notes

- **Alias ON:** For selecting AWS resources from dropdown
- **Alias OFF:** For entering domain names manually (like CloudFront)
- **Since you're entering** the CloudFront domain, use Alias OFF

---

**Turn OFF the Alias toggle and save the record!** 🔍

The configuration looks correct, just make sure Alias is OFF since you're entering the CloudFront domain manually.

