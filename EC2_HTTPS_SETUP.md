# Setting Up HTTPS on EC2 Backend

## Problem
Amplify frontend is served over HTTPS, but EC2 backend is HTTP. Browsers block mixed content (HTTPS → HTTP requests).

## Solution Options

### Option 1: Use Nginx Reverse Proxy with Let's Encrypt (Recommended)

#### Step 1: Install Nginx
```bash
sudo apt-get update
sudo apt-get install nginx
```

#### Step 2: Install Certbot (for Let's Encrypt SSL)
```bash
sudo apt-get install certbot python3-certbot-nginx
```

#### Step 3: Point Domain to EC2
- Get a domain name (or use a subdomain)
- Point A record to your EC2 public IP: `98.90.130.74`

#### Step 4: Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/analytics-api
```

Add:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain

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

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/analytics-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 5: Get SSL Certificate
```bash
sudo certbot --nginx -d your-domain.com
```

Follow prompts. Certbot will automatically configure HTTPS.

#### Step 6: Update Amplify Environment Variable
- Go to Amplify Console → Environment variables
- Update `VITE_API_URL` to: `https://your-domain.com`

### Option 2: Use Cloudflare Tunnel (No Domain Needed)

#### Step 1: Install Cloudflared
```bash
# Download cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
```

#### Step 2: Create Tunnel
```bash
cloudflared tunnel login
cloudflared tunnel create analytics-api
cloudflared tunnel route dns analytics-api your-subdomain.your-domain.com
```

#### Step 3: Configure Tunnel
Create config file:
```bash
nano ~/.cloudflared/config.yml
```

Add:
```yaml
tunnel: <tunnel-id>
credentials-file: /home/raj/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: your-subdomain.your-domain.com
    service: http://localhost:5000
  - service: http_status:404
```

#### Step 4: Run Tunnel
```bash
cloudflared tunnel run analytics-api
```

Or with PM2:
```bash
pm2 start cloudflared --name cloudflare-tunnel -- tunnel run analytics-api
pm2 save
```

#### Step 5: Update Amplify
- Set `VITE_API_URL` to: `https://your-subdomain.your-domain.com`

### Option 3: Quick Test - Use HTTP (Temporary)

For testing only, you can temporarily allow mixed content in your browser:

**Chrome:**
1. Click the lock icon in address bar
2. Site settings → Insecure content → Allow
3. Refresh page

**Note:** This is NOT recommended for production. Only for testing.

## Recommended: Option 1 (Nginx + Let's Encrypt)

This is the most professional and permanent solution. You'll need:
- A domain name (can get one for ~$10/year)
- Point DNS to your EC2 IP
- Run certbot to get free SSL certificate

## After Setting Up HTTPS

1. Update `VITE_API_URL` in Amplify to use `https://` instead of `http://`
2. Redeploy Amplify app
3. Test - should work without mixed content errors



