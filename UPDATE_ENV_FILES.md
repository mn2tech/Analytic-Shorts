# 🔧 Update Environment Files for Production

## ✅ What You Have

- **Publishable Key:** `pk_live_51RilIPCAL4InIKRQlas1xaG2odzZNj70YikLjKe1Jvf8qU2pKtx4HzLLm2Y5NP0FF4tJaf20nA08FOKAXPNB2awU00HXHdOVz8`
- **Pro Price ID:** `price_1Sak7ICAL4InIKRQecSqTjLb`
- **Enterprise Price ID:** `price_1Sb3CtCAL4InIKRQrlhBex3j`
- **Secret Key:** `sk_live_...wQGi` (need complete version)

---

## 📝 Step 1: Get Complete Secret Key

1. In Stripe Dashboard → **API keys** (Live mode)
2. Click the **"..."** (ellipsis) next to "Secret key"
3. Click **"Reveal live key"**
4. Copy the **complete key** (should be ~100+ characters)

---

## 📝 Step 2: Update Frontend `.env.local`

**Location:** Project root (same folder as `package.json`)

```env
# Production Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51RilIPCAL4InIKRQlas1xaG2odzZNj70YikLjKe1Jvf8qU2pKtx4HzLLm2Y5NP0FF4tJaf20nA08FOKAXPNB2awU00HXHdOVz8
VITE_STRIPE_PRO_PRICE_ID=price_1Sak7ICAL4InIKRQecSqTjLb
VITE_STRIPE_ENTERPRISE_PRICE_ID=price_1Sb3CtCAL4InIKRQrlhBex3j

# Production API URL (update with your actual backend URL)
VITE_API_URL=https://your-production-backend-url.com

# Supabase (keep your existing values - don't change these)
VITE_SUPABASE_URL=your_existing_supabase_url
VITE_SUPABASE_ANON_KEY=your_existing_supabase_anon_key
```

---

## 📝 Step 3: Update Backend `.env`

**Location:** `backend/.env`

```env
# Production Stripe Secret Key (paste complete key here)
STRIPE_SECRET_KEY=sk_live_YOUR_COMPLETE_SECRET_KEY_HERE

# Production Webhook Secret (get from Stripe Dashboard → Webhooks)
STRIPE_WEBHOOK_SECRET=whsec_YOUR_PRODUCTION_WEBHOOK_SECRET

# Production Frontend URL (update with your actual frontend URL)
FRONTEND_URL=https://your-production-frontend-url.com

# Supabase (keep your existing values - don't change these)
SUPABASE_URL=your_existing_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_existing_supabase_service_role_key

PORT=5000
```

---

## 📝 Step 4: Set Up Webhook (If Not Done)

1. Go to: https://dashboard.stripe.com/webhooks (Live mode)
2. Click **"+ Add endpoint"**
3. **Endpoint URL:** `https://your-backend-url.com/api/subscription/webhook`
4. **Events to send:** Select these events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click **"Add endpoint"**
6. Copy the **Signing secret** (`whsec_...`)
7. Paste it in `backend/.env` as `STRIPE_WEBHOOK_SECRET`

---

## ✅ Step 5: Restart Servers

After updating environment files:

```powershell
# Stop current servers (Ctrl+C)

# Restart frontend
npm run dev

# Restart backend (in new terminal)
cd backend
npm start
```

---

## 🧪 Step 6: Test

1. Try to purchase a plan
2. Use a real card (start with small amounts)
3. Check Stripe Dashboard → Payments to see if it works

---

**Once you have the complete secret key, paste it here and I can help verify everything is set up correctly!** 🚀

