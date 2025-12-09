# ✅ Backend is Accessible - Fix CORS

## ✅ Good News: Backend is Working!

The backend is accessible at `https://api.nm2tech-sas.com/api/health` and returning 200 OK! ✅

**The issue is CORS** - the frontend origin is not in the `ALLOWED_ORIGINS` list.

---

## ✅ Step 1: Find Your Frontend Origin

**Your frontend is running on:**
- Amplify URL: `https://main.d2swtp6vppsxta.amplifyapp.com`
- Or custom domain: `https://analytics-shorts.nm2tech-sas.com`

**You need to add this to `ALLOWED_ORIGINS` in backend `.env`**

---

## ✅ Step 2: Update Backend CORS on EC2

**SSH into EC2 and update the `.env` file:**

```bash
# SSH into EC2
ssh -i your-key.pem ec2-user@your-ec2-ip

# Navigate to backend
cd /home/raj/Analytic-Shorts/backend

# Edit .env file
nano .env
```

**Add your frontend origins to `ALLOWED_ORIGINS`:**

```env
ALLOWED_ORIGINS=https://main.d2swtp6vppsxta.amplifyapp.com,https://analytics-shorts.nm2tech-sas.com,http://localhost:3000,http://localhost:5173
```

**Or if you want to allow all origins (for now):**

```env
ALLOWED_ORIGINS=*
```

**Save:** `Ctrl+X`, then `Y`, then `Enter`

---

## ✅ Step 3: Restart Backend

**Restart PM2 to apply changes:**

```bash
pm2 restart analytics-api --update-env
```

**Verify it's running:**

```bash
pm2 logs analytics-api --lines 20
```

---

## ✅ Step 4: Test Again

**After restarting, test from your frontend:**

1. **Go to your Amplify URL**
2. **Try uploading a file**
3. **Should work now!** ✅

---

## 🔍 Verify CORS is Fixed

**Test CORS from browser console:**

1. **Open browser console** (F12)
2. **Run:**
   ```javascript
   fetch('https://api.nm2tech-sas.com/api/health', {
     method: 'GET',
     credentials: 'include'
   })
   .then(r => r.json())
   .then(console.log)
   .catch(console.error)
   ```

**Should return:** `{status: "ok", message: "NM2TECH Analytics Shorts API is running"}`

**If you see CORS error:**
- Check `ALLOWED_ORIGINS` includes your frontend URL
- Make sure you restarted PM2
- Check backend logs for CORS errors

---

## 📝 Complete `backend/.env` Example

```env
PORT=5000

# Stripe Secret Key
STRIPE_SECRET_KEY=sk_live_...

# Supabase Configuration
SUPABASE_URL=https://ybpzhhzadvarebdclykl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...

# Frontend URL (for redirects after payment)
FRONTEND_URL=https://analytics-shorts.nm2tech-sas.com

# CORS Allowed Origins
ALLOWED_ORIGINS=https://main.d2swtp6vppsxta.amplifyapp.com,https://analytics-shorts.nm2tech-sas.com,http://localhost:3000,http://localhost:5173
```

---

**Update ALLOWED_ORIGINS and restart PM2!** 🚀

The backend is working - just need to allow your frontend origin in CORS!

