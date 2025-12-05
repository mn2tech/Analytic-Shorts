# Fix "Price ID Does Not Exist" Error

## 🔍 The Problem

Stripe is saying the Price ID `price_1Sak7ICAL4InIKRQecSqTjLb` doesn't exist. This usually means:

1. **Test/Live Mode Mismatch** - Price created in one mode, backend using the other
2. **Price ID is Wrong** - Copied incorrectly or product was deleted
3. **Price ID from Different Account** - Using a price ID from a different Stripe account

## ✅ Step-by-Step Fix

### Step 1: Verify Test/Live Mode Match

**Check Backend:**
- Open `backend/.env`
- Check `STRIPE_SECRET_KEY`:
  - `sk_test_...` = Test mode ✅
  - `sk_live_...` = Live mode ✅

**Check Stripe Dashboard:**
1. Go to: https://dashboard.stripe.com
2. Look at the **top right toggle**:
   - **"Test mode"** = Test mode
   - **"Live mode"** = Live mode
3. Make sure they match!

### Step 2: Verify Price ID Exists

1. Go to: https://dashboard.stripe.com/test/products
   (or https://dashboard.stripe.com/products if using Live mode)

2. Click on your **"Pro Plan"** product

3. In the **Pricing** section, find the Price ID

4. **Copy it fresh** - don't use the old one

5. **Verify it matches** what's in `.env.local`:
   - Current: `price_1Sak7ICAL4InIKRQecSqTjLb`
   - Should match exactly!

### Step 3: Get Fresh Price ID (If Needed)

If the price ID doesn't match or you can't find it:

1. **Option A: Use Existing Price**
   - Go to product page
   - Click on the price row
   - Copy the Price ID

2. **Option B: Create New Price**
   - Edit the product
   - Add a new price: $29/month
   - Copy the new Price ID

### Step 4: Update .env.local

1. Open `.env.local`
2. Update the Price ID:
   ```env
   VITE_STRIPE_PRO_PRICE_ID=price_NEW_ID_HERE
   ```
3. Save the file

### Step 5: Restart Everything

```powershell
# Stop frontend (Ctrl+C)
npm run dev

# Stop backend (Ctrl+C in backend terminal)
cd backend
npm start
```

## 🎯 Most Common Issue: Test/Live Mismatch

**Scenario:**
- Price created in **Test mode**
- Backend using **Live mode** key (`sk_live_...`)
- Result: Stripe can't find the price ❌

**Fix:**
- Make sure both are in the same mode!

## 🆘 Check Backend Terminal

When you click "Upgrade", the backend terminal will show:
```
Stripe error: No such price: 'price_1Sak7ICAL4InIKRQecSqTjLb'
```

This confirms Stripe can't find it. Check:
1. Is the price ID correct?
2. Is it in the right mode (test/live)?
3. Does it exist in your Stripe account?

## ✅ Quick Verification

Run this to check your current setup:

```powershell
# Check frontend .env.local
Get-Content .env.local | Select-String "STRIPE_PRO_PRICE"

# Check backend .env
Get-Content backend\.env | Select-String "STRIPE_SECRET"
```

**Expected:**
- Frontend: `VITE_STRIPE_PRO_PRICE_ID=price_...`
- Backend: `STRIPE_SECRET_KEY=sk_test_...` (or `sk_live_...`)

Both should be in the **same mode** (test or live)!

---

**Next step: Verify the Price ID exists in Stripe Dashboard and matches your mode!** 🔍

