# Stripe Setup Guide

## 🔑 Keys You Need

You have:
- ✅ **Publishable Key:** `pk_test_51RilIPCAL4InIKRQU4d6lOMScYKSWGA7SSAO7DGwgnGujTkH8T8urHpgwpehvLbdUKShSbk0dutiYQCJF2zHp0PK008JO9uWsj`

You still need:
- ❌ **Secret Key:** Get from https://dashboard.stripe.com/test/apikeys

## 📝 Step 1: Get Your Secret Key

1. Go to: https://dashboard.stripe.com/test/apikeys
2. Find **"Secret key"** (starts with `sk_test_`)
3. Click **"Reveal test key"** to see it
4. Copy it (you'll need it for the backend)

## 📝 Step 2: Set Up Frontend (.env.local)

Create or update `.env.local` in the **project root** (not backend folder):

```env
# Stripe Publishable Key (for frontend)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51RilIPCAL4InIKRQU4d6lOMScYKSWGA7SSAO7DGwgnGujTkH8T8urHpgwpehvLbdUKShSbk0dutiYQCJF2zHp0PK008JO9uWsj

# Stripe Price IDs (create these in Stripe Dashboard)
VITE_STRIPE_PRO_PRICE_ID=price_xxxxx
VITE_STRIPE_ENTERPRISE_PRICE_ID=price_xxxxx

# Backend API URL
VITE_API_URL=http://localhost:5000

# Supabase (if not already set)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📝 Step 3: Set Up Backend (.env)

Create or update `.env` in the **backend folder**:

```env
# Stripe Secret Key (for backend)
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE

# Stripe Webhook Secret (optional, for production)
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Server Port
PORT=5000

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Frontend URL (for redirects)
FRONTEND_URL=http://localhost:3000
```

## 📝 Step 4: Create Stripe Products & Prices

You need to create products and prices in Stripe Dashboard:

1. Go to: https://dashboard.stripe.com/test/products
2. Click **"+ Add product"**

### Create "Pro Plan" Product:
- **Name:** Pro Plan
- **Description:** For power users and small teams
- **Pricing:** 
  - **Recurring:** Monthly
  - **Price:** $19.00 USD
  - Click **"Save product"**
- **Copy the Price ID** (starts with `price_`) → Use for `VITE_STRIPE_PRO_PRICE_ID`

### Create "Enterprise Plan" Product:
- **Name:** Enterprise Plan
- **Description:** For teams and organizations
- **Pricing:**
  - **Recurring:** Monthly
  - **Price:** $199.00 USD
  - Click **"Save product"**
- **Copy the Price ID** (starts with `price_`) → Use for `VITE_STRIPE_ENTERPRISE_PRICE_ID`

## 📝 Step 5: Update Pricing Configuration

After creating prices, update `.env.local` with the actual Price IDs:

```env
VITE_STRIPE_PRO_PRICE_ID=price_1ABC123...  # Replace with your actual Pro price ID
VITE_STRIPE_ENTERPRISE_PRICE_ID=price_1XYZ789...  # Replace with your actual Enterprise price ID
```

## ✅ Step 6: Restart Servers

After setting up environment variables:

1. **Restart Backend:**
   ```powershell
   cd backend
   npm start
   ```

2. **Restart Frontend:**
   ```powershell
   npm run dev
   ```

## 🧪 Testing

1. Go to `http://localhost:3000/pricing`
2. Click "Upgrade" on Pro or Enterprise plan
3. Should redirect to Stripe Checkout
4. Use test card: `4242 4242 4242 4242`
5. Any future expiry date, any CVC

## 🔒 Security Notes

- ✅ **Publishable key** (`pk_test_`) is safe to expose in frontend
- ❌ **Secret key** (`sk_test_`) must NEVER be exposed in frontend
- ✅ Use **test keys** for development
- 🔄 Switch to **live keys** (`pk_live_` and `sk_live_`) for production

## 📚 Next Steps

1. ✅ Set up both keys in `.env` files
2. ✅ Create products and prices in Stripe
3. ✅ Update Price IDs in `.env.local`
4. ✅ Test checkout flow
5. ✅ Set up webhook endpoint (for production)

## 🆘 Troubleshooting

**Error: "Stripe not configured"**
- Check that `STRIPE_SECRET_KEY` is in `backend/.env`
- Restart backend server

**Error: "Price ID not found"**
- Make sure you created the products in Stripe Dashboard
- Copy the correct Price ID (starts with `price_`)
- Update `.env.local` with the correct Price ID

**Checkout doesn't work**
- Check browser console (F12) for errors
- Verify publishable key is in `.env.local`
- Make sure frontend is restarted after adding env vars
