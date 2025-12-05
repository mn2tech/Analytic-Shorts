# 🔑 Production Stripe Configuration - Complete

## ✅ Your Production Keys

### Publishable Key (Frontend)
```
pk_live_51RilIPCAL4InIKRQlas1xaG2odzZNj70YikLjKe1Jvf8qU2pKtx4HzLLm2Y5NP0FF4tJaf20nA08FOKAXPNB2awU00HXHdOVz8
```

### Price IDs
- **Pro Plan:** `price_1Sak7ICAL4InIKRQecSqTjLb`
- **Enterprise Plan:** `price_1Sb3CtCAL4InIKRQrlhBex3j`

### Secret Key (Backend)
```
sk_live_...wQGi
```
⚠️ **You need the complete secret key** (should be ~100+ characters, not truncated)

---

## 📝 Environment Variables to Update

### 1. Frontend `.env.local` (Project Root)

Create or update `.env.local` in the project root:

```env
# Production Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51RilIPCAL4InIKRQlas1xaG2odzZNj70YikLjKe1Jvf8qU2pKtx4HzLLm2Y5NP0FF4tJaf20nA08FOKAXPNB2awU00HXHdOVz8
VITE_STRIPE_PRO_PRICE_ID=price_1Sak7ICAL4InIKRQecSqTjLb
VITE_STRIPE_ENTERPRISE_PRICE_ID=price_1Sb3CtCAL4InIKRQrlhBex3j

# Production API URL (update with your actual backend URL)
VITE_API_URL=https://your-production-backend-url.com

# Supabase (keep your existing values)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Backend `.env` (Backend Folder)

Update `backend/.env`:

```env
# Production Stripe Secret Key (get complete key from Stripe Dashboard)
STRIPE_SECRET_KEY=sk_live_YOUR_COMPLETE_SECRET_KEY_HERE

# Production Webhook Secret (get from Stripe Dashboard → Webhooks)
STRIPE_WEBHOOK_SECRET=whsec_YOUR_PRODUCTION_WEBHOOK_SECRET

# Production Frontend URL
FRONTEND_URL=https://your-production-frontend-url.com

# Supabase (keep your existing values)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

PORT=5000
```

---

## 🎯 Still Need

1. **Complete Secret Key** - The full `sk_live_...` key (not truncated)
   - Get from: https://dashboard.stripe.com/apikeys (Live mode)
   - Click "Reveal live key"
   - Copy the complete key

2. **Webhook Secret** - For production webhook
   - Get from: https://dashboard.stripe.com/webhooks (Live mode)
   - Create webhook endpoint first
   - Copy the signing secret (`whsec_...`)

---

## ✅ Checklist

- [x] Production Publishable Key
- [x] Pro Plan Price ID
- [x] Enterprise Plan Price ID
- [ ] Complete Secret Key (full length)
- [ ] Webhook Secret
- [ ] Update `.env.local` with all values
- [ ] Update `backend/.env` with secret key and webhook
- [ ] Update production deployment (Amplify, etc.)
- [ ] Restart servers
- [ ] Test payment flow

---

## 🚀 Once You Have Everything

1. **Update environment variables** (see above)
2. **Restart servers:**
   ```powershell
   # Frontend
   npm run dev
   
   # Backend  
   cd backend
   npm start
   ```
3. **Test the payment flow** with a real card (start with small amounts)

---

**You're almost there!** Just need the complete secret key and webhook secret. 🎉

