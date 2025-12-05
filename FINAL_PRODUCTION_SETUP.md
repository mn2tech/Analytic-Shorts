# ✅ Final Production Setup - All Keys Ready!

## 🔑 Your Complete Production Keys

### Frontend (`.env.local` in project root)
```env
# Production Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51RilIPCAL4InIKRQlas1xaG2odzZNj70YikLjKe1Jvf8qU2pKtx4HzLLm2Y5NP0FF4tJaf20nA08FOKAXPNB2awU00HXHdOVz8
VITE_STRIPE_PRO_PRICE_ID=price_1Sak7ICAL4InIKRQecSqTjLb
VITE_STRIPE_ENTERPRISE_PRICE_ID=price_1Sb3CtCAL4InIKRQrlhBex3j

# Production API URL (update with your actual backend URL)
VITE_API_URL=https://your-production-backend-url.com

# Supabase (keep your existing values - don't change)
VITE_SUPABASE_URL=your_existing_supabase_url
VITE_SUPABASE_ANON_KEY=your_existing_supabase_anon_key
```

### Backend (`backend/.env`)
```env
# Production Stripe Secret Key
STRIPE_SECRET_KEY=sk_live_YOUR_SECRET_KEY_HERE

# Production Webhook Secret (get from Stripe Dashboard → Webhooks)
STRIPE_WEBHOOK_SECRET=whsec_YOUR_PRODUCTION_WEBHOOK_SECRET

# Production Frontend URL (update with your actual frontend URL)
FRONTEND_URL=https://your-production-frontend-url.com

# Supabase (keep your existing values - don't change)
SUPABASE_URL=your_existing_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_existing_supabase_service_role_key

PORT=5000
```

---

## 📝 What to Update

### ✅ Frontend `.env.local`
1. Open `.env.local` in the project root
2. Update or add these lines:
   - `VITE_STRIPE_PUBLISHABLE_KEY` (already have)
   - `VITE_STRIPE_PRO_PRICE_ID` (already have)
   - `VITE_STRIPE_ENTERPRISE_PRICE_ID` (already have)
   - `VITE_API_URL` (update with your production backend URL)

### ✅ Backend `.env`
1. Open `backend/.env`
2. Update or add:
   - `STRIPE_SECRET_KEY` ← **Paste the new key here**
   - `STRIPE_WEBHOOK_SECRET` ← **Get from Stripe Dashboard → Webhooks**
   - `FRONTEND_URL` ← **Update with your production frontend URL**

---

## 🔔 Set Up Webhook (If Not Done)

1. Go to: https://dashboard.stripe.com/webhooks (Live mode)
2. Click **"+ Add endpoint"**
3. **Endpoint URL:** `https://your-backend-url.com/api/subscription/webhook`
4. **Events to send:**
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click **"Add endpoint"**
6. Copy the **Signing secret** (`whsec_...`)
7. Paste it in `backend/.env` as `STRIPE_WEBHOOK_SECRET`

---

## 🚀 After Updating

1. **Restart your servers:**
   ```powershell
   # Stop current servers (Ctrl+C)
   
   # Frontend
   npm run dev
   
   # Backend (new terminal)
   cd backend
   npm start
   ```

2. **Test the payment flow:**
   - Try purchasing a plan
   - Use a real card (start with small amounts)
   - Check Stripe Dashboard → Payments

---

## ✅ Checklist

- [x] Production Publishable Key
- [x] Pro Plan Price ID
- [x] Enterprise Plan Price ID
- [x] Complete Secret Key
- [ ] Webhook Secret (get from Stripe Dashboard)
- [ ] Update `.env.local` with all values
- [ ] Update `backend/.env` with secret key and webhook
- [ ] Update production URLs (frontend and backend)
- [ ] Restart servers
- [ ] Test payment flow

---

**Almost there! Just need the webhook secret and to update your environment files.** 🎉

