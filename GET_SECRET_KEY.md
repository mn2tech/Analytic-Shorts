# 🔑 How to Get Your Complete Stripe Secret Key

## Option 1: Click on the Key Value
1. Click directly on the truncated key text: `sk_live_...wQGi`
2. It might expand to show the full key

## Option 2: Use "Edit key"
1. Click the **"..."** (ellipsis) button
2. Select **"Edit key"**
3. The full key might be visible in the edit dialog

## Option 3: Create a New Secret Key (Recommended)
If you can't reveal the existing key, create a new one:

1. In Stripe Dashboard → **API keys** (Live mode)
2. Click **"+ Create secret key"** (top right)
3. Give it a name (e.g., "Production Key")
4. Click **"Create secret key"**
5. **⚠️ IMPORTANT:** Copy the key immediately - you can only see it once!
6. Paste it somewhere safe
7. Update your `backend/.env` with this new key

**Note:** After creating a new key, you can optionally delete the old one if you're not using it.

---

## Once You Have the Key

The complete secret key should look like:
```
sk_live_51RilIPCAL4InIKRQ...very_long_string...wQGi
```

It should be **~100+ characters long** (not truncated).

---

**Try clicking on the key value first, or use "Edit key". If that doesn't work, creating a new key is the safest option!** 🔐

