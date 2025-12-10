# 📊 Testing Large File Upload (>50MB)

## 🔍 What Should Happen

**With your account (`kolawind@gmail.com`):**

### Option 1: If You're Admin/Demo
- ✅ **Unlimited access** - File should upload successfully
- ✅ No limits on file size
- ✅ Works for any file size

### Option 2: If You're on Pro Plan
- ❌ **50MB limit enforced** - File >50MB will be rejected
- ✅ **Upgrade prompt should appear** - Modal with "Upgrade to Enterprise" button
- ✅ Shows current limit (50MB) vs file size
- ✅ Links to pricing page

### Option 3: If You're on Free Plan
- ❌ **5MB limit enforced** - File >5MB will be rejected
- ✅ **Upgrade prompt should appear** - Modal with "Upgrade to Pro" button

---

## 🎯 Quick Test

**Try uploading a file >50MB and see what happens:**

1. **If you see upgrade prompt** → Working correctly! ✅
2. **If file uploads successfully** → You're admin/demo! ✅
3. **If you see error without prompt** → Need to check upgrade prompt integration

---

## 🔧 Make Your Account Admin (Unlimited Access)

**If you want unlimited access for testing:**

**On EC2 backend, add your email to `ADMIN_EMAILS`:**

```bash
# SSH into EC2
ssh raj@your-ec2-ip

# Edit backend/.env
cd ~/Analytic-Shorts/backend
nano .env

# Add your email:
ADMIN_EMAILS=admin@nm2tech-sas.com,demo@nm2tech-sas.com,kolawind@gmail.com

# Save and restart
pm2 restart analytics-api --update-env
```

**After this, you'll have unlimited access!**

---

## 📝 What to Check

**When uploading >50MB file:**

1. **Check browser console:**
   - Look for error messages
   - Check if `upgradeRequired: true` is in response

2. **Check what you see:**
   - Upgrade prompt modal? ✅
   - Just error message? ⚠️ (upgrade prompt not showing)
   - File uploads successfully? ✅ (you're admin)

3. **Check backend logs:**
   ```bash
   pm2 logs analytics-api --lines 30
   ```
   - Look for file size check
   - Look for plan detection
   - Look for admin/demo check

---

## 🐛 Troubleshooting

### Issue: Upgrade Prompt Not Showing

**Check:**
1. Is `UpgradePrompt` component imported in `Home.jsx`? ✅
2. Is `onUpgradeRequired` handler set up? ✅
3. Is backend returning `upgradeRequired: true`?
4. Check browser console for errors

### Issue: File Uploads But Should Be Rejected

**Check:**
1. Is your email in `ADMIN_EMAILS`? (If yes, that's why it works!)
2. What plan are you on? (Check subscription in database)
3. Check backend logs for plan detection

### Issue: Error But No Upgrade Prompt

**Fix:**
- Check if error response has `upgradeRequired: true`
- Check if `UpgradePrompt` component is rendering
- Check browser console for React errors

---

## ✅ Expected Behavior

**For Pro User Uploading 60MB File:**

1. File starts uploading
2. Backend checks: 60MB > 50MB limit
3. Backend returns 403 with `upgradeRequired: true`
4. Frontend detects upgrade-required error
5. **UpgradePrompt modal appears** showing:
   - Error message
   - Current plan: Pro (50MB limit)
   - File size: 60MB
   - Upgrade to Enterprise (500MB limit)
   - "Upgrade to Enterprise" button
   - "Maybe Later" button
6. User clicks "Upgrade" → Goes to pricing page

---

## 🧪 Test Checklist

- [ ] Upload file >50MB
- [ ] Check if upgrade prompt appears
- [ ] Check if error message is clear
- [ ] Check if "Upgrade" button works
- [ ] Check if "Maybe Later" closes modal
- [ ] Check browser console for errors
- [ ] Check backend logs for plan detection

---

**Try uploading now and let me know what happens!** 🚀

