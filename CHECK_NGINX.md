# Check Nginx Status

Run these commands on your EC2 instance to check Nginx:

```bash
# Check if nginx is installed
which nginx
nginx -v

# Check if nginx is running
sudo systemctl status nginx

# Check if nginx is listening on port 80
sudo ss -tlnp | grep :80

# Check nginx configuration
sudo nginx -t
```

If nginx is running, we can proceed to configure it for your API.



