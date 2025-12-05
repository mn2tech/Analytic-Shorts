# Get Your Stripe Price ID - Next Steps

## ✅ Step 1: Save the Product

1. After uploading the image, make sure you've filled in:
   - ✅ Name: `Pro Plan`
   - ✅ Description: `For power users and small teams`
   - ✅ Price: `29.00`
   - ✅ Currency: `USD`
   - ✅ Billing: `Monthly` (recurring)
   - ✅ Image: (you just added this)

2. Click **"Save product"** button

## ✅ Step 2: Find the Price ID

After saving, you'll see the product details page. Look for:

1. **Scroll down** to the "Pricing" section
2. You'll see the price you created: `$29.00 / month`
3. **Below or next to the price**, you'll see a **Price ID**
   - It looks like: `price_1ABC123def456ghi789`
   - It starts with `price_`
4. **Click the copy icon** (📋) next to it, or select and copy it

## ✅ Step 3: Add to .env.local

1. Open your `.env.local` file in the project root
2. Add or update this line:
   ```env
   VITE_STRIPE_PRO_PRICE_ID=price_1ABC123def456ghi789
   ```
   (Replace with your actual Price ID)

3. Save the file

## ✅ Step 4: Restart Frontend

```powershell
# Stop frontend (Ctrl+C if running)
# Then restart:
npm run dev
```

## ✅ Step 5: Test It!

1. Go to: `http://localhost:3000/pricing`
2. Click **"Upgrade"** on the Pro plan
3. You should be redirected to Stripe Checkout (not see an error!)
4. The checkout should show "Pro Plan" and "$29.00/month"

## 🎯 What the Price ID Looks Like

The Price ID format:
- Starts with: `price_`
- Followed by: random characters (like `1ABC123def456ghi789`)
- Example: `price_1QwErTyUiOpAsDfGhJkLzXcVbNm`

## ⚠️ Common Mistakes

- ❌ Don't copy the **Product ID** (starts with `prod_`)
- ✅ Copy the **Price ID** (starts with `price_`)
- ❌ Don't include extra spaces
- ✅ Make sure it's on one line in `.env.local`

## 🆘 If You Can't Find the Price ID

1. On the product page, look for a section labeled **"Pricing"**
2. Click on the price itself - it might expand to show the Price ID
3. Or click **"Edit product"** → scroll to pricing section
4. The Price ID is usually shown in small gray text below the price

---

**Once you have the Price ID, paste it here and I'll help you add it to your .env.local file!** 🚀

