# ✅ Add Subdomain to Analytics Shorts App

## ✅ Subdomain Removed from NM2_Timesheet

Good! You've removed `analytics-shorts.nm2tech-sas.com` from NM2_Timesheet app. Now let's add it to Analytics Shorts app.

---

## ✅ Step 1: Go to Analytics Shorts App

1. **Go to:** Amplify Console → All apps
2. **Click** on **Analytics Shorts** app (or "Analytic-Shorts")
3. **This is the app** where we'll add the subdomain

---

## ✅ Step 2: Go to Custom Domains

1. **In Analytics Shorts app**, go to: **Hosting** → **Custom domains**
2. **You should see** the "Custom domains" page

---

## ✅ Step 3: Add Domain

1. **Click** the purple **"Add domain"** button (top right)
2. **Enter:** `nm2tech-sas.com` (root domain)
   - **If it works:** Proceed to Step 4
   - **If error:** "Domain already in use" → Try Step 3B

### Step 3B: Add Subdomain Directly (If Root Domain Fails)

**If you can't add the root domain:**

1. **Try adding** `analytics-shorts.nm2tech-sas.com` directly
2. **Amplify might allow** adding subdomains even if root is in another app
3. **If it works:** Select branch `main` and save

---

## ✅ Step 4: Add Subdomain

**If you successfully added the root domain:**

1. **Click** on `nm2tech-sas.com` in the domain list
2. **Go to** subdomains section
3. **Click** "+ Add new"
4. **Enter:** `analytics-shorts`
5. **Select branch:** `main` (your Analytics Shorts branch)
6. **Save** changes

**If you added the subdomain directly:**
- Select branch: `main`
- Save changes

---

## ✅ Step 5: Wait for SSL

1. **Amplify will automatically provision** SSL certificate
2. **Wait** 5-10 minutes
3. **Status** will show "Available" when ready

---

## ✅ Step 6: Update Route 53 (If Needed)

**Amplify might show DNS instructions:**

1. **Check** if Amplify shows any DNS records to add
2. **If it shows** a CNAME record:
   - **Go to:** Route 53 Console
   - **Update** the existing CNAME for `analytics-shorts.nm2tech-sas.com`
   - **Use** the value Amplify shows
3. **Or** Amplify might auto-configure it

---

## ✅ Step 7: Test

After SSL is ready:

1. **Visit:** `https://analytics-shorts.nm2tech-sas.com`
2. **Should show** Analytics Shorts app ✅
3. **All assets** load correctly ✅
4. **No rewrite rules needed!** ✅

---

## 🎯 Quick Checklist

- [x] Removed subdomain from NM2_Timesheet app ✅
- [ ] Went to Analytics Shorts app
- [ ] Went to Custom domains
- [ ] Added domain/subdomain
- [ ] Selected `main` branch
- [ ] Saved changes
- [ ] Waited for SSL (5-10 min)
- [ ] Updated Route 53 if needed
- [ ] Tested `analytics-shorts.nm2tech-sas.com` - working! ✅

---

## 📝 Notes

- **Subdomain approach** is much simpler than path-based routing
- **No rewrite rules needed** - Works automatically
- **All assets load correctly** - No proxying required
- **SSL automatic** - Amplify provisions it

---

**Go to Analytics Shorts app and add the subdomain!** 🚀

This will work much better than path-based routing.

