# How to Find Your Price ID in Stripe

## ⚠️ Important: Product ID vs Price ID

- **Product ID** (what you have): `prod_TXpmlsPYbZGJAU` ❌
- **Price ID** (what we need): `price_xxxxx` ✅

## 🔍 Where to Find the Price ID

### Method 1: Product Details Page

1. You're on the product page for "Pro Plan"
2. **Scroll down** to find the **"Pricing"** section
3. You should see:
   ```
   Pricing
   $29.00 / month
   [Price ID: price_xxxxx] ← This is what you need!
   ```
4. The Price ID is usually shown in **small gray text** below or next to the price
5. Click the **copy icon** (📋) next to it

### Method 2: Edit the Product

1. Click **"Edit product"** button
2. Scroll to the **"Pricing"** section
3. You'll see the price you created: `$29.00 / month`
4. **Click on the price** or look below it
5. The Price ID should be visible there

### Method 3: API Response (Advanced)

If you're comfortable with browser dev tools:
1. Open browser DevTools (F12)
2. Go to Network tab
3. Refresh the product page
4. Look for API calls to Stripe
5. The Price ID will be in the response

## 📸 What It Looks Like

On the Stripe product page, you'll see something like:

```
Product: Pro Plan
Description: For power users and small teams

Pricing:
┌─────────────────────────────┐
│ $29.00 / month              │
│ Price ID: price_1ABC...     │ ← Copy this!
│ [📋 Copy]                    │
└─────────────────────────────┘
```

## 🎯 Quick Steps

1. **Stay on the product page** (where you see `prod_TXpmlsPYbZGJAU`)
2. **Look for the pricing section** (usually below the product details)
3. **Find the Price ID** (starts with `price_`)
4. **Copy it** and share it with me!

## 💡 Tip

The Price ID is usually:
- Below the price amount
- In smaller, gray text
- Has a copy icon next to it
- Much longer than the Product ID

---

**Once you find the Price ID (starts with `price_`), paste it here!** 🚀

