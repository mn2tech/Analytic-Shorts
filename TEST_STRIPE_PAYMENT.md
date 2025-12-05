# Test Stripe Payment - Complete Guide

## 🧪 Testing Your Checkout Flow

Since you're using Stripe in **Test mode**, you can test payments without using real credit cards!

## ✅ Step-by-Step Test Process

### Step 1: Start Checkout

1. Go to: `http://localhost:3000/pricing`
2. Make sure you're **logged in**
3. Click **"Upgrade"** on the Pro plan ($29/month)
4. You should be redirected to Stripe Checkout page

### Step 2: Use Test Card

On the Stripe Checkout page, use these test card details:

**Card Number:**
```
4242 4242 4242 4242
```

**Expiry Date:**
- Any future date (e.g., `12/25` or `12/2025`)

**CVC:**
- Any 3 digits (e.g., `123`)

**ZIP/Postal Code:**
- Any 5 digits (e.g., `12345`)

**Name:**
- Any name (e.g., `Test User`)

### Step 3: Complete Payment

1. Fill in the card details above
2. Click **"Subscribe"** or **"Pay"** button
3. Stripe will process the payment (it's fake, no real charge!)

### Step 4: Verify Success

After payment, you should be redirected to:
```
http://localhost:3000/dashboard?success=true
```

## 🎯 Other Test Cards

Stripe provides different test cards for different scenarios:

### Successful Payment
```
Card: 4242 4242 4242 4242
Result: Payment succeeds
```

### Declined Payment (Test)
```
Card: 4000 0000 0000 0002
Result: Card is declined
```

### Requires Authentication (3D Secure)
```
Card: 4000 0025 0000 3155
Result: Requires 3D Secure authentication
```

### Insufficient Funds
```
Card: 4000 0000 0000 9995
Result: Insufficient funds
```

## ✅ What to Check

### After Successful Payment:

1. **Check Stripe Dashboard:**
   - Go to: https://dashboard.stripe.com/test/payments
   - You should see the payment
   - Status: "Succeeded"

2. **Check Subscriptions:**
   - Go to: https://dashboard.stripe.com/test/subscriptions
   - You should see an active subscription
   - Customer: Your email
   - Plan: Pro Plan ($29/month)

3. **Check Your App:**
   - Go to: `http://localhost:3000/dashboard`
   - Your subscription should be updated
   - You should have Pro plan features

## 🔍 Verify Backend Processing

Check your backend terminal - it should show:
- Customer created (if first time)
- Checkout session created
- Payment webhook received (if webhooks are set up)

## 🆘 Troubleshooting

### Payment Fails Immediately
- Check you're using test card: `4242 4242 4242 4242`
- Make sure expiry is in the future
- Check backend terminal for errors

### Redirect Doesn't Work
- Check `FRONTEND_URL` in `backend/.env`
- Should be: `http://localhost:3000`

### Subscription Not Updated
- Check Supabase database
- Check backend webhook handler (if configured)
- Check browser console for errors

## 📝 Test Checklist

- [ ] Can access pricing page
- [ ] Click "Upgrade" redirects to Stripe Checkout
- [ ] Stripe Checkout page loads correctly
- [ ] Can enter test card details
- [ ] Payment processes successfully
- [ ] Redirects back to dashboard
- [ ] Subscription appears in Stripe Dashboard
- [ ] User plan updated in app

## 🎉 Success Indicators

You'll know it's working when:
- ✅ Stripe Checkout page appears
- ✅ Payment completes without errors
- ✅ Redirects to dashboard with `?success=true`
- ✅ Subscription visible in Stripe Dashboard
- ✅ User has Pro plan access

---

**Use card `4242 4242 4242 4242` to test!** 💳

