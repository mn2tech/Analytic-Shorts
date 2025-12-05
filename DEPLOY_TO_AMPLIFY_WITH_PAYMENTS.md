# 🚀 Deploy to AWS Amplify with Payments Working

## ✅ Yes, Payments Will Work on Amplify!

Your Stripe integration will work on Amplify, but you need to configure environment variables correctly.

---

## 📋 Pre-Deployment Checklist

Before pushing to GitHub, make sure:

- [x] ✅ Payments working locally
- [x] ✅ Production Stripe keys configured
- [x] ✅ Production Price IDs ready
- [ ] Backend deployed and accessible
- [ ] Environment variables ready for Amplify

---

## 🔧 Step 1: Update `amplify.yml` with Production Price IDs

Your `amplify.yml` currently has placeholder comments. Update it with your production Price IDs:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  environment:
    # Backend API URL - Update with your production backend URL
    VITE_API_URL: https://api.nm2tech-sas.com  # ← Update this!
    
    # Production Stripe Publishable Key
    VITE_STRIPE_PUBLISHABLE_KEY: pk_live_51RilIPCAL4InIKRQlas1xaG2odzZNj70YikLjKe1Jvf8qU2pKtx4HzLLm2Y5NP0FF4tJaf20nA08FOKAXPNB2awU00HXHdOVz8
    
    # Production Price IDs
    VITE_STRIPE_PRO_PRICE_ID: price_1Sak7ICAL4InIKRQecSqTjLb
    VITE_STRIPE_ENTERPRISE_PRICE_ID: price_1Sb3CtCAL4InIKRQrlhBex3j
```

**Important:** Update `VITE_API_URL` with your actual production backend URL!

---

## 🔑 Step 2: Set Environment Variables in Amplify Console

After pushing to GitHub and connecting to Amplify:

1. **Go to AWS Amplify Console**
2. **Select your app**
3. **Go to:** App settings → Environment variables
4. **Add these variables:**

### Required Variables:

```env
VITE_API_URL=https://your-production-backend-url.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51RilIPCAL4InIKRQlas1xaG2odzZNj70YikLjKe1Jvf8qU2pKtx4HzLLm2Y5NP0FF4tJaf20nA08FOKAXPNB2awU00HXHdOVz8
VITE_STRIPE_PRO_PRICE_ID=price_1Sak7ICAL4InIKRQecSqTjLb
VITE_STRIPE_ENTERPRISE_PRICE_ID=price_1Sb3CtCAL4InIKRQrlhBex3j
VITE_SUPABASE_URL=https://ybpzhhzadvarebdclykl.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**Note:** 
- Replace `VITE_API_URL` with your actual backend URL
- Replace `VITE_SUPABASE_ANON_KEY` with your actual Supabase anon key

---

## 🖥️ Step 3: Deploy Your Backend

**Your backend MUST be deployed separately!** Amplify only hosts the frontend.

### Backend Deployment Options:

#### Option 1: AWS EC2 (Recommended for Production)
- Deploy backend to EC2 instance
- Set up SSL/HTTPS
- Update `VITE_API_URL` to your EC2 domain

#### Option 2: AWS Lambda + API Gateway
- Serverless backend
- Auto-scales
- Pay per request

#### Option 3: Cloudflare Tunnel (Quick & Free)
- Run backend locally or on any server
- Cloudflare provides HTTPS URL
- Free for personal use

#### Option 4: Railway/Render (Easy)
- Deploy backend to Railway or Render
- Get HTTPS URL automatically
- Update `VITE_API_URL`

---

## 📝 Step 4: Update Backend CORS for Production

Once you know your Amplify domain, update `backend/.env`:

```env
ALLOWED_ORIGINS=https://main.xxxxx.amplifyapp.com,https://your-custom-domain.com
```

**Or** if you want to allow all origins (less secure):

```env
ALLOWED_ORIGINS=*
```

---

## 🚀 Step 5: Push to GitHub

```powershell
# Make sure you're in the project root
git add .
git commit -m "Configure production Stripe integration"
git push origin main
```

---

## 🔗 Step 6: Connect to AWS Amplify

1. **Go to:** https://console.aws.amazon.com/amplify
2. **Click:** "New app" → "Host web app"
3. **Connect GitHub** repository
4. **Select branch:** `main` (or your default branch)
5. **Amplify will auto-detect** `amplify.yml`

---

## ⚙️ Step 7: Configure Environment Variables in Amplify

**After connecting the repository:**

1. **Go to:** App settings → Environment variables
2. **Add all the variables** from Step 2 above
3. **Save**

---

## 🔄 Step 8: Redeploy

After setting environment variables:

1. **Go to:** App settings → Build settings
2. **Click:** "Redeploy this version" or trigger a new deployment
3. **Wait for build** to complete (3-5 minutes)

---

## ✅ Step 9: Verify Payments Work

After deployment:

1. **Go to your Amplify app URL**
2. **Try to purchase a plan**
3. **Check:**
   - ✅ No CORS errors
   - ✅ Checkout redirects to Stripe
   - ✅ Payment processes successfully

---

## 🐛 Troubleshooting

### Issue: "Invalid price ID"
- **Fix:** Verify Price IDs in Amplify environment variables match Stripe Dashboard (Live mode)

### Issue: "CORS error"
- **Fix:** Update `ALLOWED_ORIGINS` in backend `.env` with your Amplify domain

### Issue: "Backend not found"
- **Fix:** Verify `VITE_API_URL` in Amplify matches your backend URL

### Issue: "Stripe not configured"
- **Fix:** Check `VITE_STRIPE_PUBLISHABLE_KEY` is set in Amplify environment variables

---

## 📋 Production Checklist

- [ ] Backend deployed and accessible via HTTPS
- [ ] `VITE_API_URL` set in Amplify with production backend URL
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY` set in Amplify
- [ ] `VITE_STRIPE_PRO_PRICE_ID` set in Amplify
- [ ] `VITE_STRIPE_ENTERPRISE_PRICE_ID` set in Amplify
- [ ] `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set in Amplify
- [ ] Backend `ALLOWED_ORIGINS` includes Amplify domain
- [ ] Tested checkout flow on production
- [ ] Webhook configured in Stripe Dashboard (if using webhooks)

---

## 🎯 Quick Summary

1. **Update `amplify.yml`** with production Price IDs
2. **Deploy backend** separately (EC2, Lambda, Railway, etc.)
3. **Push to GitHub**
4. **Connect to Amplify**
5. **Set environment variables** in Amplify Console
6. **Redeploy**
7. **Test payments**

---

**Your payments will work on Amplify once you configure the environment variables!** 🚀

