# 🚀 Deploy Upload Timeout Fix - Quick Steps

## ✅ Yes, You Need to Deploy!

The changes need to be deployed to both:
1. **Frontend (Amplify)** - Push to Git
2. **Backend (EC2)** - Pull on EC2 and restart

---

## 📦 Step 1: Push Frontend to Git (Amplify Auto-Deploys)

**Frontend changes will auto-deploy from GitHub:**

```bash
# Commit changes
git add .
git commit -m "Fix upload timeout: increase to 2 minutes, increase file size limit to 50MB"

# Push to GitHub
git push origin main
```

**Amplify will automatically:**
- ✅ Detect the push
- ✅ Start a new build (takes 3-5 minutes)
- ✅ Deploy the updated frontend

**Verify:**
- Go to AWS Amplify Console
- Check build status
- Wait for "Deploy" to complete

---

## 🖥️ Step 2: Update Backend on EC2

**SSH into your EC2 instance and update:**

```bash
# SSH into EC2
ssh -i your-key.pem ec2-user@your-ec2-ip

# Navigate to backend directory
cd /home/raj/Analytic-Shorts/backend

# Pull latest changes
git pull origin main

# Restart PM2 to apply changes
pm2 restart analytics-api --update-env

# Verify it's running
pm2 logs analytics-api --lines 20
```

**You should see:**
- ✅ Server restarted
- ✅ No errors in logs
- ✅ Backend is running

---

## 🧪 Step 3: Test the Fix

**After both are deployed:**

1. **Test frontend:**
   - Go to your Amplify URL
   - Try uploading a file
   - Should not timeout within 2 minutes

2. **Test backend:**
   - Check backend logs: `pm2 logs analytics-api`
   - Upload a file and verify it processes
   - Check for any errors

---

## 🎯 Quick Checklist

- [ ] Committed frontend changes to git
- [ ] Pushed to GitHub (`git push origin main`)
- [ ] Amplify build started automatically
- [ ] Amplify build completed successfully
- [ ] SSH'd into EC2
- [ ] Pulled latest changes (`git pull origin main`)
- [ ] Restarted PM2 (`pm2 restart analytics-api --update-env`)
- [ ] Verified backend is running
- [ ] Tested upload on deployed site

---

## 📝 Summary

- **Frontend:** ✅ Push to Git → Amplify auto-deploys
- **Backend:** ✅ Pull on EC2 + Restart PM2

**Both need to be updated for the fix to work!**

---

**Push frontend to Git, then update backend on EC2!** 🚀

