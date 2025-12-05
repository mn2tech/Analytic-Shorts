# 🔧 Fix: "No such customer" Error (Test Mode → Live Mode)

## ❌ The Error

```
Stripe error: No such customer: 'cus_TWkBh0ePIOop4j'; 
a similar object exists in test mode, but a live mode key was used to make this request.
```

## 🔍 What Happened?

You switched from **test mode** to **live mode** in Stripe, but your database still has customer IDs from test mode. Stripe keeps test and live data completely separate, so test mode customer IDs don't exist in live mode.

## ✅ The Fix

I've updated the code to automatically handle this:

1. **When creating checkout:** The backend now verifies if the customer exists in Stripe
2. **If customer doesn't exist:** It automatically creates a new customer in live mode
3. **Database is updated:** The new live mode customer ID is saved to your database

**The fix is already applied!** Just restart your backend server.

---

## 🔄 Restart Backend Server

```powershell
# Stop current server (Ctrl+C)
# Then restart:
cd backend
node server.js
```

---

## 🧹 Optional: Clear Test Mode Data

If you want to start fresh and remove all test mode customer IDs from your database, you can run this SQL in your Supabase SQL Editor:

```sql
-- Clear test mode customer IDs (they'll be recreated in live mode)
UPDATE shorts_subscriptions
SET stripe_customer_id = NULL,
    stripe_subscription_id = NULL,
    plan = 'free',
    status = 'active'
WHERE stripe_customer_id IS NOT NULL;
```

**Note:** This will reset all subscriptions to free plan. Users will need to subscribe again in live mode.

---

## ✅ After Restart

1. Try purchasing a plan again
2. The system will automatically create a new live mode customer
3. The checkout should work correctly

---

## 🎯 What Changed

**File:** `backend/routes/subscription.js`

- Added customer verification before using existing customer ID
- Automatically creates new customer if old one doesn't exist
- Handles test mode → live mode migration seamlessly

---

**The error should be fixed now!** Try purchasing a plan again. 🚀

