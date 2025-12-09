# ✅ Update Enterprise Price ID

## New Price ID

**Enterprise Plan Price ID:** `price_1ScFgsCAL4InIKRQyL2PJ5Q4`

**This is the new $49/month price you created in Stripe.**

---

## ✅ Step 1: Update Frontend (.env.local)

**Update your local environment file:**

1. **Open:** `.env.local` file in the project root
2. **Find:** `VITE_STRIPE_ENTERPRISE_PRICE_ID`
3. **Update** to:
   ```env
   VITE_STRIPE_ENTERPRISE_PRICE_ID=price_1ScFgsCAL4InIKRQyL2PJ5Q4
   ```
4. **Save** the file
5. **Restart** the frontend dev server:
   ```bash
   npm run dev
   ```

---

## ✅ Step 2: Update AWS Amplify

**Update the environment variable in Amplify:**

1. **Go to:** AWS Amplify Console
2. **Select:** Analytics Shorts app
3. **Go to:** Environment variables (left sidebar)
4. **Find:** `VITE_STRIPE_ENTERPRISE_PRICE_ID`
5. **Click:** Edit (or Add if it doesn't exist)
6. **Update** value to: `price_1ScFgsCAL4InIKRQyL2PJ5Q4`
7. **Save**
8. **Amplify will automatically trigger a new build**

**Or manually trigger a build:**
- Go to "Build history"
- Click "Redeploy this version" on the latest build

---

## ✅ Step 3: Verify the Update

**After updating both:**

1. **Local:**
   - Visit: `http://localhost:5173/pricing` (or your local URL)
   - Check: Enterprise plan shows **$49/month**
   - Click: "Upgrade" on Enterprise plan
   - Verify: Stripe checkout shows **$49.00/month**

2. **Production:**
   - Wait for Amplify build to complete (5-10 minutes)
   - Visit: `https://analytics-shorts.nm2tech-sas.com/pricing`
   - Check: Enterprise plan shows **$49/month**
   - Click: "Upgrade" on Enterprise plan
   - Verify: Stripe checkout shows **$49.00/month**

---

## 📝 Quick Checklist

- [ ] Updated `.env.local` with new Price ID
- [ ] Restarted frontend dev server
- [ ] Updated Amplify environment variable
- [ ] Waited for Amplify build to complete
- [ ] Tested checkout on local
- [ ] Tested checkout on production

---

## 🔍 Current Configuration

**Enterprise Plan:**
- **Price:** $49/month (Early Access)
- **Price ID:** `price_1ScFgsCAL4InIKRQyL2PJ5Q4`
- **Status:** ✅ Ready to use

**Frontend:**
- ✅ Price updated to $49
- ✅ "Early Access" badge added
- ✅ Discount display added

**Next:** Update environment variables and test! 🚀

