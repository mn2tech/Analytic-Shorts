# 👤 Check Admin Account Status

## ❓ Is `kolawind@gmail.com` an Admin Account?

**Currently: It depends on your backend configuration.**

---

## 🔍 How to Check

**On your EC2 server, run:**

```bash
cd ~/Analytic-Shorts/backend
cat .env | grep ADMIN_EMAILS
```

**If you see:**
```env
ADMIN_EMAILS=admin@nm2tech-sas.com,demo@nm2tech-sas.com,kolawind@gmail.com
```

**Then YES, `kolawind@gmail.com` is an admin account!** ✅

**If you see:**
```env
ADMIN_EMAILS=admin@nm2tech-sas.com,demo@nm2tech-sas.com
```

**Then NO, you need to add it.** ⚠️

---

## ✅ Make `kolawind@gmail.com` an Admin Account

**On EC2 server:**

```bash
# 1. Navigate to backend
cd ~/Analytic-Shorts/backend

# 2. Edit .env file
nano .env

# 3. Find or add ADMIN_EMAILS line:
ADMIN_EMAILS=admin@nm2tech-sas.com,demo@nm2tech-sas.com,kolawind@gmail.com

# 4. Save (Ctrl+X, Y, Enter)

# 5. Restart backend
pm2 restart analytics-api --update-env

# 6. Verify
cat .env | grep ADMIN_EMAILS
```

---

## 🧪 Test Admin Access

**After adding your email, test:**

1. **Login** with `kolawind@gmail.com`
2. **Upload** a file >500MB
   - Should work without limits ✅
3. **Create** multiple dashboards
   - Should work without limits ✅
4. **Generate** unlimited AI insights
   - Should work without limits ✅

**If all work, you have admin access!** 🎉

---

## 📝 Default Admin Emails

**If `ADMIN_EMAILS` is not set, defaults are:**
- `admin@nm2tech-sas.com`
- `demo@nm2tech-sas.com`

**Your email (`kolawind@gmail.com`) is NOT in the defaults, so you need to add it!**

---

## ✅ Quick Setup

**Run this on EC2:**

```bash
cd ~/Analytic-Shorts/backend
nano .env
# Add: ADMIN_EMAILS=admin@nm2tech-sas.com,demo@nm2tech-sas.com,kolawind@gmail.com
# Save and exit
pm2 restart analytics-api --update-env
```

**Then test uploading a large file - it should work!** 🚀

