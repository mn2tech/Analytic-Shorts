# Get Price ID - Click the Price Row

## 🎯 What to Do Now

I can see your Stripe product page! The Price ID is there, but you need to click to reveal it.

### Step 1: Click the Price Row

In the **Pricing** section, you'll see a row with:
- "$29.00 USD"
- "Default" badge
- "0 active"
- "Dec 4"
- Ellipsis icon (⋯)

**Click directly on that entire row** (the "$29.00 USD" row).

### Step 2: Price Details Will Open

When you click the row, it will either:
- Expand to show details, OR
- Open a modal/drawer with price information

### Step 3: Find the Price ID

Look for:
- **"Price ID"** label
- A value starting with `price_`
- It will look like: `price_1ABC123def456ghi789`
- There should be a **copy icon (📋)** next to it

### Step 4: Copy the Price ID

Click the copy icon or select and copy the Price ID.

## 🔄 Alternative: Click the Ellipsis

If clicking the row doesn't work:

1. Click the **ellipsis icon (⋯)** at the end of the price row
2. A dropdown menu will appear
3. Look for options like:
   - "View price"
   - "Edit price"
   - "Copy Price ID"
4. Click one of those options
5. The Price ID will be visible

## 📋 What You're Looking For

The Price ID will:
- Start with `price_` (not `prod_`)
- Be much longer than the Product ID
- Look something like: `price_1Sak7ICAL4InIKRQecSqTjLb`
- Have a copy button next to it

## ✅ Once You Have It

1. **Copy the Price ID**
2. **Share it here** and I'll update your `.env.local`
3. **Or update it yourself** in `.env.local`
4. **Restart frontend**: `npm run dev`

---

**Click on the "$29.00 USD" row in the Pricing section!** 🖱️

