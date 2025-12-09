# 🔍 Get Backend Error Details

## ✅ Frontend Error Handling Improved

**I've updated the error handling to show more details. Now try again and you'll see more information.**

---

## 🔍 Step 1: Check Browser Console for Full Error

**The browser console now logs more details:**

1. **Open** browser DevTools (F12)
2. **Go to** Console tab
3. **Look for:**
   - `Error creating checkout session:` - Shows the error object
   - `Full error response:` - Shows the backend response with details

**The error response should show:**
- `error.response.data.message` - Backend error message
- `error.response.data.error` - Error type
- `error.response.data.priceId` - Price ID that was used
- `error.response.data.details` - Additional details (if in development)

---

## 🔍 Step 2: Check Backend Console (MOST IMPORTANT)

**The backend console will show the EXACT Stripe error:**

1. **Find** the terminal/console where your backend is running
2. **Look for** error messages when you click "Upgrade"
3. **You should see:**
   ```
   === CHECKOUT ERROR ===
   Error type: StripeInvalidRequestError
   Error message: No such price: 'price_1ScFgsCAL4InIKRQyL2PJ5Q4'
   Price ID received: price_1ScFgsCAL4InIKRQyL2PJ5Q4
   Stripe key configured: true
   Supabase configured: true
   ====================
   ```

**This will tell you EXACTLY what's wrong!**

---

## 🔍 Step 3: Common Errors and Fixes

### Error: "No such price"

**This means:**
- Price ID doesn't exist in Stripe
- Or Price ID is in wrong mode (Test vs Live)

**Fix:**
1. Check Stripe Dashboard mode (Live or Test?)
2. Verify Price ID exists in that mode
3. If not, create it in the correct mode

### Error: "Invalid API key"

**This means:**
- Stripe key is wrong or expired
- Or key mode doesn't match price mode

**Fix:**
1. Check backend `.env` has correct `STRIPE_SECRET_KEY`
2. Verify key mode matches price mode

### Error: "Stripe not configured"

**This means:**
- Missing `STRIPE_SECRET_KEY` in backend `.env`

**Fix:**
1. Add `STRIPE_SECRET_KEY=sk_live_...` to `backend/.env`
2. Restart backend

---

## 🚀 Quick Steps

1. ✅ **Try checkout again** - The alert will now show more details
2. ✅ **Check browser console** - Look for "Full error response"
3. ✅ **Check backend console** - This has the EXACT error
4. ✅ **Share the backend error message** - So I can help fix it

---

## 📝 What to Share

**Please share:**

1. **Backend console error** (the most important!)
   - Look for "=== CHECKOUT ERROR ===" section
   - Copy the entire error message

2. **Browser console error response** (if available)
   - Look for "Full error response:" log
   - Copy the error object

3. **Alert message** (what you see in the popup)
   - Should now show more details

---

**The backend console has the exact error! Check it and share what you see.** 🔍

The backend logs will show exactly what Stripe is complaining about.

