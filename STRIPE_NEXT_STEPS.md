# Stripe Setup - Next Steps

## ✅ Completed
- [x] Stripe SDK installed (`stripe@20.0.0`)

## 🔧 Fix Vulnerability (Optional)
The vulnerability warning is likely in a dependency, not Stripe itself. You can:
1. Run `npm audit fix` (already done above)
2. Or ignore for now if it's not critical (Stripe is secure)

## 📋 Next Steps

### Step 1: Create Stripe Account
1. Go to https://stripe.com
2. Sign up for an account
3. Complete business verification (if required)

### Step 2: Get API Keys
1. Go to Stripe Dashboard → **Developers** → **API keys**
2. Make sure you're in **Test mode** (toggle in top right)
3. Copy:
   - **Publishable key** (starts with `pk_test_`) - for frontend
   - **Secret key** (starts with `sk_test_`) - for backend ⚠️ Keep secret!

### Step 3: Create Products in Stripe
1. Go to **Products** in Stripe Dashboard
2. Click **"Add product"**

#### Create Pro Plan:
- **Name:** Pro Plan
- **Description:** For power users and small teams
- **Pricing:** 
  - Price: $29.00
  - Billing period: Monthly (recurring)
- Click **Save**
- **Copy the Price ID** (starts with `price_`) - you'll need this!

#### Create Enterprise Plan:
- **Name:** Enterprise Plan
- **Description:** For teams and organizations
- **Pricing:**
  - Price: $99.00
  - Billing period: Monthly (recurring)
- Click **Save**
- **Copy the Price ID** (starts with `price_`) - you'll need this!

### Step 4: Set Environment Variables

#### Backend `.env` file:
```env
# Add these to backend/.env
STRIPE_SECRET_KEY=sk_test_...your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_... (we'll get this in step 5)
FRONTEND_URL=http://localhost:3000
```

#### Frontend `.env.local` file:
```env
# Add these to .env.local (in root directory)
VITE_STRIPE_PRO_PRICE_ID=price_...your_pro_price_id
VITE_STRIPE_ENTERPRISE_PRICE_ID=price_...your_enterprise_price_id
```

### Step 5: Set Up Webhook (For Production)

**For local testing, you can skip this and test manually.**

For production:
1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Click **"Add endpoint"**
3. Endpoint URL: `https://your-backend-url.com/api/subscription/webhook`
4. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **"Add endpoint"**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add to backend `.env`: `STRIPE_WEBHOOK_SECRET=whsec_...`

### Step 6: Test the Integration

1. **Start your backend:**
   ```bash
   cd backend
   npm start
   ```

2. **Start your frontend:**
   ```bash
   npm run dev
   ```

3. **Test the flow:**
   - Go to http://localhost:3000/pricing
   - Click "Upgrade" on Pro or Enterprise plan
   - Use Stripe test card: `4242 4242 4242 4242`
   - Any future expiry date (e.g., 12/25)
   - Any 3-digit CVC (e.g., 123)
   - Any ZIP code (e.g., 12345)

4. **Verify:**
   - Checkout should redirect to Stripe
   - After payment, you should be redirected back
   - Check Supabase database - subscription should be updated

## 🧪 Test Cards

Stripe provides test cards for different scenarios:

- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **3D Secure:** `4000 0025 0000 3155`
- **Insufficient funds:** `4000 0000 0000 9995`

## ⚠️ Important Notes

1. **Never commit API keys to Git** - use environment variables
2. **Use test mode** during development
3. **Switch to live mode** only when ready for production
4. **Webhook URL** must be HTTPS in production (use ngrok for local testing)

## 🚀 Ready to Test?

Once you've:
1. ✅ Created Stripe account
2. ✅ Got API keys
3. ✅ Created products/prices
4. ✅ Set environment variables

You can test the checkout flow!

Let me know when you're ready and I can help test or implement the next features (usage limits, billing page, etc.).


