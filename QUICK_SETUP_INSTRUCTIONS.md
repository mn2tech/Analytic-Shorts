# 🚀 Quick Setup - Stripe Keys Ready!

## ✅ Your Stripe Keys

**Publishable Key:** `pk_test_your_stripe_publishable_key_here`

**Secret Key:** `sk_test_your_stripe_secret_key_here`

## 📝 Create These 2 Files

### 1. Create `backend/.env`

**Copy the content from `backend/env-setup.txt`** and create a file named `.env` in the `backend` folder.

Or manually create it with:

```env
PORT=5000
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

**Important:** Replace `your_supabase_project_url` and `your_supabase_service_role_key` with your actual Supabase credentials.

### 2. Create `.env.local` in Project Root

Create a file named `.env.local` in the root folder with:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
VITE_STRIPE_PRO_PRICE_ID=price_pro_monthly
VITE_STRIPE_ENTERPRISE_PRICE_ID=price_enterprise_monthly
VITE_API_URL=http://localhost:5000
```

## 🎯 Next: Create Products in Stripe

1. Go to: https://dashboard.stripe.com/test/products
2. Click **"+ Add product"**

**Pro Plan ($19/month):**
- Name: Pro Plan
- Price: $19.00 USD, Monthly
- Copy the Price ID (starts with `price_`)
- Update `.env.local`: Replace `price_pro_monthly` with your Price ID

**Enterprise Plan ($199/month):**
- Name: Enterprise Plan
- Price: $199.00 USD, Monthly
- Copy the Price ID
- Update `.env.local`: Replace `price_enterprise_monthly` with your Price ID

## 🚀 Restart Servers

```powershell
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
npm run dev
```

## ✅ Test It!

1. Go to: `http://localhost:3000/pricing`
2. Click "Upgrade" on any plan
3. Should redirect to Stripe Checkout
4. Use test card: `4242 4242 4242 4242`

---

**That's it!** Your Stripe integration is ready! 🎉


