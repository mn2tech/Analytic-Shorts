# ✅ Verify and Fix Live Mode Setup

## ✅ Backend Configuration Confirmed

**Your backend is using:**
- ✅ **Stripe Key:** `sk_live_...` (Live mode)
- ✅ **Supabase:** Configured
- ✅ **CORS:** Configured

**This means the Price ID must be in LIVE mode in Stripe Dashboard.**

---

## 🔍 Step 1: Verify Price ID is in Live Mode

**In Stripe Dashboard:**

1. **Go to:** https://dashboard.stripe.com/products
2. **Check top right corner:**
   - Should show **"Live mode"** (not "Test mode")
   - If it shows "Test mode", click to toggle to **"Live mode"**

3. **Find:** "Enterprise Plan" product
4. **Click** on it
5. **Verify:** Price `price_1ScFgsCAL4InIKRQyL2PJ5Q4` exists
6. **Verify:** Shows $49.00/month

**If the Price ID doesn't exist in Live mode:**
- You need to create it in Live mode
- Or the Price ID you're seeing is from Test mode

---

## 🔍 Step 2: Check if Backend Picked Up Environment Variables

**On EC2, restart PM2 to ensure it picks up the latest `.env`:**

```bash
# SSH to EC2
ssh your-ec2-instance

# Restart PM2 with environment update
pm2 restart analytics-api --update-env

# Check logs to verify
pm2 logs analytics-api --lines 20
```

**This ensures PM2 reloads the `.env` file.**

---

## 🔍 Step 3: Verify Frontend is Using Correct Price ID

**Check your local `.env.local`:**

```env
VITE_STRIPE_ENTERPRISE_PRICE_ID=price_1ScFgsCAL4InIKRQyL2PJ5Q4
```

**Then restart frontend:**
```bash
# Stop (Ctrl+C)
npm run dev
```

---

## 🔍 Step 4: Test the Checkout

**After verifying everything:**

1. **Visit:** `http://localhost:3003/pricing` (or your local URL)
2. **Click:** "Upgrade" on Enterprise plan
3. **Check browser console (F12):**
   - Go to Network tab
   - Find request to `/api/subscription/checkout`
   - Check if it succeeds or shows error

4. **Check backend logs:**
   - On EC2: `pm2 logs analytics-api --lines 50`
   - Look for the exact error message

---

## 🚨 Most Likely Issue

**Since backend uses Live mode, the Price ID must be in Live mode too.**

**If you see the Price ID in Stripe Dashboard but it's in Test mode:**
- That's the problem!
- You need to create the price in **Live mode**

**To create in Live mode:**
1. **Toggle Stripe Dashboard to Live mode** (top right)
2. **Go to:** Products → Enterprise Plan
3. **Click:** "Add another price"
4. **Set:** $49.00/month
5. **Copy** the new Price ID (will be different from test mode)
6. **Update** `.env.local` with the new Live mode Price ID

---

## ✅ Quick Fix Checklist

1. ✅ **Verify Stripe Dashboard is in Live mode** (top right)
2. ✅ **Verify Price ID exists in Live mode**
3. ✅ **If not, create it in Live mode and get new Price ID**
4. ✅ **Update `.env.local` with Live mode Price ID**
5. ✅ **Restart frontend**
6. ✅ **Restart backend:** `pm2 restart analytics-api --update-env`
7. ✅ **Test checkout**

---

## 📝 What to Check Right Now

**Please verify:**

1. **In Stripe Dashboard:**
   - Is the toggle showing **"Live mode"** (not "Test mode")?
   - When in Live mode, does Price ID `price_1ScFgsCAL4InIKRQyL2PJ5Q4` exist?

2. **If Price ID doesn't exist in Live mode:**
   - Create it in Live mode
   - Copy the new Price ID
   - Update `.env.local`

3. **Restart backend:**
   ```bash
   pm2 restart analytics-api --update-env
   ```

---

**Your backend is in Live mode, so the Price ID must be in Live mode too!** 🔍

Check if the Price ID exists in Live mode in Stripe Dashboard. If not, create it there and update your `.env.local` with the new Live mode Price ID.

