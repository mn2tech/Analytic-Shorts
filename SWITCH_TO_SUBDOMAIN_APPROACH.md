# ✅ Switch to Subdomain Approach (Recommended)

## ❌ Problem with Path-Based Routing

Path-based routing (`nm2tech-sas.com/analytics-shorts`) is **too complex** because:
- Every asset needs a rewrite rule
- New assets require new rules
- Hard to maintain
- Many 404 errors

---

## ✅ Solution: Use Subdomain Instead

**Use `https://analytics-shorts.nm2tech-sas.com` instead!**

The subdomain is already configured. We just need to make it point to the Analytics Shorts app.

---

## ✅ Step 1: Remove Subdomain from NM2_Timesheet App

1. **Go to:** Amplify Console → NM2_Timesheet app
2. **Go to:** Hosting → Custom domains
3. **Find** `analytics-shorts.nm2tech-sas.com` in the list
4. **Click** on it or use Actions → Remove
5. **Confirm** removal

**This won't break anything** - we'll add it to Analytics Shorts app next.

---

## ✅ Step 2: Add Subdomain to Analytics Shorts App

1. **Go to:** Amplify Console → Analytics Shorts app
2. **Go to:** Hosting → Custom domains
3. **Click:** "Add domain"
4. **Enter:** `nm2tech-sas.com` (root domain)
   - **If it works:** Proceed to Step 3
   - **If error:** "Domain already in use" → Try adding subdomain directly

### If Root Domain Fails:

**Try adding the subdomain directly:**
1. **Click:** "Add domain"
2. **Enter:** `analytics-shorts.nm2tech-sas.com` directly
3. **Amplify might allow** adding subdomains even if root is in another app

---

## ✅ Step 3: Add Subdomain

**If you successfully added the root domain:**

1. **Click** on `nm2tech-sas.com` in the domain list
2. **Go to** subdomains section
3. **Click** "+ Add new"
4. **Enter:** `analytics-shorts`
5. **Select branch:** `main`
6. **Save** changes

**If you added the subdomain directly:**
- Select branch: `main`
- Save changes

---

## ✅ Step 4: Wait for SSL

1. **Amplify will automatically provision** SSL certificate
2. **Wait** 5-10 minutes
3. **Status** will show "Available" when ready

---

## ✅ Step 5: Test

After SSL is ready:

1. **Visit:** `https://analytics-shorts.nm2tech-sas.com`
2. **Should show** Analytics Shorts app ✅
3. **All assets** load correctly ✅
4. **No rewrite rules needed!** ✅

---

## ✅ Step 6: Update Route 53 (If Needed)

**If Route 53 CNAME needs updating:**

1. **Go to:** Route 53 Console
2. **Find** CNAME for `analytics-shorts.nm2tech-sas.com`
3. **Update** value to match what Amplify shows
4. **Or** Amplify might auto-configure it

---

## 🎯 Benefits of Subdomain Approach

- ✅ **No rewrite rules needed** - Works automatically
- ✅ **All assets load correctly** - No proxying required
- ✅ **Simpler configuration** - Just add subdomain
- ✅ **Easier to maintain** - Standard Amplify setup
- ✅ **SSL automatic** - Amplify provisions it

---

## 🎯 Quick Checklist

- [ ] Removed subdomain from NM2_Timesheet app
- [ ] Added domain/subdomain to Analytics Shorts app
- [ ] Selected `main` branch
- [ ] Saved changes
- [ ] Waited for SSL (5-10 min)
- [ ] Updated Route 53 if needed
- [ ] Tested `analytics-shorts.nm2tech-sas.com` - working! ✅

---

## 📝 Note

**You can remove the path-based rewrite rules** from NM2_Timesheet app - they're not needed with the subdomain approach.

---

**Switch to the subdomain approach - it's much simpler!** 🚀

Remove the subdomain from NM2_Timesheet app and add it to Analytics Shorts app. This will work much better than path-based routing.

