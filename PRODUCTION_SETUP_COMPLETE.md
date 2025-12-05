# ✅ Production Stripe Setup - Complete!

## 🔑 Your Production Keys

### Frontend Keys
- **Publishable Key:** `pk_live_51RilIPCAL4InIKRQlas1xaG2odzZNj70YikLjKe1Jvf8qU2pKtx4HzLLm2Y5NP0FF4tJaf20nA08FOKAXPNB2awU00HXHdOVz8`
- **Pro Price ID:** `price_1Sak7ICAL4InIKRQecSqTjLb`
- **Enterprise Price ID:** `price_1Sb3CtCAL4InIKRQrlhBex3j`

### Backend Keys
- **Secret Key:** `sk_live_YOUR_SECRET_KEY_HERE` (get from Stripe Dashboard)

---

## 📝 Update Your Environment Files

### 1. Frontend `.env.local` (Project Root)

**Location:** `C:\Users\kolaw\Projects\NM2-Analytics-Shorts\.env.local`

Add or update these lines:

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

### 2. Backend `.env` (Backend Folder)

**Location:** `C:\Users\kolaw\Projects\NM2-Analytics-Shorts\backend\.env`

Add or update these lines:

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

## 🎯 Still Need

- [ ] **Webhook Secret** - Set up webhook endpoint in Stripe Dashboard
- [ ] **Production URLs** - Update `VITE_API_URL` and `FRONTEND_URL` with your actual production URLs

---

## 🔔 Set Up Webhook (Important!)

1. Go to: https://dashboard.stripe.com/webhooks (Live mode)
2. Click **"+ Add endpoint"**
3. **Endpoint URL:** `https://your-backend-url.com/api/subscription/webhook`
4. **Events to send:** Select:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click **"Add endpoint"**
6. Copy the **Signing secret** (`whsec_...`)
7. Paste it in `backend/.env` as `STRIPE_WEBHOOK_SECRET`

---

## ✅ After Updating Files

1. **Restart your servers:**
   ```powershell
   # Frontend (stop with Ctrl+C, then restart)
   npm run dev
   
   # Backend (in new terminal)
   cd backend
   npm start
   ```

2. **Test the payment flow:**
   - Try purchasing a plan
   - Use a real card (start with small amounts)
   - Check Stripe Dashboard → Payments

---

## 🚀 You're Ready!

All your production Stripe keys are configured. Just need to:
1. Update the environment files with the values above
2. Set up the webhook
3. Update production URLs
4. Restart servers

**Great work!** 🎉

