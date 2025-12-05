# 🔧 Fix: "Request failed with status code 500" Error

## ❌ The Problem

A 500 error means the backend server encountered an error. Common causes:

1. **Stripe secret key not configured** in `backend/.env`
2. **Backend server not restarted** after updating `.env`
3. **Supabase credentials missing** or invalid
4. **Stripe API error** (e.g., invalid price ID in live mode)

---

## ✅ Step-by-Step Fix

### Step 1: Check Backend Server Logs

**Look at your backend terminal** - it should show the actual error. Common errors:

- `Stripe not configured - STRIPE_SECRET_KEY missing or invalid`
- `Database not configured`
- `Stripe error: No such price: price_...`

**Share the error message from your backend terminal** so I can help fix it.

---

### Step 2: Verify Backend `.env` File

**File:** `backend/.env`

**Make sure it has:**

```env
# Production Stripe Secret Key
STRIPE_SECRET_KEY=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

# Supabase (your existing values)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Frontend URL
FRONTEND_URL=http://192.168.1.151:3003

PORT=5000
```

**Important:**
- Make sure `STRIPE_SECRET_KEY` is the **complete** key (not truncated)
- Make sure there are **no extra spaces** around the `=` sign
- Make sure `FRONTEND_URL` matches your frontend URL (`http://192.168.1.151:3003`)

---

### Step 3: Restart Backend Server

**After updating `backend/.env`, you MUST restart the backend:**

```powershell
# Stop backend (Ctrl+C)
# Then restart:
cd backend
node server.js
```

---

### Step 4: Check Backend Startup Messages

When the backend starts, you should see:

```
✅ Stripe initialized
✅ Supabase initialized
Server running on port 5000
```

If you see warnings like:
```
⚠️ Stripe secret key not found
⚠️ Supabase credentials not found
```

Then your `.env` file is not being read correctly.

---

## 🔍 Common Issues

### Issue 1: Secret Key Not Set

**Error in backend logs:**
```
Stripe not configured - STRIPE_SECRET_KEY missing or invalid
```

**Fix:** Make sure `STRIPE_SECRET_KEY` is in `backend/.env` with the complete key.

---

### Issue 2: Price ID Doesn't Exist in Live Mode

**Error in backend logs:**
```
Stripe error: No such price: price_1Sak7ICAL4InIKRQecSqTjLb
```

**Fix:** The Price ID might be from test mode. Verify in Stripe Dashboard (Live mode) that the Price IDs exist:
- Pro: `price_1Sak7ICAL4InIKRQecSqTjLb`
- Enterprise: `price_1Sb3CtCAL4InIKRQrlhBex3j`

---

### Issue 3: Supabase Not Configured

**Error in backend logs:**
```
Database not configured
```

**Fix:** Make sure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in `backend/.env`.

---

### Issue 4: Frontend URL Mismatch

**Error:** CORS or redirect issues

**Fix:** Make sure `FRONTEND_URL` in `backend/.env` matches your actual frontend URL:
```env
FRONTEND_URL=http://192.168.1.151:3003
```

---

## 🧪 Test Backend Configuration

You can test if Stripe is configured by checking the backend logs when it starts. It should show:
- ✅ Stripe initialized (if key is present)
- ✅ Supabase initialized (if credentials are present)

---

## 📋 Quick Checklist

- [ ] `backend/.env` has `STRIPE_SECRET_KEY` with complete key
- [ ] `backend/.env` has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `backend/.env` has `FRONTEND_URL` matching your frontend
- [ ] Backend server restarted after updating `.env`
- [ ] Backend logs show no errors on startup
- [ ] Price IDs exist in Stripe Dashboard (Live mode)

---

## 🚨 Still Getting 500 Error?

**Check your backend terminal** and share the exact error message. The backend logs will show what's failing.

Common error patterns:
- `Error creating checkout session: ...` - This will show the actual Stripe error
- `Error fetching subscription: ...` - Supabase connection issue
- `Stripe error: ...` - Stripe API issue

---

**Once you check the backend logs and share the error, I can help fix it!** 🔍
