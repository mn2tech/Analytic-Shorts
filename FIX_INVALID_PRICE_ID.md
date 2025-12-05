# 🔧 Fix: "Invalid price ID" Error

## ❌ The Problem

The error says "Invalid price ID" and points to test mode, but you're using **production keys**. This means your `.env.local` file either:
1. Doesn't have the production Price IDs
2. Has old test mode Price IDs
3. Hasn't been loaded (frontend server needs restart)

## ✅ Quick Fix

### Step 1: Update `.env.local` (Project Root)

**File location:** `C:\Users\kolaw\Projects\NM2-Analytics-Shorts\.env.local`

**Add or update these lines:**

```env
# Production Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51RilIPCAL4InIKRQlas1xaG2odzZNj70YikLjKe1Jvf8qU2pKtx4HzLLm2Y5NP0FF4tJaf20nA08FOKAXPNB2awU00HXHdOVz8
VITE_STRIPE_PRO_PRICE_ID=price_1Sak7ICAL4InIKRQecSqTjLb
VITE_STRIPE_ENTERPRISE_PRICE_ID=price_1Sb3CtCAL4InIKRQrlhBex3j
```

**Important:**
- Make sure these are the **exact** Price IDs (no extra spaces)
- These are **production** Price IDs (from Live mode in Stripe)
- Keep your existing Supabase and API URL values

### Step 2: Restart Frontend Server

**Vite caches environment variables**, so you **MUST restart** the frontend:

```powershell
# Stop the frontend server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 3: Verify It's Working

1. Open your browser console (F12)
2. Check the Network tab when clicking "Subscribe"
3. The Price ID in the request should be: `price_1Sak7ICAL4InIKRQecSqTjLb` (Pro) or `price_1Sb3CtCAL4InIKRQrlhBex3j` (Enterprise)

---

## 🔍 How to Check Your Current Values

If you want to verify what the frontend is using, you can temporarily add this to your browser console:

```javascript
console.log('Pro Price ID:', import.meta.env.VITE_STRIPE_PRO_PRICE_ID)
console.log('Enterprise Price ID:', import.meta.env.VITE_STRIPE_ENTERPRISE_PRICE_ID)
console.log('Publishable Key:', import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.substring(0, 20) + '...')
```

---

## ✅ Your Production Price IDs

- **Pro Plan:** `price_1Sak7ICAL4InIKRQecSqTjLb`
- **Enterprise Plan:** `price_1Sb3CtCAL4InIKRQrlhBex3j`
- **Publishable Key:** `pk_live_51RilIPCAL4InIKRQlas1xaG2odzZNj70YikLjKe1Jvf8qU2pKtx4HzLLm2Y5NP0FF4tJaf20nA08FOKAXPNB2awU00HXHdOVz8`

---

## 🚨 Common Mistakes

1. **Using test mode Price IDs** - Make sure you're using Price IDs from **Live mode** in Stripe
2. **Not restarting frontend** - Vite caches env vars, restart is required
3. **Typos in Price IDs** - Double-check for extra spaces or missing characters
4. **Wrong file** - Make sure you're editing `.env.local` in the **project root**, not `backend/.env`

---

**After updating `.env.local` and restarting the frontend, the error should be fixed!** 🚀

