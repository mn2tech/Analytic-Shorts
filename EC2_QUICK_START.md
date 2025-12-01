# EC2 Quick Start - Get Backend Running

## Step 1: Navigate to Project

```bash
cd ~/Analytic-Shorts/backend
```

If the project isn't cloned yet:
```bash
cd ~
git clone https://github.com/mn2tech/Analytic-Shorts.git
cd Analytic-Shorts/backend
```

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Create .env File

```bash
nano .env
```

Add this content:
```
PORT=5000
NODE_ENV=production
OPENAI_API_KEY=your-key-here
```

Save: Press `Ctrl+X`, then `Y`, then `Enter`

## Step 4: Start with PM2

```bash
pm2 start server.js --name analytics-api
pm2 save
```

## Step 5: Verify It's Running

```bash
pm2 status
curl http://localhost:5000/api/health
```

Should return: `{"status":"ok","message":"NM2TECH Analytics Shorts API is running"}`

## Step 6: Get Your Public IP

```bash
curl http://169.254.169.254/latest/meta-data/public-ipv4
```

## Step 7: Test from Outside

Open in browser: `http://YOUR-PUBLIC-IP:5000/api/health`

## Step 8: Configure Security Group

1. AWS Console → EC2 → Your instance
2. Security tab → Security group → Edit inbound rules
3. Add: Custom TCP, Port 5000, Source 0.0.0.0/0
4. Save

## Step 9: Set Amplify Environment Variable

1. Amplify Console → Your app → App settings → Environment variables
2. Add: `VITE_API_URL` = `http://YOUR-PUBLIC-IP:5000`
3. Save and redeploy

## Useful Commands

```bash
# View logs
pm2 logs analytics-api

# Restart
pm2 restart analytics-api

# Stop
pm2 stop analytics-api

# Check status
pm2 status
```



