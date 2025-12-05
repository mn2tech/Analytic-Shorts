# 🔑 Update to Production Stripe Keys

## ✅ Your Production Publishable Key

You've provided:
```
pk_live_51RilIPCAL4InIKRQlas1xaG2odzZNj70YikLjKe1Jvf8qU2pKtx4HzLLm2Y5NP0FF4tJaf20nA08FOKAXPNB2awU00HXHdOVz8
```

## 📝 What You Need to Update

### 1. Frontend `.env.local` (Project Root)

Create or update `.env.local` in the project root with:

```env
# Production Stripe Publishable Key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51RilIPCAL4InIKRQlas1xaG2odzZNj70YikLjKe1Jvf8qU2pKtx4HzLLm2Y5NP0FF4tJaf20nA08FOKAXPNB2awU00HXHdOVz8

# Production Price IDs (get these from Stripe Dashboard in Live mode)
VITE_STRIPE_PRO_PRICE_ID=price_YOUR_PRODUCTION_PRO_PRICE_ID
VITE_STRIPE_ENTERPRISE_PRICE_ID=price_YOUR_PRODUCTION_ENTERPRISE_PRICE_ID

# Production API URL
VITE_API_URL=https://your-production-backend-url.com

# Supabase (keep your existing values)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Backend `.env` (Backend Folder)

Update `backend/.env` with:

```env
# Production Stripe Secret Key (get from Stripe Dashboard → API keys in Live mode)
STRIPE_SECRET_KEY=sk_live_YOUR_PRODUCTION_SECRET_KEY_HERE

# Production Webhook Secret (get from Stripe Dashboard → Webhooks in Live mode)
STRIPE_WEBHOOK_SECRET=whsec_YOUR_PRODUCTION_WEBHOOK_SECRET

# Production Frontend URL
FRONTEND_URL=https://your-production-frontend-url.com

# Keep your existing Supabase values
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

PORT=5000
```

## 🎯 Next Steps

### Step 1: Get Production Secret Key

1. Go to: https://dashboard.stripe.com/apikeys (make sure you're in **Live mode**)
2. Find **"Secret key"** (starts with `sk_live_`)
3. Click **"Reveal live key"**
4. Copy it and add to `backend/.env`

### Step 2: Get Production Price IDs

1. Go to: https://dashboard.stripe.com/products (in **Live mode**)
2. Click on **"Pro Plan"**
3. Find the **Price ID** (starts with `price_`)
4. Copy it and add to `.env.local` as `VITE_STRIPE_PRO_PRICE_ID`
5. Repeat for **"Enterprise Plan"** → `VITE_STRIPE_ENTERPRISE_PRICE_ID`

### Step 3: Set Up Production Webhook

1. Go to: https://dashboard.stripe.com/webhooks (in **Live mode**)
2. Click **"+ Add endpoint"**
3. Enter your production webhook URL:
   ```
   https://your-production-backend-url.com/api/subscription/webhook
   ```
4. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **"Add endpoint"**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add to `backend/.env` as `STRIPE_WEBHOOK_SECRET`

### Step 4: Update Production Deployment

If you're using AWS Amplify:

1. Go to AWS Amplify Console
2. App settings → Environment variables
3. Update:
   - `VITE_STRIPE_PUBLISHABLE_KEY` → `pk_live_51RilIPCAL4InIKRQlas1xaG2odzZNj70YikLjKe1Jvf8qU2pKtx4HzLLm2Y5NP0FF4tJaf20nA08FOKAXPNB2awU00HXHdOVz8`
   - `VITE_STRIPE_PRO_PRICE_ID` → Your production Pro Price ID
   - `VITE_STRIPE_ENTERPRISE_PRICE_ID` → Your production Enterprise Price ID
4. Redeploy

### Step 5: Restart Servers

After updating environment variables:

```powershell
# Stop current servers (Ctrl+C)
# Then restart:

# Frontend
npm run dev

# Backend
cd backend
npm start
```

## ⚠️ Important Reminders

1. **Products must be created in Live mode** - Test mode products don't exist in production
2. **Keys are different** - Test keys (`pk_test_`, `sk_test_`) won't work in production
3. **Webhooks are separate** - You need a new webhook endpoint for production
4. **Test first** - Verify everything works before going fully live

## ✅ Checklist

- [ ] Updated `.env.local` with production publishable key
- [ ] Got production secret key (`sk_live_...`)
- [ ] Updated `backend/.env` with production secret key
- [ ] Created products in Live mode
- [ ] Got production Price IDs
- [ ] Updated `.env.local` with production Price IDs
- [ ] Set up production webhook
- [ ] Got production webhook secret
- [ ] Updated `backend/.env` with webhook secret
- [ ] Updated production deployment (Amplify, etc.)
- [ ] Restarted servers
- [ ] Tested payment flow

---

**You're almost ready for production!** Just need the secret key and Price IDs from Live mode. 🚀

