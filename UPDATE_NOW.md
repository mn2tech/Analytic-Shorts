# 🚀 Quick Update Instructions

## ✅ You Have Everything!

- **Publishable Key:** `pk_live_51RilIPCAL4InIKRQlas1xaG2odzZNj70YikLjKe1Jvf8qU2pKtx4HzLLm2Y5NP0FF4tJaf20nA08FOKAXPNB2awU00HXHdOVz8`
- **Pro Price ID:** `price_1Sak7ICAL4InIKRQecSqTjLb`
- **Enterprise Price ID:** `price_1Sb3CtCAL4InIKRQrlhBex3j`
- **Secret Key:** `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` ✅

---

## 🔧 Option 1: Use PowerShell Script (Easiest)

I've created a script to automatically update your `backend/.env` file:

```powershell
.\update-backend-env.ps1
```

This will update the `STRIPE_SECRET_KEY` in your `backend/.env` file automatically.

---

## 🔧 Option 2: Manual Update

### Update `backend/.env`

Open `backend/.env` and update or add:

```env
STRIPE_SECRET_KEY=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
```

### Update `.env.local` (Project Root)

Open `.env.local` in the project root and update:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51RilIPCAL4InIKRQlas1xaG2odzZNj70YikLjKe1Jvf8qU2pKtx4HzLLm2Y5NP0FF4tJaf20nA08FOKAXPNB2awU00HXHdOVz8
VITE_STRIPE_PRO_PRICE_ID=price_1Sak7ICAL4InIKRQecSqTjLb
VITE_STRIPE_ENTERPRISE_PRICE_ID=price_1Sb3CtCAL4InIKRQrlhBex3j
```

---

## 📝 Still Need

- [ ] **Webhook Secret** - Get from Stripe Dashboard → Webhooks (Live mode)
- [ ] **Update Production URLs** - Frontend and backend URLs in environment files

---

## 🚀 After Updating

1. **Restart your servers:**
   ```powershell
   # Stop current servers (Ctrl+C)
   
   # Frontend
   npm run dev
   
   # Backend (new terminal)
   cd backend
   npm start
   ```

2. **Test the payment flow** with a real card

---

**Run the PowerShell script or manually update the files, then restart your servers!** 🎉

