# 🔍 Identify Correct NM2_Timesheet App

## ❓ Two NM2_Timesheet Apps Found

You have two NM2_Timesheet apps:
1. **Prod branch: `main`**
2. **Prod branch: `mobile-app`**

We need to find which one has the root domain `nm2tech-sas.com` configured.

---

## ✅ Step 1: Check Domain Configuration

**For each app, check which one has the domain:**

### Check App 1 (main branch):
1. **Click** on the first "NM2_Timesheet" app (main branch)
2. **Go to:** Hosting → Custom domains
3. **Check** if `nm2tech-sas.com` is listed
4. **Note** which app it is

### Check App 2 (mobile-app branch):
1. **Click** on the second "NM2_Timesheet" app (mobile-app branch)
2. **Go to:** Hosting → Custom domains
3. **Check** if `nm2tech-sas.com` is listed
4. **Note** which app it is

---

## ✅ Step 2: Identify the Correct App

**The correct app is the one that has:**
- ✅ `nm2tech-sas.com` configured in Custom domains
- ✅ Subdomains like `www.nm2tech-sas.com` listed
- ✅ This is the app that serves `https://nm2tech-sas.com/nm2timesheet`

**This is the app where you need to add the rewrite rule!**

---

## ✅ Step 3: Add Rewrite Rule to Correct App

**Once you identify the correct app:**

1. **Go to:** That app → Hosting → Rewrites and redirects
2. **Click:** "Manage redirects"
3. **Add** the rewrite rule:
   ```json
   [
     {
       "source": "/analytics-shorts/<*>",
       "status": "200",
       "target": "https://main.d2swtp6vppsxta.amplifyapp.com/<*>"
     },
     {
       "source": "/<*>",
       "status": "404-200",
       "target": "/index.html"
     }
   ]
   ```

---

## 🔍 Why Two Apps?

**Possible reasons:**
1. **Different branches** - One for `main`, one for `mobile-app`
2. **Different environments** - Development vs Production
3. **Accidental duplicate** - Created by mistake

**Typically:**
- The one with the **domain configured** is the production app
- The other might be a staging/development app

---

## 🎯 Quick Checklist

- [ ] Checked App 1 (main branch) for domain
- [ ] Checked App 2 (mobile-app branch) for domain
- [ ] Identified which app has `nm2tech-sas.com`
- [ ] Added rewrite rule to correct app
- [ ] Saved and deployed
- [ ] Tested `nm2tech-sas.com/analytics-shorts` - working! ✅

---

**Check both apps to see which one has the domain configured!** 🔍

The one with `nm2tech-sas.com` in Custom domains is where you need to add the rewrite rule.

