# 🔑 Production Stripe Configuration

## ✅ What You Have

**Publishable Key:**
```
pk_live_51RilIPCAL4InIKRQlas1xaG2odzZNj70YikLjKe1Jvf8qU2pKtx4HzLLm2Y5NP0FF4tJaf20nA08FOKAXPNB2awU00HXHdOVz8
```

**Secret Key:**
```
sk_live_...wQGi
```
⚠️ **Note:** Make sure you have the complete secret key (full length)

**Enterprise Price ID:**
```
price_1Sb3CtCAL4InIKRQrlhBex3j
```

## 📝 Still Need

- [x] **Pro Plan Price ID** ✅ `price_1Sak7ICAL4InIKRQecSqTjLb`
- [ ] **Complete Secret Key** (full `sk_live_...` key - not truncated)
- [ ] **Webhook Secret** (`whsec_...`)

## 🔧 Environment Variables to Update

### Frontend `.env.local` (Project Root)

```env
# Production Stripe Publishable Key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51RilIPCAL4InIKRQlas1xaG2odzZNj70YikLjKe1Jvf8qU2pKtx4HzLLm2Y5NP0FF4tJaf20nA08FOKAXPNB2awU00HXHdOVz8

# Production Price IDs
VITE_STRIPE_PRO_PRICE_ID=price_1Sak7ICAL4InIKRQecSqTjLb
VITE_STRIPE_ENTERPRISE_PRICE_ID=price_1Sb3CtCAL4InIKRQrlhBex3j

# Production API URL
VITE_API_URL=https://your-production-backend-url.com

# Supabase (keep existing)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Backend `.env` (Backend Folder)

```env
# Production Stripe Secret Key (get complete key)
STRIPE_SECRET_KEY=sk_live_YOUR_COMPLETE_SECRET_KEY_HERE

# Production Webhook Secret
STRIPE_WEBHOOK_SECRET=whsec_YOUR_PRODUCTION_WEBHOOK_SECRET

# Production Frontend URL
FRONTEND_URL=https://your-production-frontend-url.com

# Supabase (keep existing)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

PORT=5000
```

## 🎯 Next Steps

1. **Get Pro Plan Price ID:**
   - Go to: https://dashboard.stripe.com/products (Live mode)
   - Click on "Pro Plan"
   - Copy the Price ID (starts with `price_`)

2. **Get Complete Secret Key:**
   - Go to: https://dashboard.stripe.com/apikeys (Live mode)
   - Click "Reveal live key"
   - Copy the complete key

3. **Set Up Webhook:**
   - Go to: https://dashboard.stripe.com/webhooks (Live mode)
   - Add endpoint: `https://your-backend-url.com/api/subscription/webhook`
   - Copy the webhook secret

4. **Update Files and Restart Servers**

---

**You're making great progress!** Just need the Pro Plan Price ID and complete secret key. 🚀

