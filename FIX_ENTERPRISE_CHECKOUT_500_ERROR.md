# 🔧 Fix Enterprise Checkout 500 Error

## ❌ Error: "Request failed with status code 500"

**This happens when trying to checkout with the Enterprise plan.**

---

## 🔍 Common Causes

1. **New Price ID doesn't exist in Stripe yet**
   - You just created the price, but Stripe might need a moment
   - Or the Price ID is incorrect

2. **Backend using old Price ID**
   - Backend might be cached or not restarted
   - Or environment variable not updated

3. **Stripe configuration issue**
   - Stripe secret key not set
   - Wrong Stripe mode (test vs live)

---

## ✅ Step 1: Verify Price ID in Stripe

**Check if the Price ID exists in Stripe:**

1. **Go to:** Stripe Dashboard → Products
2. **Find:** "Enterprise Plan" product
3. **Click** on the product
4. **Look for** the price with **$49/month**
5. **Click** on the price row to reveal the Price ID
6. **Verify** it matches: `price_1ScFgsCAL4InIKRQyL2PJ5Q4`

**If it's different:**
- Copy the actual Price ID
- Update your environment variables

---

## ✅ Step 2: Check Backend Logs

**The backend logs will show the exact error:**

1. **Check** your backend console/terminal
2. **Look for** error messages like:
   - "No such price"
   - "Invalid price ID"
   - "Stripe error"
3. **The error will show** the exact problem

**If you see "No such price":**
- The Price ID doesn't exist in Stripe
- Or you're using test mode key with live price (or vice versa)

---

## ✅ Step 3: Verify Stripe Mode

**Make sure you're using the correct Stripe mode:**

**Check your Stripe secret key:**
- **Live mode:** Starts with `sk_live_...`
- **Test mode:** Starts with `sk_test_...`

**Check your Price ID:**
- **Live mode prices:** Created in Live mode
- **Test mode prices:** Created in Test mode

**They must match!**
- Live key → Live price ✅
- Test key → Test price ✅
- Live key → Test price ❌ (will fail)
- Test key → Live price ❌ (will fail)

---

## ✅ Step 4: Restart Backend

**If you updated environment variables:**

1. **Stop** the backend server (Ctrl+C)
2. **Restart** it:
   ```bash
   cd backend
   node server.js
   ```
   Or if using PM2:
   ```bash
   pm2 restart analytics-api --update-env
   ```

**This ensures the backend picks up any changes.**

---

## ✅ Step 5: Verify Frontend is Using New Price ID

**Check if frontend is sending the correct Price ID:**

1. **Open** browser DevTools (F12)
2. **Go to** Network tab
3. **Try** to checkout Enterprise plan
4. **Find** the request to `/api/subscription/checkout`
5. **Check** the request payload:
   ```json
   {
     "priceId": "price_1ScFgsCAL4InIKRQyL2PJ5Q4"
   }
   ```

**If it shows the old Price ID:**
- Frontend `.env.local` not updated
- Or frontend not restarted

---

## ✅ Step 6: Test Price ID Directly in Stripe

**Verify the Price ID works in Stripe:**

1. **Go to:** Stripe Dashboard → Developers → API
2. **Try** to retrieve the price:
   ```bash
   curl https://api.stripe.com/v1/prices/price_1ScFgsCAL4InIKRQyL2PJ5Q4 \
     -u sk_live_YOUR_SECRET_KEY:
   ```

**Or use Stripe CLI:**
```bash
stripe prices retrieve price_1ScFgsCAL4InIKRQyL2PJ5Q4
```

**If it returns an error:**
- Price ID doesn't exist
- Or wrong Stripe mode

---

## 🔍 Most Likely Issues

### Issue 1: Price ID Doesn't Exist Yet

**If you just created the price:**
- Wait 1-2 minutes
- Stripe might need time to propagate
- Try again

### Issue 2: Wrong Stripe Mode

**Check:**
- Backend `.env` has `STRIPE_SECRET_KEY=sk_live_...`
- Price ID `price_1ScFgsCAL4InIKRQyL2PJ5Q4` is in Live mode
- They match ✅

### Issue 3: Frontend Not Updated

**Check:**
- `.env.local` has `VITE_STRIPE_ENTERPRISE_PRICE_ID=price_1ScFgsCAL4InIKRQyL2PJ5Q4`
- Frontend server restarted
- Browser cache cleared (hard refresh: Ctrl+Shift+R)

---

## 📝 Quick Checklist

- [ ] Price ID exists in Stripe Dashboard?
- [ ] Price ID matches: `price_1ScFgsCAL4InIKRQyL2PJ5Q4`?
- [ ] Stripe mode matches (live key → live price)?
- [ ] Backend `.env` has correct `STRIPE_SECRET_KEY`?
- [ ] Frontend `.env.local` has correct `VITE_STRIPE_ENTERPRISE_PRICE_ID`?
- [ ] Backend restarted after changes?
- [ ] Frontend restarted after changes?
- [ ] Checked backend logs for exact error?
- [ ] Tested Price ID directly in Stripe?

---

## 🚀 Quick Fix

**Most common fix:**

1. **Verify** Price ID in Stripe Dashboard
2. **Update** `.env.local`:
   ```env
   VITE_STRIPE_ENTERPRISE_PRICE_ID=price_1ScFgsCAL4InIKRQyL2PJ5Q4
   ```
3. **Restart** frontend: `npm run dev`
4. **Restart** backend: `pm2 restart analytics-api --update-env`
5. **Clear** browser cache (Ctrl+Shift+R)
6. **Try** checkout again

---

**Check the backend logs first - they'll show the exact error!** 🔍

The backend has detailed error logging that will tell you exactly what's wrong.

