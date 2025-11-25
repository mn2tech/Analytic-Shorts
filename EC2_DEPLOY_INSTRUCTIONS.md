# EC2 Backend Deployment Instructions

Deploy the backend API on your existing EC2 instance.

## Step 1: Check Node.js Installation

```bash
node --version
npm --version
```

If not installed:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## Step 2: Clone Repository

```bash
cd ~
git clone https://github.com/mn2tech/Analytic-Shorts.git
cd Analytic-Shorts/backend
```

## Step 3: Install Dependencies

```bash
npm install
```

## Step 4: Create Environment File

```bash
nano .env
```

Add:
```
PORT=5000
OPENAI_API_KEY=your-key-here  # Optional
NODE_ENV=production
```

Save: `Ctrl+X`, then `Y`, then `Enter`

## Step 5: Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

## Step 6: Start the Backend

```bash
pm2 start server.js --name analytics-api
pm2 save
pm2 startup
# Follow the instructions to enable auto-start on reboot
```

## Step 7: Check Status

```bash
pm2 status
pm2 logs analytics-api
```

## Step 8: Configure Security Group

1. Go to AWS EC2 Console
2. Select your instance
3. Security tab → Security groups
4. Edit inbound rules
5. Add rule:
   - Type: Custom TCP
   - Port: 5000
   - Source: 0.0.0.0/0 (or restrict to your Amplify IP)
   - Description: Analytics API

## Step 9: Get Your API URL

```bash
# Get public IP
curl http://169.254.169.254/latest/meta-data/public-ipv4
```

Or check in EC2 Console → Your instance → Public IPv4 address

Your API URL will be: `http://YOUR-PUBLIC-IP:5000`

## Step 10: Test the API

```bash
curl http://localhost:5000/api/health
```

Should return: `{"status":"ok","message":"NM2TECH Analytics Shorts API is running"}`

## Step 11: Update Amplify

1. Go to AWS Amplify Console
2. App settings → Environment variables
3. Add: `VITE_API_URL` = `http://YOUR-PUBLIC-IP:5000`
4. Redeploy frontend

## Optional: Set Up Nginx Reverse Proxy (Recommended)

This allows you to use port 80/443 instead of 5000:

```bash
# Install Nginx
sudo apt-get update
sudo apt-get install nginx

# Create config
sudo nano /etc/nginx/sites-available/analytics-api
```

Add:
```nginx
server {
    listen 80;
    server_name YOUR-PUBLIC-IP;

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

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/analytics-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Update security group to allow port 80
```

Then use: `http://YOUR-PUBLIC-IP` (port 80) instead of port 5000.

## Useful PM2 Commands

```bash
pm2 status              # Check status
pm2 logs analytics-api  # View logs
pm2 restart analytics-api  # Restart
pm2 stop analytics-api     # Stop
pm2 delete analytics-api   # Remove
```

## Troubleshooting

### Port already in use
```bash
sudo lsof -i :5000
# Kill the process or change PORT in .env
```

### Can't access from outside
- Check security group rules
- Verify PM2 is running: `pm2 status`
- Check logs: `pm2 logs analytics-api`

### Update code
```bash
cd ~/Analytic-Shorts
git pull
cd backend
npm install
pm2 restart analytics-api
```

