# 🚀 Switching Stripe to Production Mode

## ⚠️ Important: Before You Switch

**Make sure you've thoroughly tested everything in test mode first!**

### Pre-Production Checklist:
- [ ] All features work in test mode
- [ ] Payment flow works end-to-end
- [ ] Webhooks are configured and tested
- [ ] Products are created and working
- [ ] You've tested with real test cards
- [ ] Your app is ready for real users

---

## 📋 Step-by-Step: Switch to Production

### Step 1: Switch Stripe Dashboard to Production Mode

1. **Go to Stripe Dashboard:** https://dashboard.stripe.com
2. **Toggle to Production Mode:**
   - Look for the toggle in the **top right corner** of the dashboard
   - It will say "Test mode" - click it to switch to **"Live mode"**
   - You may need to complete business verification first

### Step 2: Get Production API Keys

1. **Go to:** https://dashboard.stripe.com/apikeys (while in Live mode)
2. **Copy your Production keys:**
   - **Publishable key** (starts with `pk_live_`) - for frontend
   - **Secret key** (starts with `sk_live_`) - for backend ⚠️ Keep secret!

### Step 3: Create Products in Production Mode

**Important:** Products created in test mode don't automatically exist in production!

1. **Go to:** https://dashboard.stripe.com/products (while in Live mode)
2. **Create Pro Plan:**
   - Click **"+ Add product"**
   - Name: **Pro Plan**
   - Description: For power users and small teams
   - Pricing: **$29.00 USD/month** (recurring)
   - Click **"Save product"**
   - **Copy the Production Price ID** (starts with `price_`)

3. **Create Enterprise Plan:**
   - Click **"+ Add product"**
   - Name: **Enterprise Plan**
   - Description: For teams and organizations
   - Pricing: **$99.00 USD/month** (recurring)
   - Click **"Save product"**
   - **Copy the Production Price ID** (starts with `price_`)

### Step 4: Update Environment Variables

#### Frontend `.env.local` (Project Root):
```env
# Change from pk_test_ to pk_live_
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_PRODUCTION_KEY_HERE

# Update with production Price IDs
VITE_STRIPE_PRO_PRICE_ID=price_YOUR_PRODUCTION_PRO_PRICE_ID
VITE_STRIPE_ENTERPRISE_PRICE_ID=price_YOUR_PRODUCTION_ENTERPRISE_PRICE_ID

# Update API URL to production backend
VITE_API_URL=https://your-production-backend-url.com
```

#### Backend `.env` (Backend Folder):
```env
# Change from sk_test_ to sk_live_
STRIPE_SECRET_KEY=sk_live_YOUR_PRODUCTION_SECRET_KEY_HERE

# Update webhook secret (get from Step 5)
STRIPE_WEBHOOK_SECRET=whsec_YOUR_PRODUCTION_WEBHOOK_SECRET

# Update frontend URL to production
FRONTEND_URL=https://your-production-frontend-url.com
```

### Step 5: Set Up Production Webhook

**Critical:** You need a new webhook endpoint for production!

1. **Go to:** https://dashboard.stripe.com/webhooks (while in Live mode)
2. **Click "+ Add endpoint"**
3. **Enter your production webhook URL:**
   ```
   https://your-production-backend-url.com/api/subscription/webhook
   ```
4. **Select events to listen to:**
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. **Click "Add endpoint"**
6. **Copy the Webhook Signing Secret** (starts with `whsec_`)
7. **Add it to `backend/.env`** as `STRIPE_WEBHOOK_SECRET`

### Step 6: Update Production Environment (AWS Amplify)

If you're using AWS Amplify for deployment:

1. **Go to AWS Amplify Console**
2. **Select your app**
3. **Go to:** App settings → Environment variables
4. **Update these variables:**
   - `VITE_STRIPE_PUBLISHABLE_KEY` → Production key (`pk_live_...`)
   - `VITE_STRIPE_PRO_PRICE_ID` → Production Price ID
   - `VITE_STRIPE_ENTERPRISE_PRICE_ID` → Production Price ID
   - `VITE_API_URL` → Production backend URL
5. **Redeploy your app**

### Step 7: Update Backend Production Environment

If your backend is deployed (e.g., AWS Lambda, EC2, etc.):

1. **Update environment variables:**
   - `STRIPE_SECRET_KEY` → Production key (`sk_live_...`)
   - `STRIPE_WEBHOOK_SECRET` → Production webhook secret
   - `FRONTEND_URL` → Production frontend URL

2. **Restart/redeploy your backend**

---

## ✅ Testing Production Mode

### Test with Real Cards (Small Amounts First!)

1. **Use real test cards** (Stripe provides these):
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - 3D Secure: `4000 0025 0000 3155`

2. **Or use Stripe's test mode** to verify everything works first

3. **Start with small transactions** to verify everything works

---

## 🔄 Switching Back to Test Mode

If you need to switch back to test mode:

1. **Toggle back to Test mode** in Stripe Dashboard
2. **Revert environment variables** to test keys
3. **Redeploy** your applications

**Note:** Test and production are completely separate - customers, products, and data don't mix.

---

## ⚠️ Important Notes

1. **Products are separate:** Products created in test mode don't exist in production (and vice versa)
2. **Keys are different:** Test keys (`pk_test_`, `sk_test_`) won't work in production
3. **Webhooks are separate:** You need separate webhook endpoints for test and production
4. **Data is separate:** Test customers/subscriptions don't appear in production
5. **Business verification:** Stripe may require business verification before enabling live mode

---

## 🎯 Quick Checklist

- [ ] Switched Stripe Dashboard to Live mode
- [ ] Got production API keys (`pk_live_`, `sk_live_`)
- [ ] Created products in production mode
- [ ] Got production Price IDs
- [ ] Updated frontend `.env.local` with production keys
- [ ] Updated backend `.env` with production keys
- [ ] Set up production webhook endpoint
- [ ] Got production webhook secret
- [ ] Updated production environment variables (Amplify, etc.)
- [ ] Tested with real cards (small amounts)
- [ ] Verified webhooks are working

---

## 🆘 Need Help?

If you encounter issues:
1. Check Stripe Dashboard → Logs for errors
2. Verify all environment variables are updated
3. Make sure you're using production keys (not test keys)
4. Verify webhook endpoint is accessible
5. Check backend logs for errors

**You're ready to go live!** 🚀

