# ⚡ Quick Update Guide - Production Stripe Keys

## ✅ You Have Everything!

**Secret Key:** `sk_live_YOUR_SECRET_KEY_HERE`

---

## 📝 Manual Update (2 Minutes)

### Step 1: Update Frontend `.env.local`

**File:** `.env.local` (in project root)

**Add or update these lines:**

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51RilIPCAL4InIKRQlas1xaG2odzZNj70YikLjKe1Jvf8qU2pKtx4HzLLm2Y5NP0FF4tJaf20nA08FOKAXPNB2awU00HXHdOVz8
VITE_STRIPE_PRO_PRICE_ID=price_1Sak7ICAL4InIKRQecSqTjLb
VITE_STRIPE_ENTERPRISE_PRICE_ID=price_1Sb3CtCAL4InIKRQrlhBex3j
```

**Keep your existing:**
- `VITE_API_URL` (or update to production URL)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

### Step 2: Update Backend `.env`

**File:** `backend/.env`

**Add or update these lines:**

```env
STRIPE_SECRET_KEY=sk_live_YOUR_SECRET_KEY_HERE
```

**Keep your existing:**
- `STRIPE_WEBHOOK_SECRET` (or add if you have it)
- `FRONTEND_URL` (or update to production URL)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PORT=5000`

---

## 🔄 Step 3: Restart Servers

```powershell
# Stop current servers (Ctrl+C)

# Restart frontend
npm run dev

# Restart backend (new terminal)
cd backend
npm start
```

---

## ✅ Done!

Your production Stripe keys are now configured!

**Still need:**
- Webhook secret (set up webhook in Stripe Dashboard)
- Production URLs (update `VITE_API_URL` and `FRONTEND_URL`)

See `PRODUCTION_SETUP_COMPLETE.md` for webhook setup instructions.

