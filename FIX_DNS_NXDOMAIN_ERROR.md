# 🔧 Fix DNS NXDOMAIN Error

## ❌ Error

```
DNS_PROBE_FINISHED_NXDOMAIN
```

**This means:** The DNS record for `analytics-shorts.nm2tech-sas.com` doesn't exist or isn't configured in Route 53.

---

## ✅ Solution: Create/Update DNS Record in Route 53

### Step 1: Check Amplify for DNS Instructions

1. **Go to:** Amplify Console → Analytics Shorts app
2. **Go to:** Hosting → Custom domains
3. **Click** on `analytics-shorts.nm2tech-sas.com`
4. **Look for** DNS instructions or CNAME value
5. **Amplify should show** what DNS record to create

**If Amplify shows DNS instructions:**
- Follow them exactly
- Create the CNAME record in Route 53

---

### Step 2: Go to Route 53

1. **Go to:** AWS Console → Route 53
2. **Select** your hosted zone: `nm2tech-sas.com`
3. **Look for** existing CNAME record for `analytics-shorts.nm2tech-sas.com`

---

### Step 3: Create/Update CNAME Record

**If record doesn't exist:**

1. **Click:** "Create record"
2. **Configure:**
   - **Record name:** `analytics-shorts` (or `analytics-shorts.nm2tech-sas.com`)
   - **Record type:** CNAME
   - **Value:** Check Amplify for the correct value
     - **Usually:** Something like `d1234567890abc.cloudfront.net`
     - **Or:** The Amplify app URL
   - **TTL:** 300 (or leave default)
3. **Save** changes

**If record exists:**

1. **Click** on the existing record
2. **Edit** it
3. **Update** the value to match what Amplify shows
4. **Save** changes

---

### Step 4: Get DNS Value from Amplify

**To find the correct DNS value:**

1. **In Amplify Console**, go to: Analytics Shorts app → Custom domains
2. **Click** on `analytics-shorts.nm2tech-sas.com`
3. **Look for:**
   - "DNS record" or "CNAME record" section
   - The value to use in Route 53
   - Or check the domain details

**The value is usually:**
- A CloudFront distribution domain
- Or the Amplify app URL
- Amplify will show you exactly what to use

---

### Step 5: Wait for DNS Propagation

1. **After creating/updating** the DNS record
2. **Wait** 1-5 minutes for DNS to propagate
3. **Test:** `https://analytics-shorts.nm2tech-sas.com`

---

## 🔍 Alternative: Check if Amplify Auto-Configured

**Sometimes Amplify auto-configures DNS if you use Route 53:**

1. **Check** Route 53 Console
2. **Look for** any auto-created records
3. **Verify** they're correct

---

## 🎯 Quick Checklist

- [ ] Checked Amplify for DNS instructions
- [ ] Went to Route 53 Console
- [ ] Found/created CNAME record for `analytics-shorts.nm2tech-sas.com`
- [ ] Updated value to match Amplify's instructions
- [ ] Saved changes
- [ ] Waited 1-5 minutes for DNS propagation
- [ ] Tested `analytics-shorts.nm2tech-sas.com` - working! ✅

---

## 📝 Notes

- **DNS propagation** takes 1-5 minutes typically
- **The CNAME value** must match what Amplify shows
- **If using Route 53**, Amplify might auto-configure it
- **Check Amplify** for the exact DNS value to use

---

**Check Amplify for DNS instructions and create/update the CNAME record in Route 53!** 🔍

The DNS record is missing - that's why you're getting the NXDOMAIN error.

