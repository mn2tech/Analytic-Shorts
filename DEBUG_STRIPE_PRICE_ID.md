# Debug Stripe Price ID Error

## 🔍 The Issue

Even though the Price ID is correct in `.env.local`, Stripe still says it doesn't exist. This usually means:

1. **Backend is checking against a different Stripe account**
2. **Test/Live mode mismatch**
3. **Price ID is from a different Stripe account**

## ✅ Debug Steps

### Step 1: Check Backend Terminal

When you click "Upgrade", **watch the backend terminal**. It will show:
```
Error creating checkout session: StripeInvalidRequestError: No such price: 'price_1Sak7ICAL4InIKRQecSqTjLb'
```

This tells us:
- The exact Price ID being sent
- The exact Stripe error
- Whether it's a mode mismatch

### Step 2: Verify Stripe Account Match

**Check Backend Stripe Key:**
1. Open `backend/.env`
2. Find `STRIPE_SECRET_KEY`
3. It should start with `sk_test_...`

**Check Stripe Dashboard:**
1. Go to: https://dashboard.stripe.com/test/apikeys
2. Find your **Secret key** (starts with `sk_test_`)
3. **Does it match** what's in `backend/.env`?

**If they don't match:**
- The backend is using a different Stripe account!
- Update `backend/.env` with the correct key

### Step 3: Verify Price ID in Correct Account

1. Go to: https://dashboard.stripe.com/test/products
2. Make sure you're logged into the **same account** as your secret key
3. Find "Pro Plan" product
4. Verify the Price ID matches: `price_1Sak7ICAL4InIKRQecSqTjLb`

### Step 4: Test with Stripe CLI (Optional)

If you have Stripe CLI installed:
```powershell
stripe prices retrieve price_1Sak7ICAL4InIKRQecSqTjLb
```

This will tell you if Stripe can find the price with your current API key.

## 🎯 Most Likely Issue

**Different Stripe Accounts:**
- Product created in Account A
- Backend using secret key from Account B
- Result: Price ID doesn't exist in Account B ❌

**Fix:**
- Use the secret key from the **same account** where you created the product

## ✅ Quick Check

Run this to see your backend Stripe key:
```powershell
Get-Content backend\.env | Select-String "STRIPE_SECRET"
```

Then check in Stripe Dashboard:
- Go to: https://dashboard.stripe.com/test/apikeys
- Does the secret key match?

---

**Check the backend terminal when you click "Upgrade" - it will show the exact error!** 🔍

