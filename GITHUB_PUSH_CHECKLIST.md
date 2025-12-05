# ✅ GitHub Push Checklist

## Before Pushing to GitHub

### ✅ Make Sure These Are NOT in Your Repository

**IMPORTANT:** Never commit sensitive keys to GitHub!

- [ ] `.env.local` - Should be in `.gitignore`
- [ ] `backend/.env` - Should be in `.gitignore`
- [ ] Any files with API keys, secrets, or passwords

### ✅ Check `.gitignore`

Make sure your `.gitignore` includes:

```
.env.local
.env
backend/.env
*.env
node_modules/
dist/
.vite/
```

---

## 📝 What to Push

### ✅ Safe to Push:

- ✅ `amplify.yml` (has production keys, but they're public anyway - Stripe publishable keys are meant to be public)
- ✅ All source code
- ✅ `package.json`
- ✅ Configuration files (without secrets)

### ❌ Never Push:

- ❌ `.env.local`
- ❌ `backend/.env`
- ❌ Any files with secret keys (`sk_live_...`, `SUPABASE_SERVICE_ROLE_KEY`, etc.)

---

## 🚀 Push Commands

```powershell
# Check what will be committed
git status

# Add all files (gitignore will exclude .env files)
git add .

# Commit
git commit -m "Configure production Stripe integration for Amplify"

# Push to GitHub
git push origin main
```

---

## ⚠️ Important Notes

1. **Stripe Publishable Keys** (`pk_live_...`) are **safe to commit** - they're meant to be public
2. **Stripe Secret Keys** (`sk_live_...`) should **NEVER** be committed
3. **Supabase Service Role Keys** should **NEVER** be committed
4. **Price IDs** are safe to commit (they're public identifiers)

---

## ✅ After Pushing

1. Connect to AWS Amplify
2. Set environment variables in Amplify Console (if not in `amplify.yml`)
3. Deploy backend separately
4. Test payments

---

**You're ready to push!** 🚀

