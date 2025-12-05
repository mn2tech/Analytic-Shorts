# Fix "Invalid price ID" Error

## 🔍 What This Error Means

The error **"Invalid price ID. Please create the product in Stripe Dashboard first."** occurs when:

1. Your app is trying to use placeholder price IDs (`price_pro_monthly` or `price_enterprise_monthly`)
2. OR the price IDs in your environment variables don't exist in your Stripe account
3. OR the products haven't been created in Stripe Dashboard yet

## ✅ Quick Fix Steps

### For Local Development:

#### Step 1: Create Products in Stripe Dashboard

1. Go to: **https://dashboard.stripe.com/test/products**
2. Make sure you're in **Test mode** (toggle in top right)
3. Click **"+ Add product"**

**Create Pro Plan:**
- **Name:** Pro Plan
- **Description:** For power users and small teams
- **Pricing:**
  - **Price:** $29.00 USD
  - **Billing period:** Monthly (recurring)
- Click **"Save product"**
- **Copy the Price ID** (starts with `price_` like `price_1ABC123...`)

**Create Enterprise Plan:**
- **Name:** Enterprise Plan
- **Description:** For teams and organizations
- **Pricing:**
  - **Price:** $99.00 USD
  - **Billing period:** Monthly (recurring)
- Click **"Save product"**
- **Copy the Price ID** (starts with `price_` like `price_1XYZ789...`)

#### Step 2: Update `.env.local`

Edit `.env.local` in the project root and add/update:

```env
VITE_STRIPE_PRO_PRICE_ID=price_1ABC123...  # Replace with your actual Pro Price ID
VITE_STRIPE_ENTERPRISE_PRICE_ID=price_1XYZ789...  # Replace with your actual Enterprise Price ID
```

**Important:** Use the **actual Price IDs** from Stripe, not placeholders!

#### Step 3: Restart Frontend

```powershell
# Stop the frontend (Ctrl+C)
# Then restart:
npm run dev
```

### For Production (Amplify):

#### Option A: Set in Amplify Console (Recommended)

1. Go to **AWS Amplify Console** → Your App
2. Click **App settings** → **Environment variables**
3. Add these variables:
   - **Key:** `VITE_STRIPE_PRO_PRICE_ID`
     **Value:** `price_1ABC123...` (your actual Pro Price ID)
   - **Key:** `VITE_STRIPE_ENTERPRISE_PRICE_ID`
     **Value:** `price_1XYZ789...` (your actual Enterprise Price ID)
4. Click **Save**
5. **Redeploy** your app (or wait for next deployment)

#### Option B: Update `amplify.yml`

Edit `amplify.yml` and uncomment/add the price IDs:

```yaml
environment:
  VITE_API_URL: https://api.nm2tech-sas.com
  VITE_STRIPE_PRO_PRICE_ID: price_1ABC123...  # Your actual Pro Price ID
  VITE_STRIPE_ENTERPRISE_PRICE_ID: price_1XYZ789...  # Your actual Enterprise Price ID
```

Then commit and push to trigger a new deployment.

## 🧪 Verify It's Fixed

1. **Local:** Go to `http://localhost:3000/pricing` and click "Upgrade" on a plan
2. **Production:** Go to your production URL `/pricing` and click "Upgrade"

You should be redirected to Stripe Checkout instead of seeing an error.

## 🆘 Still Getting the Error?

### Check These:

1. **Are you using Test mode?**
   - Make sure you created products in **Test mode** in Stripe Dashboard
   - Use test Price IDs (they start with `price_`)

2. **Did you restart the server?**
   - Frontend needs to be restarted after changing `.env.local`
   - Backend needs to be restarted after changing `backend/.env`

3. **Are the Price IDs correct?**
   - They must start with `price_`
   - They must exist in your Stripe account
   - Copy them directly from Stripe Dashboard (don't type them manually)

4. **Check browser console:**
   - Press F12 → Console tab
   - Look for error messages
   - Check what price ID is being sent

5. **Check backend logs:**
   - Look at the backend terminal when you click "Upgrade"
   - It will show the exact error message

## 📝 Example `.env.local` File

```env
# Supabase
VITE_SUPABASE_URL=https://ybpzhhzadvarebdclykl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe Price IDs (REQUIRED - get from Stripe Dashboard)
VITE_STRIPE_PRO_PRICE_ID=price_1ABC123def456ghi789  # Replace with real Price ID
VITE_STRIPE_ENTERPRISE_PRICE_ID=price_1XYZ789abc123def456  # Replace with real Price ID

# Backend API
VITE_API_URL=http://localhost:5000
```

## 🔗 Useful Links

- **Stripe Dashboard (Test):** https://dashboard.stripe.com/test/products
- **Stripe Dashboard (Live):** https://dashboard.stripe.com/products
- **Amplify Console:** https://console.aws.amazon.com/amplify

---

**Note:** The backend validation has been improved to catch placeholder values and provide better error messages. Make sure you're using the latest code!



