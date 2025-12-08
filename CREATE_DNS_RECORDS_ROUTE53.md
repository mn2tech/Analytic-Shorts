# ✅ Create DNS Records in Route 53

## ✅ DNS Records Needed

Amplify is showing you two DNS records to create:

1. **Verification record** (for SSL certificate validation)
2. **Subdomain record** (to point to CloudFront)

---

## ✅ Step 1: Go to Route 53

1. **Go to:** AWS Console → Route 53
2. **Select** your hosted zone: `nm2tech-sas.com`
3. **You'll create** both records here

---

## ✅ Step 2: Create Verification Record (For SSL)

**This is for SSL certificate validation:**

1. **Click:** "Create record"
2. **Configure:**
   - **Record name:** `_239749c4490cc2874c856b374a6a2c4f.analytics-shorts`
     - **Note:** Copy the exact value from Amplify (including the underscore and long string)
   - **Record type:** CNAME
   - **Value:** `_1943444ad3fe2e0b5dff16205f3e8d96.jkddzztszm.acm-validations.aws.`
     - **Note:** Copy the exact value from Amplify (including the trailing dot)
   - **TTL:** 300 (or leave default)
3. **Save** changes

**This record validates the SSL certificate.**

---

## ✅ Step 3: Create Subdomain Record (Main CNAME)

**This points the subdomain to CloudFront:**

1. **Click:** "Create record"
2. **Configure:**
   - **Record name:** `analytics-shorts`
   - **Record type:** CNAME
   - **Value:** `d31g8kmascpp78.cloudfront.net`
     - **Note:** Copy the exact value from Amplify
   - **TTL:** 300 (or leave default)
3. **Save** changes

**This is the main record that makes the subdomain work.**

---

## ✅ Step 4: Wait for DNS Propagation

1. **After creating** both records
2. **Wait** 1-5 minutes for DNS to propagate
3. **The verification record** will validate the SSL certificate
4. **The subdomain record** will make the domain accessible

---

## ✅ Step 5: Wait for SSL Certificate

1. **After DNS records are created**, Amplify will validate them
2. **Wait** 5-10 minutes for SSL certificate to be issued
3. **Status** will change to "Available" when ready

---

## ✅ Step 6: Test

After both DNS propagation and SSL are ready:

1. **Visit:** `https://analytics-shorts.nm2tech-sas.com`
2. **Should show** Analytics Shorts app ✅
3. **SSL certificate** working (green lock) ✅

---

## 🎯 Quick Checklist

- [ ] Created verification record in Route 53
- [ ] Created subdomain CNAME record in Route 53
- [ ] Used exact values from Amplify
- [ ] Saved both records
- [ ] Waited 1-5 minutes for DNS propagation
- [ ] Waited 5-10 minutes for SSL certificate
- [ ] Tested `analytics-shorts.nm2tech-sas.com` - working! ✅

---

## 📝 Important Notes

- **Use exact values** from Amplify (copy them)
- **Verification record** is temporary (for SSL validation)
- **Subdomain record** is permanent (for the domain to work)
- **Both records** are needed for SSL to work

---

**Create both DNS records in Route 53 using the exact values from Amplify!** 🔍

Once both records are created and DNS propagates, the subdomain will work!

