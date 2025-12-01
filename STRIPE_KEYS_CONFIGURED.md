# ✅ Stripe Keys Configured!

## What You Have Now

✅ **Publishable Key:** `pk_test_51RilIPCAL4InIKRQU4d6lOMScYKSWGA7SSAO7DGwgnGujTkH8T8urHpgwpehvLbdUKShSbk0dutiYQCJF2zHp0PK008JO9uWsj`
✅ **Secret Key:** `sk_test_51RilIPCAL4InIKRQHV5dojJeHkbDZWmUCI8wNw92VTSIOqKiHNCuFrbPk1dX0VD4TajuAMFs3gB1PrmKva61Sw4200508lsk6x`

## 📝 Next Steps

### 1. Create `backend/.env` File

Create a file named `.env` in the `backend` folder with this content:

```env
PORT=5000
STRIPE_SECRET_KEY=sk_test_51RilIPCAL4InIKRQHV5dojJeHkbDZWmUCI8wNw92VTSIOqKiHNCuFrbPk1dX0VD4TajuAMFs3gB1PrmKva61Sw4200508lsk6x
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

**Important:** Replace `your_supabase_project_url` and `your_supabase_service_role_key` with your actual Supabase credentials.

### 2. Create `.env.local` in Project Root

Create a file named `.env.local` in the root folder with:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51RilIPCAL4InIKRQU4d6lOMScYKSWGA7SSAO7DGwgnGujTkH8T8urHpgwpehvLbdUKShSbk0dutiYQCJF2zHp0PK008JO9uWsj
VITE_STRIPE_PRO_PRICE_ID=price_pro_monthly
VITE_STRIPE_ENTERPRISE_PRICE_ID=price_enterprise_monthly
VITE_API_URL=http://localhost:5000
```

### 3. Create Products in Stripe Dashboard

You need to create the products and get Price IDs:

1. Go to: https://dashboard.stripe.com/test/products
2. Click **"+ Add product"**

**Pro Plan:**
- Name: **Pro Plan**
- Description: For power users and small teams
- Price: **$19.00** USD
- Billing: **Monthly (recurring)**
- Click **"Save product"**
- **Copy the Price ID** (starts with `price_`)
- Update `.env.local`: Replace `price_pro_monthly` with your actual Price ID

**Enterprise Plan:**
- Name: **Enterprise Plan**
- Description: For teams and organizations
- Price: **$199.00** USD
- Billing: **Monthly (recurring)**
- Click **"Save product"**
- **Copy the Price ID** (starts with `price_`)
- Update `.env.local`: Replace `price_enterprise_monthly` with your actual Price ID

### 4. Restart Servers

After creating the `.env` files:

**Terminal 1 - Backend:**
```powershell
cd backend
npm start
```

**Terminal 2 - Frontend:**
```powershell
npm run dev
```

### 5. Test It!

1. Go to: `http://localhost:3000/pricing`
2. Click **"Upgrade"** on Pro or Enterprise plan
3. Should redirect to Stripe Checkout
4. Use test card: `4242 4242 4242 4242`
5. Any future expiry, any CVC

## ✅ What Should Work Now

- ✅ Backend starts without Stripe errors
- ✅ Payment checkout flow works
- ✅ Users can upgrade plans
- ✅ Stripe webhooks can process payments

## 🔒 Security Reminder

- ✅ **Publishable key** (`pk_test_`) is safe in frontend
- ❌ **Secret key** (`sk_test_`) must stay in backend only
- ✅ Never commit `.env` files to git
- ✅ Use test keys for development, live keys for production

## 🆘 Troubleshooting

**Backend still shows "Stripe not configured":**
- Make sure `backend/.env` file exists
- Check that `STRIPE_SECRET_KEY` line is correct
- Restart the backend server

**Checkout doesn't work:**
- Verify Price IDs are correct in `.env.local`
- Check browser console (F12) for errors
- Make sure products are created in Stripe Dashboard

**"Price ID not found" error:**
- Make sure you created the products in Stripe
- Copy the exact Price ID (starts with `price_`)
- Update `.env.local` with the correct Price IDs

---

**Quick Reference:**
- See `backend/env-template.txt` for the exact `.env` content
- See `SETUP_STRIPE_NOW.md` for step-by-step guide


