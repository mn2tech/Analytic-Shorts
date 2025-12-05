# 🔑 Production Environment Variables Setup

## ✅ Your Production Keys

**Publishable Key:**
```
pk_live_51RilIPCAL4InIKRQlas1xaG2odzZNj70YikLjKe1Jvf8qU2pKtx4HzLLm2Y5NP0FF4tJaf20nA08FOKAXPNB2awU00HXHdOVz8
```

**Secret Key:**
```
sk_live_...wQGi
```
⚠️ **Note:** Make sure you have the complete secret key (it should be much longer). The full key starts with `sk_live_` and is about 100+ characters.

## 📝 Files to Update

### 1. Frontend `.env.local` (Project Root)

Create or update `.env.local` in the project root:

```env
# Production Stripe Keys
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51RilIPCAL4InIKRQlas1xaG2odzZNj70YikLjKe1Jvf8qU2pKtx4HzLLm2Y5NP0FF4tJaf20nA08FOKAXPNB2awU00HXHdOVz8

# Production Price IDs (get from Stripe Dashboard → Products in Live mode)
VITE_STRIPE_PRO_PRICE_ID=price_YOUR_PRODUCTION_PRO_PRICE_ID
VITE_STRIPE_ENTERPRISE_PRICE_ID=price_YOUR_PRODUCTION_ENTERPRISE_PRICE_ID

# Production API URL
VITE_API_URL=https://your-production-backend-url.com

# Supabase (keep existing values)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Backend `.env` (Backend Folder)

Update `backend/.env`:

```env
# Production Stripe Secret Key
STRIPE_SECRET_KEY=sk_live_YOUR_COMPLETE_SECRET_KEY_HERE

# Production Webhook Secret (get from Stripe Dashboard → Webhooks in Live mode)
STRIPE_WEBHOOK_SECRET=whsec_YOUR_PRODUCTION_WEBHOOK_SECRET

# Production Frontend URL
FRONTEND_URL=https://your-production-frontend-url.com

# Supabase (keep existing values)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

PORT=5000
```

## 🎯 Still Need

1. **Complete Secret Key** - Make sure you have the full key (not truncated)
2. **Production Price IDs** - From products created in Live mode
3. **Production Webhook Secret** - From webhook endpoint in Live mode

## 📋 Quick Steps

1. **Get Complete Secret Key:**
   - Go to: https://dashboard.stripe.com/apikeys (Live mode)
   - Click "Reveal live key"
   - Copy the complete key (should be ~100+ characters)

2. **Get Price IDs:**
   - Go to: https://dashboard.stripe.com/products (Live mode)
   - Click on "Pro Plan" → Copy Price ID
   - Click on "Enterprise Plan" → Copy Price ID

3. **Get Webhook Secret:**
   - Go to: https://dashboard.stripe.com/webhooks (Live mode)
   - Create webhook endpoint
   - Copy the signing secret

4. **Update Files:**
   - Update `.env.local` with publishable key and Price IDs
   - Update `backend/.env` with secret key and webhook secret

5. **Restart Servers:**
   ```powershell
   # Frontend
   npm run dev
   
   # Backend
   cd backend
   npm start
   ```

---

**Important:** Make sure you have the complete secret key (not truncated)!

