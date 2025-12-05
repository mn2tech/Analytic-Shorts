# Create Pro Product in Stripe - Step by Step Guide

## 🎯 Goal
Create a "Pro Plan" product in Stripe with $29/month recurring pricing and get the Price ID.

## 📋 Step-by-Step Instructions

### Step 1: Go to Stripe Dashboard

1. Open your browser and go to: **https://dashboard.stripe.com**
2. **Log in** to your Stripe account
3. Make sure you're in **Test mode** (toggle in top right should say "Test mode")
   - For testing, use Test mode
   - For production, switch to Live mode later

### Step 2: Navigate to Products

1. In the left sidebar, click **"Products"**
2. You should see a list of products (or empty if you haven't created any)
3. Click the **"+ Add product"** button (usually at the top right)

### Step 3: Create the Product

Fill in the product details:

**Product Information:**
- **Name:** `Pro Plan`
- **Description:** `For power users and small teams`
- **Images:** (Optional - you can skip this or add later)

**Pricing:**
- **Pricing model:** Select **"Standard pricing"**
- **Price:** Enter `29.00`
- **Currency:** Select `USD` (United States Dollar)
- **Billing period:** Select **"Monthly"** (recurring)
- **Price description:** (Optional) `Monthly subscription`

**Advanced options:** (You can skip these for now)
- Trial period: Leave empty
- Tax behavior: Default is fine

### Step 4: Save the Product

1. Click the **"Save product"** button (usually at the bottom)
2. The product will be created and you'll see the product details page

### Step 5: Copy the Price ID

1. On the product page, you'll see a section showing the price you just created
2. Look for the **Price ID** - it will look like: `price_1ABC123def456ghi789`
3. **Click the copy icon** next to the Price ID (or select and copy it)
4. **IMPORTANT:** Save this Price ID somewhere safe - you'll need it!

### Step 6: Add Price ID to Your Project

1. Open your `.env.local` file in the project root
2. Add or update this line:
   ```env
   VITE_STRIPE_PRO_PRICE_ID=price_1ABC123def456ghi789
   ```
   (Replace `price_1ABC123def456ghi789` with your actual Price ID)

3. Save the file

### Step 7: Restart Your Frontend

After updating `.env.local`, restart your frontend server:

```powershell
# Stop the frontend (Ctrl+C if running)
# Then restart:
npm run dev
```

## ✅ Verification

To verify it's working:

1. Go to your app: `http://localhost:3000/pricing`
2. Click **"Upgrade"** on the Pro plan
3. You should be redirected to Stripe Checkout (not see an error)
4. The checkout page should show "Pro Plan" and "$29.00/month"

## 🎨 Optional: Add Product Image

If you want to add an image to the Stripe product:

1. Go back to your product in Stripe Dashboard
2. Click **"Edit product"**
3. Scroll to **"Product images"**
4. Upload an image (recommended: 400x400px, square)
5. Click **"Save product"**

**Note:** This is different from the checkout image we set up earlier. This image appears in Stripe's product catalog.

## 📝 Example .env.local File

Your `.env.local` should look something like this:

```env
# Supabase
VITE_SUPABASE_URL=https://ybpzhhzadvarebdclykl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe Price IDs
VITE_STRIPE_PRO_PRICE_ID=price_1ABC123def456ghi789  # Your actual Pro Price ID
VITE_STRIPE_ENTERPRISE_PRICE_ID=price_xxxxx  # You'll create this next

# Backend API
VITE_API_URL=http://localhost:5000
```

## 🆘 Troubleshooting

### "Invalid price ID" Error
- Make sure you copied the **Price ID** (starts with `price_`), not the Product ID
- Check that there are no extra spaces in `.env.local`
- Restart your frontend after updating `.env.local`

### Can't Find Price ID
- On the product page, look for a section labeled "Pricing"
- The Price ID is usually shown below the price amount
- It's a long string starting with `price_`

### Test Mode vs Live Mode
- **Test mode:** Use for development/testing
- **Live mode:** Use for production (real payments)
- Make sure your Stripe keys match the mode you're in!

## 🔄 Next Steps

After creating the Pro product, you'll also want to:
1. Create the **Enterprise Plan** product ($99/month)
2. Add that Price ID to `.env.local` as `VITE_STRIPE_ENTERPRISE_PRICE_ID`

## 📸 Visual Guide

**Stripe Dashboard Navigation:**
```
Stripe Dashboard
├── Products (click here)
│   └── + Add product (click here)
│       ├── Name: Pro Plan
│       ├── Description: For power users and small teams
│       ├── Price: 29.00
│       ├── Currency: USD
│       ├── Billing: Monthly
│       └── Save product
│
└── Copy Price ID (starts with price_)
```

---

**Quick Link:** https://dashboard.stripe.com/test/products

Good luck! 🚀

