# ✅ Verify Backend After Restart

## ✅ Backend Status: ONLINE

**PM2 shows backend is running!** Now let's verify it's working correctly.

---

## 🔍 Step 1: Check Backend Logs

**Check if backend started successfully:**

```bash
pm2 logs analytics-api --lines 30
```

**Look for:**
- ✅ `🚀 Server running on http://localhost:5000`
- ✅ No error messages
- ✅ CORS configuration loaded
- ✅ Database connection successful

**If you see errors, share them and I'll help fix!**

---

## 🔍 Step 2: Test Backend Locally

**Test from EC2 itself:**

```bash
curl http://localhost:5000/api/health
```

**Expected response:**
```json
{"status":"ok","message":"Server is running"}
```

**If this works, backend is running correctly!**

---

## 🔍 Step 3: Test Backend via Domain

**Test from your local machine or browser:**

```bash
# From terminal
curl https://api.nm2tech-sas.com/api/health

# Or open in browser:
# https://api.nm2tech-sas.com/api/health
```

**Expected response:**
```json
{"status":"ok","message":"Server is running"}
```

**If this doesn't work, check:**
- DNS is resolving correctly
- Nginx is configured (if using reverse proxy)
- SSL certificate is valid
- EC2 Security Group allows HTTPS (port 443)

---

## 🔍 Step 4: Check CORS Configuration

**Verify CORS includes your frontend URLs:**

```bash
cat .env | grep ALLOWED_ORIGINS
```

**Should include:**
```env
ALLOWED_ORIGINS=https://main.d2swtp6vppsxta.amplifyapp.com,https://analytics-shorts.nm2tech-sas.com,https://nm2tech-sas.com,http://localhost:3000
```

**If missing or incorrect, update it:**

```bash
nano .env

# Add or update:
ALLOWED_ORIGINS=https://main.d2swtp6vppsxta.amplifyapp.com,https://analytics-shorts.nm2tech-sas.com,https://nm2tech-sas.com,http://localhost:3000

# Save and restart
pm2 restart analytics-api --update-env
```

---

## 🔍 Step 5: Check Admin Emails (If Needed)

**If you want admin access, verify:**

```bash
cat .env | grep ADMIN_EMAILS
```

**Should include your email:**
```env
ADMIN_EMAILS=admin@nm2tech-sas.com,demo@nm2tech-sas.com,kolawind@gmail.com
```

**If missing, add it:**

```bash
nano .env

# Add:
ADMIN_EMAILS=admin@nm2tech-sas.com,demo@nm2tech-sas.com,kolawind@gmail.com

# Save and restart
pm2 restart analytics-api --update-env
```

---

## 🔍 Step 6: Check Nginx (If Using)

**If using Nginx reverse proxy:**

```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx config
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

**If Nginx is not running:**
```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## 🧪 Quick Test Commands

**Run these to verify everything:**

```bash
# 1. Check backend logs
pm2 logs analytics-api --lines 30

# 2. Test locally
curl http://localhost:5000/api/health

# 3. Check CORS
cat .env | grep ALLOWED_ORIGINS

# 4. Check admin emails (if needed)
cat .env | grep ADMIN_EMAILS

# 5. Test via domain (from your local machine)
curl https://api.nm2tech-sas.com/api/health
```

---

## ✅ Expected Results

**If everything is working:**

1. ✅ Backend logs show: `🚀 Server running on http://localhost:5000`
2. ✅ `curl http://localhost:5000/api/health` returns: `{"status":"ok"}`
3. ✅ `curl https://api.nm2tech-sas.com/api/health` returns: `{"status":"ok"}`
4. ✅ Frontend can connect to backend
5. ✅ No CORS errors in browser console

---

## 🐛 If Still Not Working

**Check these:**

1. **Backend logs show errors?**
   - Share the error messages
   - Check database connection
   - Check environment variables

2. **Local test works but domain doesn't?**
   - Check Nginx configuration
   - Check DNS records
   - Check SSL certificate

3. **CORS errors in browser?**
   - Add frontend URL to `ALLOWED_ORIGINS`
   - Restart backend after updating

4. **Connection timeout?**
   - Check EC2 Security Group
   - Check firewall rules
   - Check if port 443 is open

---

**Run Step 1 (check logs) first and share what you see!** 🔍

