# ✅ Verify Enterprise Price ID Setup

## Current Configuration

**New Enterprise Price ID:** `price_1ScFgsCAL4InIKRQyL2PJ5Q4`  
**Price:** $49/month (Early Access)

---

## ✅ What's Already Updated

1. ✅ **`amplify.yml`** - Updated with new Price ID
2. ✅ **`src/config/pricing.js`** - Price set to $49, uses environment variable
3. ✅ **`src/pages/Pricing.jsx`** - Shows $49, "Early Access" badge, discount

---

## ⚠️ What You Need to Update

### 1. Frontend `.env.local` (Local Development)

**Update your local environment file:**

1. **Open:** `.env.local` in project root
2. **Find or add:**
   ```env
   VITE_STRIPE_ENTERPRISE_PRICE_ID=price_1ScFgsCAL4InIKRQyL2PJ5Q4
   ```
3. **Save** the file
4. **Restart** frontend:
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

---

### 2. AWS Amplify Console (Production)

**Update environment variable in Amplify:**

1. **Go to:** AWS Amplify Console
2. **Select:** Analytics Shorts app
3. **Go to:** Environment variables
4. **Find or add:** `VITE_STRIPE_ENTERPRISE_PRICE_ID`
5. **Set value to:** `price_1ScFgsCAL4InIKRQyL2PJ5Q4`
6. **Save**

**Note:** `amplify.yml` is already updated, but setting it in Console ensures it's always correct.

---

## 🧪 Test the Setup

### Local Test

1. **Start frontend:**
   ```bash
   npm run dev
   ```

2. **Visit:** `http://localhost:5173/pricing` (or your local URL)

3. **Check Enterprise plan:**
   - Shows **$49/month** ✅
   - Shows "Early Access" badge ✅
   - Shows "50% off" discount ✅

4. **Click "Upgrade" on Enterprise plan**

5. **Check browser console (F12):**
   - Go to Network tab
   - Look for request to `/api/subscription/checkout`
   - Check request payload:
     ```json
     {
       "priceId": "price_1ScFgsCAL4InIKRQyL2PJ5Q4"
     }
     ```

6. **If you see 500 error:**
   - Check backend console for exact error
   - Most likely: Price ID doesn't exist in Stripe yet
   - Or: Stripe mode mismatch (test vs live)

---

### Production Test

1. **Wait** for Amplify build to complete (after updating env var)

2. **Visit:** `https://analytics-shorts.nm2tech-sas.com/pricing`

3. **Check Enterprise plan:**
   - Shows **$49/month** ✅
   - Shows "Early Access" badge ✅

4. **Click "Upgrade" on Enterprise plan**

5. **Should redirect to Stripe checkout with $49.00/month** ✅

---

## 🔍 Troubleshooting 500 Error

**If you still get 500 error:**

### Check 1: Price ID Exists in Stripe

1. **Go to:** Stripe Dashboard → Products
2. **Find:** Enterprise Plan
3. **Verify:** $49/month price exists
4. **Verify:** Price ID is `price_1ScFgsCAL4InIKRQyL2PJ5Q4`

### Check 2: Stripe Mode Match

**Backend `.env` on EC2:**
```env
STRIPE_SECRET_KEY=sk_live_...
```

**Price must be in Live mode** (not Test mode)

### Check 3: Backend Logs

**Check backend console for exact error:**
- "No such price" → Price ID doesn't exist
- "Invalid price ID" → Wrong format
- Other → Check full error message

### Check 4: Frontend Environment Variable

**Verify `.env.local` has:**
```env
VITE_STRIPE_ENTERPRISE_PRICE_ID=price_1ScFgsCAL4InIKRQyL2PJ5Q4
```

**And frontend was restarted after updating.**

---

## 📝 Quick Checklist

- [ ] Updated `.env.local` with new Price ID?
- [ ] Restarted frontend after updating `.env.local`?
- [ ] Updated Amplify Console environment variable?
- [ ] Verified Price ID exists in Stripe Dashboard?
- [ ] Verified Stripe mode matches (live key → live price)?
- [ ] Tested checkout locally?
- [ ] Tested checkout on production?

---

## ✅ Summary

**What's Done:**
- ✅ Code updated (pricing.js, Pricing.jsx, amplify.yml)
- ✅ Price changed to $49/month
- ✅ "Early Access" badge added

**What You Need to Do:**
1. Update `.env.local` with new Price ID
2. Restart frontend
3. Update Amplify Console environment variable (optional but recommended)
4. Test checkout

**If 500 error persists:**
- Check backend logs for exact error
- Verify Price ID in Stripe Dashboard
- Verify Stripe mode matches

---

**The Price ID is confirmed: `price_1ScFgsCAL4InIKRQyL2PJ5Q4`** ✅

Make sure it's in your `.env.local` and restart the frontend!

