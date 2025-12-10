# 🔧 Fix Storage Quota Error

## ❌ Error: `QuotaExceededError: Failed to execute 'setItem' on 'Storage'`

**Large files exceed browser storage limits (usually 5-10MB).**

---

## ✅ Fix Applied

**Updated code to handle large files:**

1. **Check data size** before storing
2. **Use navigation state** as fallback for large files
3. **Catch storage errors** gracefully

---

## 🔧 What Changed

### `src/pages/Home.jsx`:
- Added size check before storing in sessionStorage
- If data > 4MB, tries storage but falls back to navigation state
- Catches `QuotaExceededError` and uses navigation state

### `src/pages/Dashboard.jsx`:
- Checks navigation state first (for large files)
- Falls back to sessionStorage for smaller files
- Handles both storage methods seamlessly

---

## 🚀 Deploy the Fix

**Push to GitHub:**

```bash
git add src/pages/Home.jsx src/pages/Dashboard.jsx
git commit -m "Fix storage quota error for large files"
git push origin main
```

**Then on EC2:**
- Amplify will auto-deploy frontend
- Or trigger manual deploy in Amplify Console

---

## ✅ After Deploy

**Large files will:**
- ✅ Upload successfully (if Nginx is fixed)
- ✅ Pass data via navigation state instead of storage
- ✅ Work without storage quota errors

---

## 🔧 Also Fix Nginx 413 Error

**On EC2, verify Nginx config was updated:**

```bash
# Check if client_max_body_size is set
sudo grep "client_max_body_size" /etc/nginx/conf.d/api.conf

# If not found, add it and reload:
sudo nano /etc/nginx/conf.d/api.conf
# Add: client_max_body_size 500M;
sudo nginx -t
sudo systemctl reload nginx
```

---

**Push the storage fix and verify Nginx config!** 🚀

