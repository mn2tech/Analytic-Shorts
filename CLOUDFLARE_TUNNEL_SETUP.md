# Quick HTTPS Setup with Cloudflare Tunnel (No Domain Needed)

This is the fastest way to get HTTPS for your EC2 backend without needing a domain name.

## Step 1: Install Cloudflared on EC2

```bash
# Download cloudflared
cd ~
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64

# Make it executable
chmod +x cloudflared-linux-amd64

# Move to system path
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared

# Verify installation
cloudflared --version
```

## Step 2: Login to Cloudflare

```bash
cloudflared tunnel login
```

This will:
1. Open a browser window
2. Ask you to login to Cloudflare (create free account if needed)
3. Authorize the tunnel

**Note:** If you don't have a Cloudflare account, create one at https://dash.cloudflare.com (it's free).

## Step 3: Create a Tunnel

```bash
cloudflared tunnel create analytics-api
```

This creates a tunnel and saves credentials. You'll see output like:
```
Created tunnel analytics-api with id: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

## Step 4: Create a Quick Tunnel (Temporary URL)

For immediate testing, you can use a quick tunnel:

```bash
# Run tunnel (this gives you a temporary HTTPS URL)
cloudflared tunnel --url http://localhost:5000
```

This will output something like:
```
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
|  https://xxxx-xxxx-xxxx.trycloudflare.com                                                 |
|  +--------------------------------------------------------------------------------------------+
```

**Copy that HTTPS URL** - that's your backend URL!

## Step 5: Update Amplify Environment Variable

1. Go to Amplify Console → Environment variables
2. Update `VITE_API_URL` to the Cloudflare tunnel URL (e.g., `https://xxxx-xxxx-xxxx.trycloudflare.com`)
3. Save and redeploy

## Step 6: Run Tunnel with PM2 (Persistent)

For a permanent solution, run the tunnel with PM2:

```bash
# Create tunnel config
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

Add:
```yaml
tunnel: <your-tunnel-id>  # From Step 3
credentials-file: /home/raj/.cloudflared/<tunnel-id>.json

ingress:
  - service: http://localhost:5000
```

Then run with PM2:
```bash
pm2 start cloudflared --name cloudflare-tunnel -- tunnel run analytics-api
pm2 save
```

## Alternative: Use a Subdomain (If You Have a Domain)

If you have a domain, you can use a subdomain:

```bash
# Route DNS
cloudflared tunnel route dns analytics-api api.yourdomain.com

# Update config
nano ~/.cloudflared/config.yml
```

Add:
```yaml
tunnel: <tunnel-id>
credentials-file: /home/raj/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: api.yourdomain.com
    service: http://localhost:5000
  - service: http_status:404
```

Then use: `https://api.yourdomain.com` in Amplify.

## Quick Test Method (Easiest)

For immediate testing, just run:

```bash
cloudflared tunnel --url http://localhost:5000
```

Copy the HTTPS URL it gives you, update Amplify, and test!





