# 🚀 Deploy Upload Timeout Fix

## ✅ Changes Made

The upload timeout fix includes changes to:
1. **Frontend:** `src/config/api.js`, `src/components/FileUploader.jsx`
2. **Backend:** `backend/routes/upload.js`, `backend/server.js`

---

## 📦 Deployment Steps

### Frontend (AWS Amplify) - Auto-Deploy from Git

**Yes, you need to push to Git for Amplify to deploy:**

1. **Commit changes:**
   ```bash
   git add .
   git commit -m "Fix upload timeout: increase to 2 minutes, increase file size limit to 50MB"
   ```

2. **Push to GitHub:**
   ```bash
   git push origin main
   ```

3. **Amplify will automatically:**
   - Detect the push
   - Start a new build
   - Deploy the updated frontend
   - Takes 3-5 minutes

4. **Verify deployment:**
   - Go to AWS Amplify Console
   - Check build status
   - Wait for "Deploy" to complete

---

### Backend (EC2 with PM2) - Manual Update

**You have two options:**

#### Option 1: Pull from Git (Recommended)

1. **SSH into your EC2 instance:**
   ```bash
   ssh -i your-key.pem ec2-user@your-ec2-ip
   ```

2. **Navigate to backend directory:**
   ```bash
   cd /home/raj/Analytic-Shorts/backend
   ```

3. **Pull latest changes:**
   ```bash
   git pull origin main
   ```

4. **Restart PM2:**
   ```bash
   pm2 restart analytics-api --update-env
   ```

5. **Verify it's running:**
   ```bash
   pm2 logs analytics-api --lines 20
   ```

#### Option 2: Manual File Update

1. **SSH into EC2:**
   ```bash
   ssh -i your-key.pem ec2-user@your-ec2-ip
   ```

2. **Edit files directly:**
   - Update `backend/routes/upload.js` (line 90: change 10MB to 50MB)
   - Update `backend/server.js` (add 50MB limits to express.json and express.urlencoded)

3. **Restart PM2:**
   ```bash
   pm2 restart analytics-api --update-env
   ```

---

## 🎯 Quick Checklist

### Frontend (Amplify):
- [ ] Committed changes to git
- [ ] Pushed to GitHub
- [ ] Amplify build started automatically
- [ ] Build completed successfully
- [ ] Tested upload on deployed site

### Backend (EC2):
- [ ] Pulled latest changes from git (or manually updated files)
- [ ] Restarted PM2: `pm2 restart analytics-api --update-env`
- [ ] Verified backend is running: `pm2 logs analytics-api`
- [ ] Tested upload endpoint

---

## 🧪 Testing After Deployment

**Test the upload fix:**

1. **Frontend:**
   - Go to your deployed Amplify URL
   - Try uploading a file (small, medium, large)
   - Should not timeout within 2 minutes

2. **Backend:**
   - Check backend logs: `pm2 logs analytics-api`
   - Upload a file and verify it processes correctly
   - Check for any errors

---

## 📝 Summary

- **Frontend (Amplify):** ✅ Push to Git → Auto-deploys
- **Backend (EC2):** ✅ Pull from Git + Restart PM2 (or manually update)

**Both need to be updated for the fix to work completely!**

---

**Push frontend to Git, then update backend on EC2!** 🚀

