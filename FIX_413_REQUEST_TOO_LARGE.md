# 🔧 Fix 413 Request Entity Too Large Error

## ❌ Error: `413 Request Entity Too Large`

**The backend is reachable, but Nginx (reverse proxy) is blocking large file uploads.**

---

## 🔍 The Problem

**Nginx has a default `client_max_body_size` of 1MB**, which causes 413 errors for larger files.

**Your backend allows up to 500MB, but Nginx is blocking it first.**

---

## ✅ Fix: Update Nginx Configuration

**On your EC2 server:**

```bash
# 1. Find Nginx config file
sudo find /etc/nginx -name "*.conf" | grep -E "(api|nm2tech)"

# Or check common locations:
sudo ls -la /etc/nginx/sites-available/
sudo ls -la /etc/nginx/conf.d/
```

**Common config file locations:**
- `/etc/nginx/sites-available/api.nm2tech-sas.com`
- `/etc/nginx/conf.d/api.conf`
- `/etc/nginx/nginx.conf`

---

## 🔧 Step 1: Edit Nginx Config

**Once you find the config file:**

```bash
# Edit the config file (replace with actual path)
sudo nano /etc/nginx/sites-available/api.nm2tech-sas.com
# Or
sudo nano /etc/nginx/conf.d/api.conf
```

**Add or update these settings:**

```nginx
server {
    listen 443 ssl;
    server_name api.nm2tech-sas.com;

    # INCREASE THIS - Allow up to 500MB file uploads
    client_max_body_size 500M;
    
    # Also increase these for large requests
    client_body_buffer_size 128k;
    client_body_timeout 300s;
    client_header_timeout 300s;
    
    # Proxy settings
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
        
        # Increase timeouts for large uploads
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

**Key settings:**
- `client_max_body_size 500M;` - **This is the most important!**
- `client_body_timeout 300s;` - Allow 5 minutes for uploads
- `proxy_read_timeout 300s;` - Allow 5 minutes for processing

---

## 🔧 Step 2: Test Nginx Config

```bash
# Test configuration
sudo nginx -t
```

**Should show:**
```
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

---

## 🔧 Step 3: Reload Nginx

```bash
# Reload Nginx (doesn't drop connections)
sudo systemctl reload nginx

# Or restart if reload doesn't work
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx
```

---

## 🔍 Step 4: Verify Backend Limits

**Make sure backend also allows large files:**

```bash
cd ~/Analytic-Shorts/backend
cat .env | grep -i size
```

**Backend should have:**
- Multer limit: 500MB (in code)
- Express body parser: 500MB (in code)

**These are already set in the code, so you're good!**

---

## 🧪 Step 5: Test Upload

**After updating Nginx:**

1. **Try uploading** a file again
2. **Should work** for files up to 500MB
3. **No more 413 errors**

---

## 🔍 If You Can't Find Nginx Config

**Check if Nginx is running:**

```bash
# Check Nginx status
sudo systemctl status nginx

# Check what's listening on port 443
sudo netstat -tulpn | grep 443
# Or
sudo ss -tulpn | grep 443
```

**If Nginx is not running, the backend might be directly exposed. Check:**
- EC2 Security Group allows port 5000?
- Is there a load balancer?
- Is there another reverse proxy?

---

## 🐛 Alternative: If No Nginx

**If you're not using Nginx, the 413 might be from:**
1. **Load Balancer** (AWS ALB) - Check ALB settings
2. **CloudFront** - Check CloudFront limits
3. **Direct backend** - Check if port 5000 is directly exposed

**For AWS ALB:**
- ALB has a default limit of 1MB
- You need to use S3 for large uploads, or increase ALB limits

---

## ✅ Quick Fix Summary

**Most likely fix:**

```bash
# 1. Find Nginx config
sudo find /etc/nginx -name "*api*" -o -name "*nm2tech*"

# 2. Edit config - add: client_max_body_size 500M;
sudo nano /path/to/config

# 3. Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

---

**Run these commands to fix the 413 error!** 🚀

