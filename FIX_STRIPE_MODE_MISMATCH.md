# 🔧 Fix Stripe Mode Mismatch

## ✅ Price ID Confirmed in Stripe

**Your Price ID exists:**
- ✅ Price ID: `price_1ScFgsCAL4InIKRQyL2PJ5Q4`
- ✅ Price: $49.00/month
- ✅ Product: Enterprise Plan
- ✅ Status: Active

**Since the Price ID exists, the 500 error is likely a mode mismatch or backend issue.**

---

## 🔍 Step 1: Check Stripe Mode

**The Price ID must be in the SAME mode as your backend Stripe key.**

### Check What Mode the Price Is In

**In Stripe Dashboard:**
1. **Look at the top right corner**
2. **See the toggle:** "Test mode" or "Live mode"
3. **Note which mode you're in**

**The Price ID `price_1ScFgsCAL4InIKRQyL2PJ5Q4` is in:**
- ✅ **Live mode** if toggle shows "Live mode"
- ✅ **Test mode** if toggle shows "Test mode"

---

## 🔍 Step 2: Check Backend Stripe Key Mode

**Your backend must use a key in the SAME mode.**

### On EC2 (Production Backend)

**Check the Stripe key:**
```bash
# SSH to EC2
ssh your-ec2-instance

# Check backend .env
cat backend/.env | grep STRIPE_SECRET_KEY
```

**The key will show:**
- `sk_live_...` = **Live mode**
- `sk_test_...` = **Test mode**

### They Must Match!

- ✅ Backend: `sk_live_...` + Price: **Live mode** = Works
- ✅ Backend: `sk_test_...` + Price: **Test mode** = Works
- ❌ Backend: `sk_live_...` + Price: **Test mode** = 500 Error
- ❌ Backend: `sk_test_...` + Price: **Live mode** = 500 Error

---

## 🔍 Step 3: Check Backend Logs

**The backend will show the exact error:**

**On EC2:**
```bash
pm2 logs analytics-api --lines 50
```

**Or check backend console if running locally.**

**Look for errors like:**
- `No such price: 'price_1ScFgsCAL4InIKRQyL2PJ5Q4'` → Mode mismatch
- `Invalid API key` → Wrong key
- `Stripe not configured` → Missing key

---

## ✅ Step 4: Fix Mode Mismatch

### Option A: Use Live Mode (Production)

**If you want to use Live mode (recommended for production):**

1. **In Stripe Dashboard:**
   - Toggle to **Live mode** (top right)
   - Verify Price ID `price_1ScFgsCAL4InIKRQyL2PJ5Q4` exists in Live mode
   - If not, create it in Live mode

2. **On EC2 backend:**
   - Make sure `.env` has: `STRIPE_SECRET_KEY=sk_live_...`
   - Restart backend: `pm2 restart analytics-api --update-env`

### Option B: Use Test Mode (Development)

**If you're testing locally:**

1. **In Stripe Dashboard:**
   - Toggle to **Test mode** (top right)
   - Create a test price for Enterprise Plan ($49/month)
   - Copy the test Price ID (will be different)

2. **In local backend `.env`:**
   - Use: `STRIPE_SECRET_KEY=sk_test_...`

3. **In local frontend `.env.local`:**
   - Use the test Price ID

---

## 🔍 Step 5: Verify Frontend is Sending Correct Price ID

**Check what the frontend is actually sending:**

1. **Open browser DevTools (F12)**
2. **Go to Network tab**
3. **Click "Upgrade" on Enterprise plan**
4. **Find request to `/api/subscription/checkout`**
5. **Check Payload:**
   ```json
   {
     "priceId": "price_1ScFgsCAL4InIKRQyL2PJ5Q4"
   }
   ```

**If it's correct, the issue is backend/Stripe mode.**

---

## 🚀 Quick Fix Checklist

**Do these in order:**

1. ✅ **Check Stripe Dashboard mode** (Live or Test?)
2. ✅ **Check backend Stripe key mode** (`sk_live_...` or `sk_test_...`?)
3. ✅ **Verify they match** (both Live or both Test)
4. ✅ **Check backend logs** for exact error
5. ✅ **Restart backend** if you changed anything: `pm2 restart analytics-api --update-env`
6. ✅ **Test checkout again**

---

## 📝 Most Likely Issue

**Since Price ID exists, it's probably:**

1. **Mode mismatch (80% likely)**
   - Backend uses Live key but Price is in Test mode
   - Or vice versa
   - **Fix:** Make sure they match

2. **Backend not restarted (15% likely)**
   - Changed `.env` but didn't restart
   - **Fix:** `pm2 restart analytics-api --update-env`

3. **Frontend cache (5% likely)**
   - Browser cached old Price ID
   - **Fix:** Hard refresh (Ctrl+Shift+R)

---

## 🎯 Action Items

**Right now, please:**

1. **Check Stripe Dashboard mode** (top right - Live or Test?)
2. **Check backend Stripe key** (on EC2 - `sk_live_...` or `sk_test_...`?)
3. **Verify they match**
4. **Check backend logs** for the exact error message
5. **Share the error message** so I can help fix it

---

**The Price ID exists, so it's definitely a mode mismatch or backend configuration issue!** 🔍

Check the Stripe mode and backend key mode - they must match!

