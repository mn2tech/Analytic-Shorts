# Create Enterprise Product in Stripe - Step by Step Guide

## 🎯 Goal
Create an "Enterprise Plan" product in Stripe with $99/month recurring pricing and get the Price ID.

## 📋 Step-by-Step Instructions

### Step 1: Go to Stripe Dashboard

1. Open your browser and go to: **https://dashboard.stripe.com/test/products**
2. **Log in** to your Stripe account
3. Make sure you're in **Test mode** (toggle in top right should say "Test mode")

### Step 2: Create New Product

1. Click the **"+ Add product"** button (usually at the top right)

### Step 3: Fill in Product Details

**Product Information:**
- **Name:** `Enterprise Plan`
- **Description:** `For teams and organizations`
- **Images:** (Optional - you can skip this or use the same icon as Pro plan)

**Pricing:**
- **Pricing model:** Select **"Standard pricing"**
- **Price:** Enter `99.00`
- **Currency:** Select `USD` (United States Dollar)
- **Billing period:** Select **"Monthly"** (recurring)
- **Price description:** (Optional) `Monthly subscription`

**Advanced options:** (You can skip these for now)

### Step 4: Save the Product

1. Click the **"Save product"** button
2. The product will be created and you'll see the product details page

### Step 5: Copy the Price ID

1. On the product page, scroll to the **"Pricing"** section
2. You'll see the price you just created: `$99.00 / month`
3. **Click on the price row** or the **ellipsis (⋯)** icon
4. Look for the **Price ID** - it will look like: `price_1ABC123def456ghi789`
5. **Click the copy icon** (📋) next to the Price ID
6. **IMPORTANT:** Save this Price ID - you'll need it!

### Step 6: Add Price ID to Your Project

1. Open your `.env.local` file in the project root
2. Add or update this line:
   ```env
   VITE_STRIPE_ENTERPRISE_PRICE_ID=price_1ABC123def456ghi789
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
2. Click **"Upgrade"** on the Enterprise plan
3. You should be redirected to Stripe Checkout (not see an error)
4. The checkout page should show "Enterprise Plan" and "$99.00/month"

## 📝 Quick Checklist

- [ ] Created "Enterprise Plan" product in Stripe
- [ ] Set price to $99.00/month
- [ ] Copied the Price ID (starts with `price_`)
- [ ] Added Price ID to `.env.local`
- [ ] Restarted frontend
- [ ] Tested checkout

## 🎨 Optional: Add Product Image

If you want to add an image:

1. Go back to your product in Stripe Dashboard
2. Click **"Edit product"**
3. Scroll to **"Product images"**
4. Upload an image (recommended: 400x400px, square)
5. Click **"Save product"**

You can use the same icon as Pro plan or create a different one.

## 📋 Example .env.local File

Your `.env.local` should look like this:

```env
# Supabase
VITE_SUPABASE_URL=https://ybpzhhzadvarebdclykl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe Price IDs
VITE_STRIPE_PRO_PRICE_ID=price_1SaksqCAL4InIKRQchmjIT9U
VITE_STRIPE_ENTERPRISE_PRICE_ID=price_xxxxx  # Your Enterprise Price ID here

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
- Click on the price row to expand and see the Price ID

### Test Mode vs Live Mode
- **Test mode:** Use for development/testing
- **Live mode:** Use for production (real payments)
- Make sure your Stripe keys match the mode you're in!

## 🔄 Next Steps

After creating the Enterprise product:
1. ✅ Test the Enterprise checkout
2. ✅ Verify both plans work
3. ✅ Ready for production!

---

**Quick Link:** https://dashboard.stripe.com/test/products

Good luck! 🚀

