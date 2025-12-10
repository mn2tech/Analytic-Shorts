# 🔍 Find Nginx Duplicate Server Block

## ⚠️ Warning: `conflicting server name "api.nm2tech-sas.com"`

**The `api.conf` looks correct, but there's another config file with the same server_name.**

---

## 🔍 On EC2 Server - Find the Duplicate

```bash
# 1. Search all Nginx config files for api.nm2tech-sas.com
sudo grep -r "server_name.*api.nm2tech-sas.com" /etc/nginx/

# 2. Check the other config file (nm2tech-sas.com.conf)
sudo cat /etc/nginx/conf.d/nm2tech-sas.com.conf

# 3. Check main nginx.conf
sudo grep -A 10 "api.nm2tech-sas.com" /etc/nginx/nginx.conf
```

---

## ✅ Fix: Remove Duplicate

**If you find `api.nm2tech-sas.com` in another file:**

1. **Remove it** from that file (keep only in `api.conf`)
2. **Or** remove the duplicate server block

**Common locations:**
- `/etc/nginx/conf.d/nm2tech-sas.com.conf` - might have API subdomain
- `/etc/nginx/nginx.conf` - might have include or server block
- `/etc/nginx/sites-enabled/` - if using sites-enabled

---

## 🔧 After Removing Duplicate

```bash
# Test configuration (should have no warnings)
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Verify no warnings
sudo systemctl status nginx | grep -i warn
```

---

**Run the search command to find where the duplicate is!** 🔍

