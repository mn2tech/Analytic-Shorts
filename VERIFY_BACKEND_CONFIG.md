# ✅ Backend Configuration Verification

## Your Current Configuration

Your `backend/.env` file looks correct! Here's what you have:

✅ **PORT:** `5000`  
✅ **STRIPE_SECRET_KEY:** Production key configured  
✅ **SUPABASE_URL:** Configured  
✅ **SUPABASE_SERVICE_ROLE_KEY:** Configured  
✅ **FRONTEND_URL:** `http://192.168.1.151:3003` (matches your frontend)

---

## 🔍 Next Steps to Fix 500 Error

### Step 1: Restart Backend Server

**IMPORTANT:** After updating `.env`, you MUST restart the backend:

```powershell
# Stop backend (Ctrl+C in backend terminal)
# Then restart:
cd backend
node server.js
```

### Step 2: Check Backend Startup Logs

When the backend starts, you should see:
- ✅ Server running on port 5000
- ✅ No warnings about Stripe or Supabase

If you see warnings, there's a configuration issue.

### Step 3: Check Backend Error Logs

When you try to checkout, **watch your backend terminal** for error messages like:

```
Error creating checkout session: Stripe error: No such price: price_1Sak7ICAL4InIKRQecSqTjLb
```

or

```
Error creating checkout session: [some other error]
```

**Share the exact error message** from your backend terminal.

---

## 🎯 Most Likely Issue: Price ID Doesn't Exist in Live Mode

The 500 error is likely because the Price IDs in your frontend don't exist in **Live mode** Stripe.

### Verify Price IDs in Stripe Dashboard

1. Go to: **https://dashboard.stripe.com/products** (make sure you're in **Live mode** - toggle in top right)
2. Check if these Price IDs exist:
   - **Pro:** `price_1Sak7ICAL4InIKRQecSqTjLb`
   - **Enterprise:** `price_1Sb3CtCAL4InIKRQrlhBex3j`

3. If they don't exist or are different:
   - Click on each product
   - Copy the **actual Price ID** (starts with `price_`)
   - Update `.env.local` in project root with the correct Price IDs

---

## 📝 Quick Checklist

- [x] Backend `.env` has correct `STRIPE_SECRET_KEY`
- [x] Backend `.env` has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- [x] Backend `.env` has correct `FRONTEND_URL`
- [ ] **Backend server restarted** after updating `.env`
- [ ] **Price IDs verified** in Stripe Dashboard (Live mode)
- [ ] **Frontend `.env.local`** has correct production Price IDs
- [ ] **Frontend server restarted** after updating `.env.local`

---

## 🚨 If Still Getting 500 Error

**Check your backend terminal** when you click "Subscribe" and share:

1. The exact error message
2. Any stack trace
3. Any warnings on startup

The backend logs will tell us exactly what's failing!

---

**Your configuration looks good! The issue is likely:**
1. Backend not restarted, OR
2. Price IDs don't match between frontend and Stripe Dashboard

Let me know what error you see in the backend terminal! 🔍

