# 🔍 Debug 500 Error - Step by Step

## ❌ You're Still Getting: "Request failed with status code 500"

**Let's find the exact cause step by step.**

---

## ✅ Step 1: Check Backend Console/Logs

**This is the MOST IMPORTANT step!**

1. **Find** your backend terminal/console
2. **Look for** error messages when you click "Upgrade" on Enterprise plan
3. **The error will show:**
   - Exact Stripe error message
   - Price ID that was received
   - What went wrong

**Common errors you might see:**
- `No such price: 'price_1ScFgsCAL4InIKRQyL2PJ5Q4'`
- `Invalid price ID format`
- `Stripe not configured`
- `Database not configured`

**Copy the exact error message and share it!**

---

## ✅ Step 2: Verify Price ID in Stripe Dashboard

**Make sure the Price ID actually exists:**

1. **Go to:** https://dashboard.stripe.com/products
2. **Make sure** you're in **Live mode** (toggle in top right)
3. **Find:** "Enterprise Plan" product
4. **Click** on the product
5. **Find** the price that shows **$49.00/month**
6. **Click** on the price row to expand it
7. **Verify** the Price ID is: `price_1ScFgsCAL4InIKRQyL2PJ5Q4`

**If it's different:**
- Copy the actual Price ID
- Update your `.env.local` with the correct one

**If the price doesn't exist:**
- Create it in Stripe Dashboard
- Copy the new Price ID
- Update your `.env.local`

---

## ✅ Step 3: Check Stripe Mode Match

**Backend and Price ID must be in the same mode:**

1. **Check backend `.env` on EC2:**
   ```bash
   # SSH to EC2 and check:
   cat backend/.env | grep STRIPE_SECRET_KEY
   ```

2. **Verify:**
   - If backend has `sk_live_...` → Price must be in **Live mode**
   - If backend has `sk_test_...` → Price must be in **Test mode**

3. **In Stripe Dashboard:**
   - Check the mode toggle (top right)
   - Make sure it matches your backend key

**They MUST match!**

---

## ✅ Step 4: Verify Frontend is Sending Correct Price ID

**Check what the frontend is actually sending:**

1. **Open** browser DevTools (F12)
2. **Go to** Network tab
3. **Clear** network log
4. **Click** "Upgrade" on Enterprise plan
5. **Find** the request to `/api/subscription/checkout`
6. **Click** on it
7. **Go to** Payload tab
8. **Check** the `priceId` value:
   ```json
   {
     "priceId": "price_1ScFgsCAL4InIKRQyL2PJ5Q4"
   }
   ```

**If it shows the old Price ID or wrong value:**
- `.env.local` not updated
- Frontend not restarted
- Browser cache issue

**Fix:**
1. Update `.env.local`
2. Restart frontend
3. Hard refresh browser (Ctrl+Shift+R)

---

## ✅ Step 5: Test Backend Directly

**Test if backend can access Stripe:**

1. **Check** if backend is running:
   ```bash
   # On EC2:
   pm2 list
   # Should show analytics-api as "online"
   ```

2. **Check** backend logs:
   ```bash
   pm2 logs analytics-api --lines 50
   ```

3. **Look for** any Stripe-related errors

---

## ✅ Step 6: Quick Fixes to Try

### Fix 1: Restart Everything

1. **Restart frontend:**
   ```bash
   # Stop (Ctrl+C)
   npm run dev
   ```

2. **Restart backend** (if on EC2):
   ```bash
   pm2 restart analytics-api --update-env
   ```

3. **Clear browser cache:**
   - Hard refresh: `Ctrl+Shift+R`
   - Or clear cache: `Ctrl+Shift+Delete`

### Fix 2: Verify Environment Variables

**Frontend `.env.local`:**
```env
VITE_STRIPE_ENTERPRISE_PRICE_ID=price_1ScFgsCAL4InIKRQyL2PJ5Q4
```

**Backend `.env` on EC2:**
```env
STRIPE_SECRET_KEY=sk_live_...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Fix 3: Test with Pro Plan First

**Try upgrading to Pro plan:**
- If Pro works → Issue is specific to Enterprise Price ID
- If Pro also fails → Issue is with Stripe configuration

---

## 🔍 Most Likely Causes

### Cause 1: Price ID Doesn't Exist (80% likely)
**Solution:**
- Verify in Stripe Dashboard
- Make sure you're in the correct mode (Live/Test)
- Create the price if it doesn't exist

### Cause 2: Stripe Mode Mismatch (15% likely)
**Solution:**
- Backend uses `sk_live_...` but Price is in Test mode
- Or vice versa
- Make sure they match

### Cause 3: Frontend Not Updated (5% likely)
**Solution:**
- Update `.env.local`
- Restart frontend
- Clear browser cache

---

## 📝 What I Need From You

**To help debug, please share:**

1. **Backend error message** (from backend console)
   - This is the most important!

2. **Price ID in Stripe Dashboard**
   - Does it match `price_1ScFgsCAL4InIKRQyL2PJ5Q4`?

3. **Stripe mode** (Live or Test)
   - What mode is your backend key in?

4. **Frontend Network request**
   - What Price ID is being sent in the request?

---

## 🚀 Quick Action Items

**Do these in order:**

1. ✅ **Check backend console** - Copy the exact error
2. ✅ **Verify Price ID in Stripe** - Does it exist?
3. ✅ **Check Stripe mode** - Does it match backend?
4. ✅ **Update `.env.local`** - Is it correct?
5. ✅ **Restart frontend** - Did you restart?
6. ✅ **Clear browser cache** - Hard refresh?

---

**The backend console will tell us exactly what's wrong!** 🔍

Please check your backend console/terminal and share the error message you see when clicking "Upgrade" on Enterprise plan.

