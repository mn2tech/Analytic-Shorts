# Route 53 Setup for api.nm2tech-sas.com

Step-by-step guide to set up your domain on Route 53.

---

## Step 1: Get Your EC2 Public IP

On your EC2 instance, run:

```bash
curl http://169.254.169.254/latest/meta-data/public-ipv4
```

**Copy this IP address** - you'll need it for Route 53.

Or check in AWS Console:
- EC2 → Your instance → Public IPv4 address

---

## Step 2: Create A Record in Route 53

1. **Go to Route 53 Console**
   - AWS Console → Route 53 → Hosted zones

2. **Select your domain**
   - Click on `nm2tech-sas.com`

3. **Create Record**
   - Click **Create record** button

4. **Configure the record:**
   - **Record name:** `api`
   - **Record type:** `A - Routes traffic to an IPv4 address`
   - **Value:** Paste your EC2 public IP (from Step 1)
   - **TTL:** `300` (or leave default)
   - **Routing policy:** `Simple routing`

5. **Click Create records**

**Result:** `api.nm2tech-sas.com` will point to your EC2 IP

---

## Step 3: Verify DNS (Wait 5-10 minutes)

DNS changes take a few minutes. Verify it's working:

```bash
# On your Windows machine (PowerShell)
nslookup api.nm2tech-sas.com
```

Should show your EC2 IP address.

Or test from EC2:
```bash
nslookup api.nm2tech-sas.com
```

---

## Step 4: Install Nginx on EC2

SSH into your EC2 instance and run:

```bash
# Check your OS first
cat /etc/os-release

# For Amazon Linux 2023/2
sudo yum update -y
sudo yum install nginx -y

# For Amazon Linux 1 (older)
sudo yum update -y
sudo yum install nginx -y

# For Ubuntu
sudo apt-get update
sudo apt-get install nginx -y
```

---

## Step 5: Configure Nginx

```bash
# Create config file
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

Should show: `syntax is ok` and `test is successful`

Start Nginx:
```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

Check status:
```bash
sudo systemctl status nginx
```

---

## Step 6: Install Certbot (for SSL)

```bash
# For Amazon Linux 2023/2
sudo yum install certbot python3-certbot-nginx -y

# For Amazon Linux 1
sudo yum install certbot python3-certbot-nginx -y

# For Ubuntu
sudo apt-get install certbot python3-certbot-nginx -y
```

---

## Step 7: Get SSL Certificate

**IMPORTANT:** Wait until DNS is fully propagated (5-10 minutes after Step 2) before running this!

```bash
sudo certbot --nginx -d api.nm2tech-sas.com
```

Follow the prompts:
1. **Email:** Enter your email (for renewal notices)
2. **Terms:** Type `A` to agree
3. **Share email:** Type `N` (optional)
4. Certbot will automatically:
   - Get SSL certificate
   - Configure Nginx for HTTPS
   - Set up auto-renewal

**Result:** `https://api.nm2tech-sas.com` with SSL! 🔒

---

## Step 8: Verify Backend is Running

```bash
# Check if backend is running
curl http://localhost:5000/api/health
```

If not running, start it:
```bash
cd ~/Analytic-Shorts/backend
npm start
```

Or with PM2 (recommended for production):
```bash
# Install PM2 if not already
sudo npm install -g pm2

# Start backend
cd ~/Analytic-Shorts/backend
pm2 start server.js --name analytics-api
pm2 save
pm2 startup
# Follow the instructions it gives you
```

---

## Step 9: Test Your Domain

From your Windows browser, test:

```
https://api.nm2tech-sas.com/api/health
```

Should return: `{"status":"ok","message":"NM2TECH Analytics Shorts API is running"}`

---

## Step 10: Update Amplify

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

## Step 11: Configure Security Group

Make sure your EC2 Security Group allows:

1. **Go to EC2 Console**
   - Select your instance
   - Security tab → Click Security group

2. **Edit inbound rules**
   - Add rule:
     - Type: `HTTP`
     - Port: `80`
     - Source: `0.0.0.0/0`
   - Add rule:
     - Type: `HTTPS`
     - Port: `443`
     - Source: `0.0.0.0/0`
   - Save rules

---

## 🎉 Done!

Your backend will be at: `https://api.nm2tech-sas.com`

---

## 🔍 Troubleshooting

### DNS not resolving?
- Wait 10-30 minutes for Route 53 propagation
- Check Route 53 record is correct
- Verify: `nslookup api.nm2tech-sas.com`

### Certbot fails?
- Make sure DNS is pointing to EC2 (wait for propagation)
- Check Security Group allows port 80
- Make sure Nginx is running: `sudo systemctl status nginx`

### 502 Bad Gateway?
- Backend not running: `curl http://localhost:5000/api/health`
- Start backend: `cd ~/Analytic-Shorts/backend && npm start`

---

*Follow these steps in order, and you'll have a production-ready API!* 🚀

