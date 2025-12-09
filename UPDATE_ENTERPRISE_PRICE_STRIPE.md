# 💰 Update Enterprise Plan Price in Stripe

## ✅ Frontend Updated

**The frontend has been updated:**
- ✅ Enterprise price changed from **$99/month** to **$49/month**
- ✅ Added "Early Access" badge
- ✅ Added "50% off" discount display
- ✅ Updated description to include "(Early Access)"

---

## 🔧 Update Stripe Product Price

**You need to update the price in Stripe Dashboard:**

### Option 1: Create New Price (Recommended)

**This is the cleanest approach:**

1. **Go to:** Stripe Dashboard → Products
2. **Find:** "Enterprise Plan" product
3. **Click** on the product
4. **Click:** "Add another price"
5. **Configure:**
   - **Price:** `$49.00`
   - **Billing period:** `Monthly`
   - **Currency:** `USD`
6. **Click:** "Add price"
7. **Copy** the new Price ID (starts with `price_`)
8. **Update** environment variable:
   - Frontend: `VITE_STRIPE_ENTERPRISE_PRICE_ID` in `.env.local`
   - Amplify: `VITE_STRIPE_ENTERPRISE_PRICE_ID` in Environment variables
9. **Archive** the old $99 price (optional):
   - Click on the old price
   - Click "Archive price"

---

### Option 2: Update Existing Price

**If you want to keep the same Price ID:**

1. **Go to:** Stripe Dashboard → Products
2. **Find:** "Enterprise Plan" product
3. **Click** on the product
4. **Find** the existing price (should be $99/month)
5. **Note:** Stripe doesn't allow editing prices directly
6. **You must:**
   - Create a new price ($49/month)
   - Archive the old price ($99/month)
   - Update the Price ID in your environment variables

**Stripe doesn't allow editing prices - you must create a new one.**

---

## ✅ Update Environment Variables

### Frontend (.env.local)

```env
VITE_STRIPE_ENTERPRISE_PRICE_ID=price_[NEW_PRICE_ID_HERE]
```

**Then restart the frontend:**
```bash
npm run dev
```

### AWS Amplify

1. **Go to:** AWS Amplify Console
2. **Select:** Analytics Shorts app
3. **Go to:** Environment variables
4. **Find:** `VITE_STRIPE_ENTERPRISE_PRICE_ID`
5. **Update** value to the new Price ID
6. **Save**
7. **Trigger** a new build (or wait for next deployment)

---

## ✅ Update Backend (If Needed)

**The backend doesn't need changes** - it uses the Price ID from the frontend request.

**However, if you want to verify:**
- Check `backend/routes/subscription.js` - it should accept any valid Price ID
- No hardcoded price validation needed

---

## 🧪 Test the Update

1. **Visit:** `https://analytics-shorts.nm2tech-sas.com/pricing`
2. **Check:** Enterprise plan shows **$49/month**
3. **Check:** "Early Access" badge is visible
4. **Check:** "50% off" discount is shown
5. **Click:** "Upgrade" on Enterprise plan
6. **Verify:** Stripe checkout shows **$49.00/month**

---

## 📝 Summary

**What Changed:**
- ✅ Frontend: Price updated to $49/month
- ✅ Frontend: Added "Early Access" badge
- ✅ Frontend: Added discount display
- ⚠️ **Stripe:** You need to create new $49 price
- ⚠️ **Environment:** Update Price ID in `.env.local` and Amplify

**Next Steps:**
1. Create new $49 price in Stripe
2. Update `VITE_STRIPE_ENTERPRISE_PRICE_ID` in `.env.local`
3. Update `VITE_STRIPE_ENTERPRISE_PRICE_ID` in Amplify
4. Test the checkout flow

---

**The frontend is ready! Just update Stripe and environment variables.** ✅

