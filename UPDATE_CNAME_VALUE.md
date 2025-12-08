# ✅ Update CNAME Value

## ✅ Alias is OFF - Good!

The Alias toggle is now OFF (gray), which is correct for manually entering a CloudFront domain.

---

## ⚠️ Update the Value Field

**I see the Value field shows "www.example.com" (placeholder).**

**You need to replace it with the actual CloudFront domain:**

1. **Click** in the Value textarea
2. **Delete** "www.example.com"
3. **Enter:** `d31g8kmascpp78.cloudfront.net`
   - **Copy** the exact value from Amplify
   - **Make sure** there are no extra spaces or characters

---

## ✅ Step 1: Update Value

1. **Click** in the Value textarea (the large text box)
2. **Select all** (Ctrl+A) or delete the placeholder text
3. **Enter:** `d31g8kmascpp78.cloudfront.net`
4. **Double-check** the value is correct

---

## ✅ Step 2: Verify Configuration

**Before saving, verify:**
- ✅ Record name: `analytics-shorts`
- ✅ Record type: CNAME
- ✅ Alias: OFF (gray)
- ✅ Value: `d31g8kmascpp78.cloudfront.net` (not placeholder)
- ✅ TTL: 300
- ✅ Routing policy: Simple

---

## ✅ Step 3: Save the Record

1. **Scroll down** to find the "Save" button
2. **Click** "Save" or "Save changes"
3. **The record** will be updated

---

## ✅ Step 4: Wait for DNS Propagation

1. **After saving**, wait 1-5 minutes for DNS to propagate
2. **The subdomain** should become accessible

---

## ✅ Step 5: Wait for SSL Certificate

1. **The verification record** is already there
2. **Wait** 5-10 minutes for SSL certificate to be issued
3. **Check** Amplify Console for SSL status

---

## ✅ Step 6: Test

After DNS propagation and SSL are ready:

1. **Visit:** `https://analytics-shorts.nm2tech-sas.com`
2. **Should show** Analytics Shorts app ✅
3. **SSL certificate** working (green lock) ✅

---

## 🎯 Quick Checklist

- [x] Record name: `analytics-shorts` ✅
- [x] Record type: CNAME ✅
- [x] Alias: OFF ✅
- [ ] Value: `d31g8kmascpp78.cloudfront.net` (not placeholder)
- [ ] TTL: 300 ✅
- [ ] Saved the record
- [ ] Waited 1-5 minutes for DNS propagation
- [ ] Waited 5-10 minutes for SSL certificate
- [ ] Tested `analytics-shorts.nm2tech-sas.com` - working! ✅

---

**Update the Value field with the CloudFront domain and save!** 🔍

Replace "www.example.com" with `d31g8kmascpp78.cloudfront.net`.

