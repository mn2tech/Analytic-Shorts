# 🚀 Set Up Stripe Now - Quick Guide

## ✅ What You Have
- **Publishable Key:** `pk_test_51RilIPCAL4InIKRQU4d6lOMScYKSWGA7SSAO7DGwgnGujTkH8T8urHpgwpehvLbdUKShSbk0dutiYQCJF2zHp0PK008JO9uWsj`

## 📝 What You Need to Do

### 1. Create `.env.local` in Project Root

Create a file named `.env.local` in the root folder with:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51RilIPCAL4InIKRQU4d6lOMScYKSWGA7SSAO7DGwgnGujTkH8T8urHpgwpehvLbdUKShSbk0dutiYQCJF2zHp0PK008JO9uWsj
VITE_STRIPE_PRO_PRICE_ID=price_pro_monthly
VITE_STRIPE_ENTERPRISE_PRICE_ID=price_enterprise_monthly
VITE_API_URL=http://localhost:5000
```

### 2. Get Your Secret Key

1. Go to: https://dashboard.stripe.com/test/apikeys
2. Find **"Secret key"** (starts with `sk_test_`)
3. Click **"Reveal test key"**
4. Copy it

### 3. Create `backend/.env`

Create a file named `.env` in the `backend` folder with:

```env
PORT=5000
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
FRONTEND_URL=http://localhost:3000
```

Replace `sk_test_YOUR_SECRET_KEY_HERE` with your actual secret key from Step 2.

### 4. Create Products in Stripe

1. Go to: https://dashboard.stripe.com/test/products
2. Click **"+ Add product"**

**Pro Plan:**
- Name: Pro Plan
- Price: $19.00 USD/month
- Copy the Price ID (starts with `price_`)
- Update `.env.local`: `VITE_STRIPE_PRO_PRICE_ID=price_xxxxx`

**Enterprise Plan:**
- Name: Enterprise Plan  
- Price: $199.00 USD/month
- Copy the Price ID
- Update `.env.local`: `VITE_STRIPE_ENTERPRISE_PRICE_ID=price_xxxxx`

### 5. Restart Servers

```powershell
# Backend
cd backend
npm start

# Frontend (new terminal)
npm run dev
```

## ✅ Done!

Test at: `http://localhost:3000/pricing`

Use test card: `4242 4242 4242 4242`




