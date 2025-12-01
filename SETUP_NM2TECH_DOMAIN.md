# Setting Up nm2tech-sas.com Domain for Backend API

You have `nm2tech-sas.com` - let's set it up properly!

## 🎯 Recommended Setup

**Backend API:** `https://api.nm2tech-sas.com`  
**Frontend (Amplify):** Can also use `https://nm2tech-sas.com` or keep Amplify URL

---

## Step 1: Configure DNS (Point Subdomain to EC2)

### Option A: If using Route 53 (AWS)

1. Go to **Route 53 Console** → Hosted zones
2. Select `nm2tech-sas.com`
3. Click **Create record**
4. Configure:
   - **Record name:** `api`
   - **Record type:** `A`
   - **Value:** Your EC2 public IP (get it with: `curl http://169.254.169.254/latest/meta-data/public-ipv4`)
   - **TTL:** 300 (or default)
5. Click **Create records**

**Result:** `api.nm2tech-sas.com` → Your EC2 IP

### Option B: If using other DNS provider (Namecheap, GoDaddy, etc.)

1. Log into your DNS provider
2. Find DNS management for `nm2tech-sas.com`
3. Add A record:
   - **Host/Name:** `api`
   - **Type:** `A`
   - **Value/Points to:** Your EC2 public IP
   - **TTL:** 300 (or default)
4. Save

**Result:** `api.nm2tech-sas.com` → Your EC2 IP

### Get Your EC2 Public IP

On your EC2 instance:
```bash
curl http://169.254.169.254/latest/meta-data/public-ipv4
```

Or check in AWS Console → EC2 → Your instance → Public IPv4 address

---

## Step 2: Wait for DNS Propagation

DNS changes take **5-30 minutes** to propagate. Verify it's working:

```bash
# On your Windows machine
nslookup api.nm2tech-sas.com
# OR
ping api.nm2tech-sas.com
```

Should show your EC2 IP address.

---

## Step 3: Install Nginx on EC2

SSH into your EC2 instance:

```bash
# For Amazon Linux
sudo yum update -y
sudo yum install nginx -y

# For Ubuntu
sudo apt-get update
sudo apt-get install nginx -y
```

---

## Step 4: Configure Nginx Reverse Proxy

```bash
sudo nano /etc/nginx/conf.d/api.conf
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name api.nm2tech-sas.com;

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

Save: `Ctrl+X`, then `Y`, then `Enter`

Test configuration:
```bash
sudo nginx -t
```

Start Nginx:
```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## Step 5: Install Certbot (for SSL)

```bash
# For Amazon Linux
sudo yum install certbot python3-certbot-nginx -y

# For Ubuntu
sudo apt-get install certbot python3-certbot-nginx -y
```

---

## Step 6: Get SSL Certificate (FREE)

```bash
sudo certbot --nginx -d api.nm2tech-sas.com
```

Follow the prompts:
1. Enter your email (for renewal notices)
2. Agree to terms
3. Choose whether to share email (optional)
4. Certbot will:
   - Get SSL certificate
   - Automatically configure Nginx for HTTPS
   - Set up auto-renewal

**Result:** `https://api.nm2tech-sas.com` with SSL! 🔒

---

## Step 7: Verify Backend is Running

Make sure your backend is running on port 5000:

```bash
# Check if running
curl http://localhost:5000/api/health

# If not running, start it
cd ~/Analytic-Shorts/backend
npm start
# OR if using PM2
pm2 start server.js --name analytics-api
```

---

## Step 8: Test Your Domain

From your Windows browser, test:

```
https://api.nm2tech-sas.com/api/health
```

Should return: `{"status":"ok","message":"NM2TECH Analytics Shorts API is running"}`

---

## Step 9: Update Amplify Configuration

Update `amplify.yml`:

```yaml
environment:
  VITE_API_URL: https://api.nm2tech-sas.com
```

Then commit and push:
```bash
git add amplify.yml
git commit -m "Configure backend API URL to api.nm2tech-sas.com"
git push
```

---

## Step 10: Configure Security Group (If Needed)

Make sure your EC2 Security Group allows:
- **HTTP (80)** - for Let's Encrypt verification
- **HTTPS (443)** - for API access
- **SSH (22)** - for management

In AWS Console:
1. EC2 → Your instance → Security tab
2. Click Security group
3. Edit inbound rules
4. Add:
   - Type: HTTP, Port: 80, Source: 0.0.0.0/0
   - Type: HTTPS, Port: 443, Source: 0.0.0.0/0
5. Save

---

## Step 11: Set Up Auto-Start (PM2)

To keep backend running after reboot:

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start backend with PM2
cd ~/Analytic-Shorts/backend
pm2 start server.js --name analytics-api
pm2 save
pm2 startup
# Follow the instructions it gives you
```

---

## 🎉 Final Result

- **Backend API:** `https://api.nm2tech-sas.com`
- **SSL Certificate:** ✅ Automatic (Let's Encrypt)
- **Auto-renewal:** ✅ Configured
- **Production-ready:** ✅ Yes!

---

## 🔍 Troubleshooting

### DNS not resolving?
- Wait 10-30 minutes for propagation
- Check DNS records are correct
- Use `nslookup api.nm2tech-sas.com` to verify

### SSL certificate fails?
- Make sure DNS is pointing to EC2 (wait for propagation)
- Check Security Group allows port 80
- Make sure Nginx is running: `sudo systemctl status nginx`

### 502 Bad Gateway?
- Backend not running: `curl http://localhost:5000/api/health`
- Start backend: `cd ~/Analytic-Shorts/backend && npm start`

### Can't access from browser?
- Check Security Group allows HTTPS (443)
- Check Nginx is running: `sudo systemctl status nginx`
- Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`

---

## 📝 Optional: Frontend on Main Domain

If you want your Amplify frontend on `https://nm2tech-sas.com`:

1. In Amplify Console → Domain management
2. Add custom domain: `nm2tech-sas.com`
3. Follow DNS verification steps
4. Amplify will provide SSL automatically

**Result:**
- Frontend: `https://nm2tech-sas.com`
- Backend: `https://api.nm2tech-sas.com`

---

*You're all set! Your backend will be at `https://api.nm2tech-sas.com`* 🚀

