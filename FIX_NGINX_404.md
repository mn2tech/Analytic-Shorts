# Fix Nginx 404 Error

Nginx is running but returning 404. This means the config isn't being used or there's a conflict.

## Check Current Nginx Config

```bash
# Check what configs are loaded
sudo nginx -T | grep server_name

# Check if our config file exists
ls -la /etc/nginx/conf.d/api.conf

# Check what's in the default config
cat /etc/nginx/nginx.conf | grep include

# Check all server blocks
sudo nginx -T | grep -A 10 "server {"
```

## Common Issues

1. **Default config is taking precedence** - Need to disable default
2. **Config file in wrong location** - Amazon Linux uses different paths
3. **Server name mismatch** - Nginx needs exact match

## Solution: Check and Fix

Let's see what's actually configured and fix it.



