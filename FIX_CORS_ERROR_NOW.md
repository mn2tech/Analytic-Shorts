# 🔧 Fix CORS Error - Immediate Solution

## ❌ CORS Error Identified!

**Error:**
```
Access to XMLHttpRequest at 'https://api.nm2tech-sas.com/api/upload' 
from origin 'https://main.d2swtp6vppsxta.amplifyapp.com' 
has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**The backend is NOT sending CORS headers for the upload request!**

---

## ✅ Step 1: Verify ALLOWED_ORIGINS on EC2

**SSH into EC2 and check the `.env` file:**

```bash
# SSH into EC2
ssh -i your-key.pem ec2-user@your-ec2-ip

# Check .env file
cd /home/raj/Analytic-Shorts/backend
cat .env | grep ALLOWED_ORIGINS
```

**Should show:**
```
ALLOWED_ORIGINS=https://main.d2swtp6vppsxta.amplifyapp.com
```

**If it shows something else or is missing, update it:**

```bash
# Edit .env
nano .env
```

**Make sure it has:**
```env
ALLOWED_ORIGINS=https://main.d2swtp6vppsxta.amplifyapp.com
```

**Save:** `Ctrl+X`, then `Y`, then `Enter`

---

## ✅ Step 2: Restart PM2 (Critical!)

**After updating `.env`, you MUST restart PM2:**

```bash
pm2 restart analytics-api --update-env
```

**The `--update-env` flag is important!** It forces PM2 to reload environment variables.

**Verify it restarted:**

```bash
pm2 logs analytics-api --lines 20
```

**You should see:**
```
🚀 Server running on http://localhost:5000
```

---

## ✅ Step 3: Test CORS from Browser

**After restarting, test from browser console:**

1. **Go to:** `https://main.d2swtp6vppsxta.amplifyapp.com/`
2. **Open browser console** (F12)
3. **Run:**
   ```javascript
   fetch('https://api.nm2tech-sas.com/api/health', {
     method: 'GET',
     credentials: 'include'
   })
   .then(r => r.json())
   .then(console.log)
   .catch(console.error)
   ```

**Should return:** `{status: "ok", message: "NM2TECH Analytics Shorts API is running"}`

**If you still see CORS error:**
- Check backend logs: `pm2 logs analytics-api`
- Verify `.env` file was saved correctly
- Try allowing all origins temporarily: `ALLOWED_ORIGINS=*`

---

## ✅ Step 4: If Still Not Working - Allow All Origins (Temporary)

**If CORS is still blocking, temporarily allow all origins:**

**On EC2:**
```bash
cd /home/raj/Analytic-Shorts/backend
nano .env
```

**Change:**
```env
ALLOWED_ORIGINS=*
```

**Save and restart:**
```bash
pm2 restart analytics-api --update-env
```

**This will allow all origins (for testing). Once it works, you can restrict it back.**

---

## 🔍 Debug: Check Backend Logs

**Check if requests are reaching the backend:**

```bash
pm2 logs analytics-api --lines 100
```

**Look for:**
- CORS errors
- Request logs
- Any errors when you try to upload

**If you don't see any logs when uploading:**
- Request is not reaching the backend
- Check Nginx configuration (if using Nginx)
- Check security groups (if using EC2)

---

## 📝 Complete Fix Checklist

- [ ] Verified `ALLOWED_ORIGINS` in `.env` includes `https://main.d2swtp6vppsxta.amplifyapp.com`
- [ ] Restarted PM2 with `--update-env` flag
- [ ] Tested from browser console - CORS working?
- [ ] If not working, tried `ALLOWED_ORIGINS=*` temporarily
- [ ] Checked backend logs for CORS errors

---

**Restart PM2 with --update-env flag!** 🚀

The CORS error means the backend isn't sending the headers. Restart PM2 to reload the environment variables.

