# Quick Stripe Setup - 3 Steps

## ✅ Step 1: Get Your Secret Key

You already have the **publishable key**. Now get the **secret key**:

1. Go to: https://dashboard.stripe.com/test/apikeys
2. Find **"Secret key"** (starts with `sk_test_`)
3. Click **"Reveal test key"**
4. Copy it

## ✅ Step 2: Add Secret Key to Backend

Edit `backend/.env` and replace this line:
```
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
```

With your actual secret key:
```
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
```

## ✅ Step 3: Create Products in Stripe

1. Go to: https://dashboard.stripe.com/test/products
2. Click **"+ Add product"**

### Pro Plan ($19/month):
- Name: **Pro Plan**
- Price: **$19.00** USD
- Billing: **Monthly**
- Click **"Save product"**
- **Copy the Price ID** (starts with `price_`)
- Update `.env.local`: `VITE_STRIPE_PRO_PRICE_ID=price_xxxxx`

### Enterprise Plan ($199/month):
- Name: **Enterprise Plan**
- Price: **$199.00** USD
- Billing: **Monthly**
- Click **"Save product"**
- **Copy the Price ID** (starts with `price_`)
- Update `.env.local`: `VITE_STRIPE_ENTERPRISE_PRICE_ID=price_xxxxx`

## 🚀 Done!

Restart your servers:
```powershell
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
npm run dev
```

Then test at: `http://localhost:3000/pricing`

## 🧪 Test Card

Use this test card in Stripe Checkout:
- **Card:** `4242 4242 4242 4242`
- **Expiry:** Any future date (e.g., 12/25)
- **CVC:** Any 3 digits (e.g., 123)
- **ZIP:** Any 5 digits (e.g., 12345)

---

**Need help?** See `STRIPE_SETUP.md` for detailed instructions.




