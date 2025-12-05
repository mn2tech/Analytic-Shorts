# 🔍 How to Check Backend Error Logs

## ❌ You're Still Getting 500 Error

The frontend shows "Request failed with status code 500", which means the backend is returning an error. 

**The backend terminal will show the exact error!**

---

## 📋 Step-by-Step: Find the Error

### Step 1: Find Your Backend Terminal

**Look for the terminal window where you ran:**
```powershell
cd backend
node server.js
```

This is where the error logs will appear.

---

### Step 2: Try Checkout Again

1. Go to your frontend: `http://192.168.1.151:3003`
2. Click "Subscribe" on a plan
3. **Immediately look at your backend terminal**

---

### Step 3: Look for Error Output

After clicking "Subscribe", you should see in your backend terminal:

```
=== CHECKOUT ERROR ===
Error type: [error type]
Error message: [error message]
Price ID received: [price ID]
Stripe key configured: true/false
Supabase configured: true/false
Stack trace: [details]
====================
```

**OR** you might see a simpler error like:

```
Error creating checkout session: Stripe error: No such price: price_1Sak7ICAL4InIKRQecSqTjLb
```

---

## 🎯 What to Share

**Copy and paste the error message from your backend terminal.**

It will look something like one of these:

### Example 1: Price ID Error
```
Error creating checkout session: Stripe error: No such price: price_1Sak7ICAL4InIKRQecSqTjLb
```

### Example 2: Customer Error
```
Error creating checkout session: Stripe error: No such customer: cus_TWkBh0ePIOop4j
```

### Example 3: Configuration Error
```
Stripe not configured - STRIPE_SECRET_KEY missing or invalid
```

---

## 🔄 If Backend Isn't Running

If you don't see a backend terminal, start it:

```powershell
cd backend
node server.js
```

You should see:
```
Server running on port 5000
```

Then try checkout again and watch for errors.

---

## ✅ Quick Checklist

- [ ] Backend server is running (check terminal)
- [ ] Tried checkout again after restarting backend
- [ ] Checked backend terminal for error messages
- [ ] Copied the exact error message

---

## 🚨 Common Issues

### Issue 1: Can't Find Backend Terminal
- **Solution:** Start a new terminal and run `cd backend && node server.js`

### Issue 2: No Error Shown
- **Solution:** Make sure backend is actually running (check port 5000)
- Try restarting backend: `Ctrl+C` then `node server.js` again

### Issue 3: Backend Crashed
- **Solution:** Check for startup errors when running `node server.js`
- Look for missing dependencies or configuration errors

---

## 📸 Alternative: Check Browser Console

If you can't see backend logs, also check your **browser console** (F12):

1. Open browser DevTools (F12)
2. Go to "Network" tab
3. Click "Subscribe"
4. Look for the failed request (usually red)
5. Click on it and check the "Response" tab

The response might show more error details.

---

**Please check your backend terminal and share the exact error message you see!** 🔍

