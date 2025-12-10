# 🔧 Fix Nginx Duplicate Server Name Warning

## ⚠️ Warning: `conflicting server name "api.nm2tech-sas.com" on 0.0.0.0:443, ignored`

**There are duplicate server blocks for `api.nm2tech-sas.com`.**

---

## 🔍 Check for Duplicates

**On EC2 server:**

```bash
# Check all Nginx config files for api.nm2tech-sas.com
sudo grep -r "server_name api.nm2tech-sas.com" /etc/nginx/

# Check api.conf specifically
sudo cat /etc/nginx/conf.d/api.conf
```

---

## ✅ Fix: Remove Duplicate Server Block

**The `api.conf` file should have ONLY ONE server block.**

**Edit the file:**

```bash
sudo nano /etc/nginx/conf.d/api.conf
```

**Make sure there's only ONE server block like this:**

```nginx
server {
    listen 443 ssl;
    server_name api.nm2tech-sas.com 98.90.130.74;

    # Allow up to 500MB file uploads
    client_max_body_size 500M;
    
    # Increase timeouts for large uploads
    client_body_timeout 300s;
    client_header_timeout 300s;
    proxy_read_timeout 300s;
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;

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

    # SSL certificates (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/api.nm2tech-sas.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.nm2tech-sas.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}
```

**Delete any duplicate server blocks!**

---

## 🔧 After Fixing

```bash
# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Check for warnings (should be none)
sudo systemctl status nginx
```

---

## ✅ Verify

**After fixing, check:**

```bash
# Should show only one server block
sudo grep -c "server {" /etc/nginx/conf.d/api.conf

# Should show no warnings
sudo nginx -t
```

---

**Remove the duplicate server block and reload Nginx!** 🚀

