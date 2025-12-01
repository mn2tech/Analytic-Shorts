# Fix "Failed to start checkout" Error

## 🔍 Common Causes

### 1. Stripe Not Configured
**Error:** "Stripe not configured"

**Fix:**
- Make sure `backend/.env` has `STRIPE_SECRET_KEY`
- Restart backend after adding the key

### 2. Invalid Price ID
**Error:** "Invalid price ID" or "No such price"

**Fix:**
- Create products in Stripe Dashboard: https://dashboard.stripe.com/test/products
- Copy the actual Price ID (starts with `price_`)
- Update `.env.local` with real Price IDs (not placeholders)

### 3. Supabase Not Configured
**Error:** "Database not configured"

**Fix:**
- Make sure `backend/.env` has valid Supabase credentials
- Restart backend

### 4. Backend Not Running
**Error:** Network error or connection refused

**Fix:**
- Start backend: `cd backend && npm start`
- Check it's running on port 5000

### 5. Not Logged In
**Error:** Authentication error

**Fix:**
- Make sure you're logged in
- Try logging out and back in

## ✅ Quick Fix Steps

### Step 1: Check Browser Console
1. Press **F12** → **Console** tab
2. Look for error messages
3. Check the Network tab for failed requests

### Step 2: Check Backend Terminal
Look at the backend terminal for error messages when you click "Upgrade"

### Step 3: Verify Configuration

**Check `backend/.env`:**
```env
STRIPE_SECRET_KEY=sk_test_xxxxx
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxx
```

**Check `.env.local` (root):**
```env
VITE_STRIPE_PRO_PRICE_ID=price_xxxxx  # Real Price ID from Stripe
VITE_STRIPE_ENTERPRISE_PRICE_ID=price_xxxxx  # Real Price ID from Stripe
```

### Step 4: Create Products in Stripe

1. Go to: https://dashboard.stripe.com/test/products
2. Click **"+ Add product"**
3. Create "Pro Plan" - $19/month
4. **Copy the Price ID** (starts with `price_`)
5. Update `.env.local` with the real Price ID
6. Repeat for Enterprise Plan

### Step 5: Restart Servers

```powershell
# Backend
cd backend
npm start

# Frontend (new terminal)
npm run dev
```

## 🧪 Test Checklist

- [ ] Backend is running (check terminal)
- [ ] Stripe secret key is in `backend/.env`
- [ ] Supabase credentials are in `backend/.env`
- [ ] Products created in Stripe Dashboard
- [ ] Real Price IDs in `.env.local` (not placeholders)
- [ ] User is logged in
- [ ] Browser console shows no errors

## 🆘 Still Not Working?

**Check backend terminal** when you click "Upgrade" - it will show the exact error.

Common errors:
- `Stripe not configured` → Add `STRIPE_SECRET_KEY` to `backend/.env`
- `No such price` → Create product in Stripe and use real Price ID
- `Database not configured` → Add Supabase credentials to `backend/.env`
- `Authentication required` → Make sure you're logged in


