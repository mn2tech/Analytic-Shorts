# 🔄 Restart Local Backend Server

## ✅ For Local Development (Windows)

**PM2 is only on EC2. For local development, restart the Node.js server directly.**

---

## 🔄 Step 1: Stop Current Backend (If Running)

**If your backend is running:**

1. **Find** the terminal/console where backend is running
2. **Press:** `Ctrl+C` to stop it
3. **Wait** for it to stop completely

---

## 🔄 Step 2: Restart Backend

**From the `backend` folder:**

```powershell
# Make sure you're in the backend folder
cd backend

# Start the server
npm run dev
```

**Or if you prefer to run it directly:**

```powershell
node server.js
```

---

## 🔄 Alternative: Restart Both Frontend and Backend

**From the project root:**

```powershell
# Go to project root
cd ..

# Start both frontend and backend
npm run dev:all
```

**This starts both frontend and backend together.**

---

## ✅ Verify Backend is Running

**You should see:**
```
🚀 Server running on http://localhost:5000
```

**If you see errors:**
- Check that `.env` file exists in `backend/` folder
- Check that all dependencies are installed: `npm install`
- Check the error message

---

## 🔍 Check Backend Logs

**When you try to checkout Enterprise plan, watch the backend console for errors:**

**You should see:**
- Request received: `POST /api/subscription/checkout`
- Any error messages from Stripe
- The exact error that's causing the 500

**Common errors:**
- `No such price: 'price_1ScFgsCAL4InIKRQyL2PJ5Q4'` → Price ID doesn't exist or wrong mode
- `Invalid API key` → Stripe key issue
- `Stripe not configured` → Missing Stripe key in `.env`

---

## 📝 Quick Steps

1. ✅ **Stop backend** (Ctrl+C in backend terminal)
2. ✅ **Restart backend:** `npm run dev` (from backend folder)
3. ✅ **Watch console** for errors when testing checkout
4. ✅ **Share error message** if you see one

---

**Restart your local backend and watch the console for the exact error!** 🔍

The backend console will show you exactly what's wrong when you try to checkout.

