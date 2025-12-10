# 🔧 Fix Backend Connection Error

## ❌ Error: Cannot connect to backend server

**API URL:** `https://api.nm2tech-sas.com`

---

## 🔍 Step 1: Check Backend Server Status

**On EC2, check if backend is running:**

```bash
# SSH into EC2
ssh raj@your-ec2-ip

# Check PM2 status
pm2 status

# Check if analytics-api is running
pm2 list

# Check logs
pm2 logs analytics-api --lines 50
```

**Expected:**
- `analytics-api` should be `online`
- Logs should show: `🚀 Server running on http://localhost:5000`

**If not running:**
```bash
# Start backend
cd ~/Analytic-Shorts/backend
pm2 start ecosystem.config.js
# Or
pm2 restart analytics-api
```

---

## 🔍 Step 2: Verify Backend URL

**Check if `https://api.nm2tech-sas.com` is correct:**

1. **Test from browser:**
   - Open: `https://api.nm2tech-sas.com/api/health`
   - Should return: `{"status":"ok","message":"Server is running"}`

2. **Test from terminal:**
   ```bash
   curl https://api.nm2tech-sas.com/api/health
   ```

3. **Check DNS:**
   ```bash
   nslookup api.nm2tech-sas.com
   # Should resolve to your EC2 IP
   ```

**If URL doesn't work:**
- Check DNS records in Route 53
- Verify domain points to EC2
- Check SSL certificate is valid

---

## 🔍 Step 3: Check CORS Configuration

**Verify CORS in `backend/.env`:**

```bash
# On EC2
cd ~/Analytic-Shorts/backend
cat .env | grep ALLOWED_ORIGINS
```

**Should include your frontend URL:**
```env
ALLOWED_ORIGINS=https://main.d2swtp6vppsxta.amplifyapp.com,https://analytics-shorts.nm2tech-sas.com,https://nm2tech-sas.com
```

**If missing, add it:**
```bash
nano .env

# Add or update:
ALLOWED_ORIGINS=https://main.d2swtp6vppsxta.amplifyapp.com,https://analytics-shorts.nm2tech-sas.com,https://nm2tech-sas.com,http://localhost:3000

# Save and restart
pm2 restart analytics-api --update-env
```

---

## 🔍 Step 4: Check Backend Port & Firewall

**Verify backend is listening on port 5000:**

```bash
# On EC2
netstat -tulpn | grep 5000
# Or
ss -tulpn | grep 5000
```

**Check EC2 Security Group:**
- Port 5000 should be open (if using direct connection)
- Port 443 (HTTPS) should be open for API domain
- Port 80 (HTTP) should be open (if needed)

**If using Nginx reverse proxy:**
- Check Nginx is running: `sudo systemctl status nginx`
- Check Nginx config for `api.nm2tech-sas.com`
- Verify SSL certificate

---

## 🔍 Step 5: Test Backend Directly

**Test from EC2 itself:**
```bash
# On EC2
curl http://localhost:5000/api/health
# Should return: {"status":"ok","message":"Server is running"}
```

**Test from your local machine:**
```bash
# Replace with your EC2 IP
curl http://YOUR-EC2-IP:5000/api/health
```

**Test via domain:**
```bash
curl https://api.nm2tech-sas.com/api/health
```

---

## 🔍 Step 6: Check SSL Certificate

**If using HTTPS, verify SSL:**
```bash
# Check SSL certificate
openssl s_client -connect api.nm2tech-sas.com:443 -servername api.nm2tech-sas.com

# Or use browser
# Open: https://api.nm2tech-sas.com/api/health
# Check for SSL errors
```

**Common SSL issues:**
- Certificate expired
- Certificate not configured for subdomain
- Nginx not configured for SSL

---

## 🔍 Step 7: Check Nginx Configuration (If Using)

**If using Nginx reverse proxy:**

```bash
# Check Nginx config
sudo nano /etc/nginx/sites-available/api.nm2tech-sas.com
# Or
sudo nano /etc/nginx/conf.d/api.conf
```

**Should have:**
```nginx
server {
    listen 443 ssl;
    server_name api.nm2tech-sas.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Reload Nginx:**
```bash
sudo nginx -t  # Test config
sudo systemctl reload nginx  # Reload
```

---

## 🔍 Step 8: Check Frontend API URL

**Verify frontend is using correct URL:**

**In Amplify Console:**
- Go to: App Settings → Environment variables
- Check: `VITE_API_URL` = `https://api.nm2tech-sas.com`

**In local `.env.local`:**
```env
VITE_API_URL=https://api.nm2tech-sas.com
```

**Rebuild frontend if changed:**
- Amplify: Trigger new build
- Local: Restart dev server

---

## 🐛 Common Issues & Fixes

### Issue 1: Backend Not Running
**Fix:**
```bash
pm2 restart analytics-api --update-env
```

### Issue 2: CORS Error
**Fix:**
- Add frontend URL to `ALLOWED_ORIGINS` in backend `.env`
- Restart backend: `pm2 restart analytics-api --update-env`

### Issue 3: DNS Not Resolving
**Fix:**
- Check Route 53 DNS records
- Verify A/CNAME record points to EC2
- Wait for DNS propagation (up to 48 hours)

### Issue 4: SSL Certificate Error
**Fix:**
- Check certificate is valid
- Renew if expired
- Configure Nginx with correct certificate paths

### Issue 5: Firewall Blocking
**Fix:**
- Check EC2 Security Group
- Open port 443 (HTTPS) or 5000 (if direct)
- Check Nginx firewall rules

---

## ✅ Quick Diagnostic Commands

**Run these to diagnose:**

```bash
# 1. Check backend status
pm2 status

# 2. Check backend logs
pm2 logs analytics-api --lines 50

# 3. Test backend locally
curl http://localhost:5000/api/health

# 4. Test backend via domain
curl https://api.nm2tech-sas.com/api/health

# 5. Check CORS config
cat backend/.env | grep ALLOWED_ORIGINS

# 6. Check Nginx (if using)
sudo systemctl status nginx
sudo nginx -t

# 7. Check DNS
nslookup api.nm2tech-sas.com
```

---

## 🚀 Quick Fix Checklist

- [ ] Backend is running (`pm2 status`)
- [ ] Backend logs show no errors
- [ ] `https://api.nm2tech-sas.com/api/health` works
- [ ] CORS includes frontend URL
- [ ] Backend restarted after CORS change
- [ ] Frontend `VITE_API_URL` is correct
- [ ] SSL certificate is valid
- [ ] EC2 Security Group allows HTTPS
- [ ] Nginx is running (if using)

---

**Start with Step 1 (check backend status) and work through each step!** 🔧
