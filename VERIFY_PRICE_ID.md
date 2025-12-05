# Verify Price ID and Fix "Price ID Does Not Exist" Error

## 🔍 The Issue

The error "The price ID does not exist in your Stripe account" usually means:

1. **Frontend hasn't restarted** after adding Price ID to `.env.local`
2. **Price ID is incorrect** or doesn't exist in Stripe
3. **Test/Live mode mismatch** (using test price ID with live key or vice versa)

## ✅ Quick Fix Steps

### Step 1: Verify Price ID in Stripe

1. Go to: https://dashboard.stripe.com/test/products
2. Make sure you're in **Test mode** (toggle in top right)
3. Click on your "Pro Plan" product
4. Find the Price ID (starts with `price_`)
5. **Verify it matches** what's in your `.env.local`:
   - Current: `price_1Sak7ICAL4InIKRQecSqTjLb`

### Step 2: Restart Frontend (IMPORTANT!)

Vite needs to restart to load new environment variables:

```powershell
# Stop frontend (Ctrl+C)
# Then restart:
npm run dev
```

### Step 3: Verify Backend is Using Test Mode

Check `backend/.env`:
- `STRIPE_SECRET_KEY` should start with `sk_test_` (not `sk_live_`)

### Step 4: Test Again

1. Go to: `http://localhost:3000/pricing`
2. Click "Upgrade" on Pro plan
3. Should work now!

## 🆘 If Still Not Working

### Check Backend Terminal

When you click "Upgrade", check the backend terminal. It will show:
- The exact Price ID being sent
- The Stripe error message
- Whether it's a test/live mode issue

### Verify Price ID Format

The Price ID should:
- Start with `price_`
- Be from **Test mode** if using `sk_test_` key
- Match exactly what's in Stripe Dashboard

### Common Issues

**Frontend not restarted:**
- Vite caches environment variables
- Must restart after changing `.env.local`

**Wrong mode:**
- Test Price ID + Test Secret Key ✅
- Live Price ID + Live Secret Key ✅
- Test Price ID + Live Secret Key ❌
- Live Price ID + Test Secret Key ❌

**Price ID doesn't exist:**
- Product might have been deleted
- Price might have been archived
- Check Stripe Dashboard to verify

---

**Most likely fix: Restart your frontend server!** 🔄

