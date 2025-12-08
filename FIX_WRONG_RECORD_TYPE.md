# 🔧 Fix Wrong Record Type - Change A to CNAME

## ❌ Problem

I can see in Route 53 that `analytics-shorts.nm2tech-sas.com` has an **A record**, but it should be a **CNAME record** pointing to the CloudFront distribution.

**Current (Wrong):**
- Record name: `analytics-shorts.nm2tech-sas.com`
- Type: `A` ❌
- Should be: `CNAME` ✅

---

## ✅ Solution: Delete A Record and Create CNAME

**You can't change a record type, so you need to delete the A record and create a CNAME record.**

### Step 1: Delete the A Record

1. **In Route 53**, find the record: `analytics-shorts.nm2tech-sas.com` (Type: A)
2. **Check** the checkbox next to it
3. **Click** "Delete record" button (top of the page)
4. **Confirm** deletion

---

### Step 2: Create CNAME Record

1. **Click:** "Create record" button (orange button)
2. **Configure:**
   - **Record name:** `analytics-shorts`
   - **Record type:** Select **CNAME** (not A)
   - **Value:** `d31g8kmascpp78.cloudfront.net`
     - **Copy** the exact value from Amplify
   - **TTL:** 300 (or leave default)
   - **Routing policy:** Simple
3. **Save** changes

---

### Step 3: Wait for DNS Propagation

1. **After creating** the CNAME record
2. **Wait** 1-5 minutes for DNS to propagate
3. **The subdomain** should become accessible

---

### Step 4: Wait for SSL Certificate

1. **The verification record** is already there
2. **Wait** 5-10 minutes for SSL certificate to be issued
3. **Check** Amplify Console for SSL status

---

### Step 5: Test

After DNS propagation and SSL are ready:

1. **Visit:** `https://analytics-shorts.nm2tech-sas.com`
2. **Should show** Analytics Shorts app ✅
3. **SSL certificate** working (green lock) ✅

---

## 🎯 Quick Checklist

- [ ] Found A record for `analytics-shorts.nm2tech-sas.com`
- [ ] Deleted the A record
- [ ] Created new CNAME record
- [ ] Record name: `analytics-shorts`
- [ ] Record type: **CNAME** (not A)
- [ ] Value: `d31g8kmascpp78.cloudfront.net`
- [ ] Saved changes
- [ ] Waited 1-5 minutes for DNS propagation
- [ ] Tested `analytics-shorts.nm2tech-sas.com` - working! ✅

---

## 📝 Important Notes

- **A records** are for IP addresses
- **CNAME records** are for domain names (like CloudFront)
- **You can't change** record type - must delete and recreate
- **Make sure** to select CNAME, not A, when creating

---

**Delete the A record and create a CNAME record instead!** 🔍

The A record is wrong - it needs to be a CNAME pointing to the CloudFront distribution.

