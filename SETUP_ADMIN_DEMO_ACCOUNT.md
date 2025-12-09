# 👤 Setup Admin/Demo Account with Full Access

## ✅ What Was Implemented

**Admin and Demo accounts now have unlimited access to all features!**

**Features:**
- ✅ Unlimited file uploads (no size limit)
- ✅ Unlimited dashboards
- ✅ Unlimited AI insights
- ✅ Unlimited exports
- ✅ All features enabled (forecasting, etc.)
- ✅ No plan restrictions

---

## 🔧 How It Works

**Two ways to create admin/demo accounts:**

### Method 1: Email-Based (Easiest)
**If user's email is in the admin list, they automatically get admin access.**

### Method 2: Database-Based
**Set plan to "admin" or "demo" in the `shorts_subscriptions` table.**

---

## 📝 Step 1: Configure Admin Emails

**Add admin/demo emails to backend `.env`:**

```env
# Admin/Demo emails (comma-separated)
ADMIN_EMAILS=admin@nm2tech-sas.com,demo@nm2tech-sas.com,your-email@gmail.com
```

**Default emails (if not set):**
- `admin@nm2tech-sas.com`
- `demo@nm2tech-sas.com`

**Restart backend after updating:**
```bash
# On EC2:
pm2 restart analytics-api --update-env

# Locally:
# Stop and restart backend
```

---

## 📝 Step 2: Create Admin/Demo Account in Supabase

### Option A: Create New User (Recommended)

1. **Go to:** Supabase Dashboard → Authentication → Users
2. **Click:** "Add user" or "Invite user"
3. **Enter:**
   - **Email:** `admin@nm2tech-sas.com` (or your admin email)
   - **Password:** (set a strong password)
   - **Auto Confirm:** ✅ (check this)
4. **Click:** "Create user"

### Option B: Use Existing User

**If you already have a user account:**
1. **Go to:** Supabase Dashboard → Authentication → Users
2. **Find** your user
3. **Note** the email address

---

## 📝 Step 3: Set Admin Plan in Database

**Two options:**

### Option 1: Add to Admin Email List (Easiest)

**Just add the email to `ADMIN_EMAILS` in backend `.env`:**
```env
ADMIN_EMAILS=admin@nm2tech-sas.com,demo@nm2tech-sas.com,your-email@gmail.com
```

**No database changes needed!** The system will automatically detect admin emails.

### Option 2: Set Plan in Database

**If you want to set it in the database:**

1. **Go to:** Supabase Dashboard → Table Editor
2. **Select:** `shorts_subscriptions` table
3. **Find** or create record for your user:
   - **user_id:** (your user's UUID from auth.users)
   - **plan:** `admin` or `demo`
   - **status:** `active`
4. **Save** the record

**Or use SQL:**
```sql
-- Insert admin subscription
INSERT INTO shorts_subscriptions (user_id, plan, status)
VALUES ('your-user-uuid-here', 'admin', 'active')
ON CONFLICT (user_id) 
DO UPDATE SET plan = 'admin', status = 'active';

-- Or for demo
INSERT INTO shorts_subscriptions (user_id, plan, status)
VALUES ('your-user-uuid-here', 'demo', 'active')
ON CONFLICT (user_id) 
DO UPDATE SET plan = 'demo', status = 'active';
```

---

## 🧪 Step 4: Test Admin Access

**After setting up:**

1. **Login** with admin/demo account
2. **Try uploading** a large file (>500MB)
   - Should work without errors ✅
3. **Create** multiple dashboards
   - Should work without limits ✅
4. **Generate** multiple AI insights
   - Should work without limits ✅
5. **Use** all features
   - Should all work ✅

---

## 🔍 Verify Admin Status

**Check if user is admin:**

1. **Login** with the account
2. **Check backend logs:**
   - Should see: "Authenticated user: [user-id] [email]"
3. **Try uploading** a file larger than any plan limit
   - If it works → Admin access is active ✅
   - If it fails → Check email is in ADMIN_EMAILS or plan is set in DB

---

## 📊 Admin/Demo Plan Limits

| Feature | Admin/Demo Limit |
|---------|-----------------|
| **File Size** | Unlimited (no limit) |
| **Uploads** | Unlimited |
| **Dashboards** | Unlimited |
| **AI Insights** | Unlimited |
| **Exports** | Unlimited |
| **Forecasting** | ✅ Enabled |

**Everything is unlimited!**

---

## 🔐 Security Notes

**Important:**
- ✅ Admin emails are checked server-side (secure)
- ✅ Admin status is verified on every request
- ⚠️ Don't commit `ADMIN_EMAILS` to GitHub (use environment variables)
- ⚠️ Use strong passwords for admin accounts
- ⚠️ Limit admin email list to trusted emails only

---

## 🚀 Quick Setup

**Fastest way to create admin account:**

1. **Add email to backend `.env`:**
   ```env
   ADMIN_EMAILS=your-email@gmail.com
   ```

2. **Restart backend:**
   ```bash
   pm2 restart analytics-api --update-env
   ```

3. **Login** with that email
4. **Done!** You now have full access ✅

**No database changes needed if using email-based method!**

---

## 📝 Environment Variable

**Add to `backend/.env`:**
```env
# Admin/Demo emails (comma-separated, case-insensitive)
ADMIN_EMAILS=admin@nm2tech-sas.com,demo@nm2tech-sas.com,your-email@gmail.com
```

**Multiple emails:** Separate with commas (no spaces needed, but spaces are trimmed)

**Case-insensitive:** `Admin@Example.com` = `admin@example.com`

---

## ✅ Summary

**What's Implemented:**
- ✅ Admin and Demo plan types with unlimited access
- ✅ Email-based admin detection
- ✅ Database-based admin detection
- ✅ All limit checks bypassed for admin/demo
- ✅ All features enabled for admin/demo

**How to Use:**
1. Add email to `ADMIN_EMAILS` in backend `.env`
2. Restart backend
3. Login with that email
4. Enjoy unlimited access!

---

**Admin accounts are ready! Just add your email to `ADMIN_EMAILS` and restart the backend.** 🚀

