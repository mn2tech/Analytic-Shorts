# ✅ Add Custom Domain to CORS

## ❌ Issue Found!

Your `ALLOWED_ORIGINS` only has:
```
ALLOWED_ORIGINS=https://main.d2swtp6vppsxta.amplifyapp.com
```

**But you're accessing from:** `https://analytics-shorts.nm2tech-sas.com`

**This domain is NOT in the list, so CORS is blocking it!**

---

## ✅ Fix: Add Custom Domain

**Update `ALLOWED_ORIGINS` in your `.env` file:**

```env
ALLOWED_ORIGINS=https://main.d2swtp6vppsxta.amplifyapp.com,https://analytics-shorts.nm2tech-sas.com
```

**Or include both Amplify URL and custom domain:**

```env
ALLOWED_ORIGINS=https://main.d2swtp6vppsxta.amplifyapp.com,https://analytics-shorts.nm2tech-sas.com,http://localhost:3000,http://localhost:5173
```

---

## ✅ Steps to Update

**In vi editor (you're already there):**

1. **Press `i` to enter insert mode**

2. **Find the line:**
   ```
   ALLOWED_ORIGINS=https://main.d2swtp6vppsxta.amplifyapp.com
   ```

3. **Change it to:**
   ```
   ALLOWED_ORIGINS=https://main.d2swtp6vppsxta.amplifyapp.com,https://analytics-shorts.nm2tech-sas.com
   ```

4. **Press `Esc` to exit insert mode**

5. **Type `:wq` and press Enter** to save and quit

---

## ✅ Restart Backend

**After saving, restart PM2:**

```bash
pm2 restart analytics-api --update-env
```

**Verify it's running:**

```bash
pm2 logs analytics-api --lines 20
```

---

## ✅ Test Again

**After restarting:**

1. **Go to:** `https://analytics-shorts.nm2tech-sas.com`
2. **Try uploading a file**
3. **Should work now!** ✅

---

## 📝 Complete `.env` Should Look Like:

```env
PORT=5000

# Production Stripe Secret Key
STRIPE_SECRET_KEY=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

# Supabase Configuration
SUPABASE_URL=https://ybpzhhzadvarebdclykl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlicHpoaHphZHZhcmViZGNseWtsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDc4MjA0NiwiZXhwIjoyMDcwMzU4MDQ2fQ.EZywrFOW2YJfUbchblAVsOxrxflsTEUjVibZkvjkW5Y

# Frontend URL (Amplify)
FRONTEND_URL=https://main.d2swtp6vppsxta.amplifyapp.com

# CORS Allowed Origins
ALLOWED_ORIGINS=https://main.d2swtp6vppsxta.amplifyapp.com,https://analytics-shorts.nm2tech-sas.com
```

---

**Add the custom domain to ALLOWED_ORIGINS and restart PM2!** 🚀

That's the issue - the custom domain isn't in the CORS list!

