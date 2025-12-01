# Create Environment Files - Quick Instructions

## ✅ I've Created Templates For You!

I've created template files with your Stripe keys. You just need to copy them to the right locations.

## 📝 Step 1: Create `backend/.env`

**Option A: Copy from template (Easiest)**
```powershell
cd backend
Copy-Item env-template.txt .env
```

**Option B: Create manually**
1. Create a file named `.env` in the `backend` folder
2. Copy the content from `backend/env-template.txt`
3. Replace `your_supabase_project_url` and `your_supabase_service_role_key` with your actual Supabase values

## 📝 Step 2: Create `.env.local` in Root

Create a file named `.env.local` in the project root with:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51RilIPCAL4InIKRQU4d6lOMScYKSWGA7SSAO7DGwgnGujTkH8T8urHpgwpehvLbdUKShSbk0dutiYQCJF2zHp0PK008JO9uWsj
VITE_STRIPE_PRO_PRICE_ID=price_pro_monthly
VITE_STRIPE_ENTERPRISE_PRICE_ID=price_enterprise_monthly
VITE_API_URL=http://localhost:5000
```

## 📝 Step 3: Add Your Supabase Credentials

Edit `backend/.env` and replace:
- `your_supabase_project_url` → Your actual Supabase URL
- `your_supabase_service_role_key` → Your actual Supabase service role key

## 📝 Step 4: Create Products in Stripe

1. Go to: https://dashboard.stripe.com/test/products
2. Create "Pro Plan" - $19/month → Copy Price ID
3. Create "Enterprise Plan" - $199/month → Copy Price ID
4. Update `.env.local` with the actual Price IDs

## 🚀 Step 5: Restart Servers

```powershell
# Backend
cd backend
npm start

# Frontend (new terminal)
npm run dev
```

## ✅ Done!

Your Stripe keys are configured! The backend should start without errors now.


