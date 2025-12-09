# 📦 What to Push to Git

## ✅ Changes Made

**We made several fixes that should be pushed to Git:**

### Frontend Changes:
1. **Upload timeout fix** - `src/config/api.js`, `src/components/FileUploader.jsx`
2. **Console warnings fix** - `src/components/OnboardingTour.jsx`, `src/contexts/AuthContext.jsx`

### Backend Changes:
1. **Upload timeout fix** - `backend/routes/upload.js`, `backend/server.js`
2. **Upload limit check timeout** - `backend/routes/upload.js`

---

## ✅ What to Push

**Yes, you should push these code changes to Git:**

1. **Frontend changes** will auto-deploy on Amplify
2. **Backend changes** need to be pulled on EC2

---

## ❌ What NOT to Push

**The CORS fix (`.env` file) should NOT be pushed:**
- `.env` files contain secrets and should never be in Git
- The CORS fix was done directly on EC2
- It's already working (we verified with curl)

---

## ✅ Step 1: Check What Changed

**Check what files were modified:**

```bash
git status
```

**Should show:**
- `src/config/api.js`
- `src/components/FileUploader.jsx`
- `src/components/OnboardingTour.jsx`
- `src/contexts/AuthContext.jsx`
- `backend/routes/upload.js`
- `backend/server.js`

---

## ✅ Step 2: Commit Changes

**Commit the changes:**

```bash
git add .
git commit -m "Fix upload timeout, increase file size limits, fix console warnings"
```

---

## ✅ Step 3: Push to GitHub

**Push to GitHub:**

```bash
git push origin main
```

**Amplify will automatically:**
- Detect the push
- Start a new build
- Deploy the updated frontend

---

## ✅ Step 4: Update Backend on EC2

**After pushing, update backend on EC2:**

```bash
# SSH into EC2
ssh -i your-key.pem ec2-user@your-ec2-ip

# Navigate to backend
cd /home/raj/Analytic-Shorts/backend

# Pull latest changes
git pull origin main

# Restart PM2
pm2 restart analytics-api --update-env
```

---

## 📝 Summary

- ✅ **Push code changes** (timeout fixes, console warnings)
- ❌ **Don't push `.env` file** (contains secrets, already fixed on EC2)
- ✅ **Frontend auto-deploys** from Git
- ✅ **Backend needs manual pull** on EC2

---

**Push the code changes to Git!** 🚀

The CORS fix is already done on EC2 and doesn't need to be in Git.

