# 🚀 Push Enterprise Price Update to Git

## ✅ Changes Ready to Push

**Modified files:**
- ✅ `amplify.yml` - Updated Enterprise Price ID
- ✅ `src/config/pricing.js` - Enterprise price: $99 → $49
- ✅ `src/pages/Pricing.jsx` - Added "Early Access" badge, discount display, improved error handling
- ✅ `src/components/OnboardingTour.jsx` - Improved error handling

**All changes are safe to push!** ✅

---

## 📝 Step 1: Review Changes

**Before pushing, review what changed:**

```powershell
git diff
```

**This shows all the changes. Make sure:**
- ✅ No sensitive keys (Price IDs are OK - they're not secrets)
- ✅ All changes look correct
- ✅ Enterprise price is $49
- ✅ "Early Access" badge is added

---

## 📝 Step 2: Add Files to Commit

**Add the modified files:**

```powershell
git add amplify.yml
git add src/config/pricing.js
git add src/pages/Pricing.jsx
git add src/components/OnboardingTour.jsx
```

**Or add all modified files at once:**

```powershell
git add amplify.yml src/config/pricing.js src/pages/Pricing.jsx src/components/OnboardingTour.jsx
```

**Optional: Add documentation files (if you want):**

```powershell
git add *.md
```

---

## 📝 Step 3: Commit Changes

**Create a commit with descriptive message:**

```powershell
git commit -m "Update Enterprise plan to $49/month with Early Access badge"
```

**Or more detailed:**

```powershell
git commit -m "Update Enterprise plan pricing

- Change Enterprise plan price from $99 to $49/month
- Add 'Early Access' badge to Enterprise plan card
- Add discount display (50% off)
- Update Stripe Price ID in amplify.yml
- Improve error handling in checkout flow
- Update OnboardingTour error handling"
```

---

## 📝 Step 4: Push to GitHub

**Push to main branch:**

```powershell
git push origin main
```

**This will:**
- Push changes to GitHub
- Trigger Amplify build automatically
- Deploy to production

---

## ⚠️ Important: Update Amplify Environment Variables

**After pushing, verify Amplify environment variables:**

1. **Go to:** AWS Amplify Console
2. **Select:** Analytics Shorts app
3. **Go to:** Environment variables
4. **Verify** `VITE_STRIPE_ENTERPRISE_PRICE_ID` is set to: `price_1ScFgsCAL4InIKRQyL2PJ5Q4`

**Note:** `amplify.yml` already has it, but setting it in Console ensures it's always correct.

---

## ✅ Step 5: Monitor Amplify Build

**After pushing:**

1. **Go to:** AWS Amplify Console
2. **Watch** the build progress
3. **Wait** for build to complete (5-10 minutes)
4. **Test** on production: `https://analytics-shorts.nm2tech-sas.com/pricing`

---

## 🧪 Step 6: Test on Production

**After deployment:**

1. **Visit:** `https://analytics-shorts.nm2tech-sas.com/pricing`
2. **Verify:**
   - ✅ Enterprise plan shows **$49/month**
   - ✅ "Early Access" badge is visible
   - ✅ Discount display shows "50% off"
3. **Test checkout:**
   - Click "Upgrade" on Enterprise plan
   - Should redirect to Stripe checkout with $49.00/month

---

## 📝 Quick Checklist

- [ ] Reviewed changes with `git diff`
- [ ] Added modified files to staging
- [ ] Committed changes with descriptive message
- [ ] Pushed to GitHub
- [ ] Verified Amplify environment variables
- [ ] Monitored Amplify build
- [ ] Tested on production

---

## 🚀 Ready to Push!

**All changes are safe and ready. You can push now!**

**Quick commands:**
```powershell
git add amplify.yml src/config/pricing.js src/pages/Pricing.jsx src/components/OnboardingTour.jsx
git commit -m "Update Enterprise plan to $49/month with Early Access badge"
git push origin main
```

---

**After pushing, Amplify will automatically build and deploy!** 🎉

