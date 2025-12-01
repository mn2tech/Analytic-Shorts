# AWS Amplify Deployment Guide

This guide will help you deploy the NM2TECH Analytics Shorts application to AWS Amplify.

## 🏠 Running Locally First (Recommended)

**It's a good idea to test everything locally before deploying!** This helps you catch issues early.

### Running the Backend Locally

#### On Linux/EC2 Server:

1. **Find where your project is located**:
   ```bash
   # Check if you cloned it from git
   ls -la ~/
   ls -la ~/Analytic-Shorts
   
   # Or search for it
   find ~ -name "backend" -type d 2>/dev/null
   find ~ -name "package.json" -path "*/backend/*" 2>/dev/null
   ```

2. **If you need to clone the repository**:
   ```bash
   cd ~
   git clone https://github.com/mn2tech/Analytic-Shorts.git
   cd Analytic-Shorts/backend
   ```

3. **Navigate to the backend folder**:
   ```bash
   # If you found it, navigate there
   cd ~/Analytic-Shorts/backend
   # or wherever you found it
   ```

4. **Verify you're in the right place**:
   ```bash
   pwd  # Should show something like /home/raj/Analytic-Shorts/backend
   ls   # Should show: server.js, package.json, routes/, etc.
   ```

5. **Install dependencies**:
   ```bash
   npm install
   ```

6. **Set up environment variables** (if needed):
   ```bash
   # Create .env file if it doesn't exist
   touch .env
   
   # Add any required variables (e.g., OpenAI key)
   echo "OPENAI_API_KEY=your-key-here" >> .env
   # Or edit with nano:
   # nano .env
   ```

7. **Start the backend server**:
   ```bash
   npm start
   ```
   
   You should see something like:
   ```
   Server running on port 5000
   Server running at http://localhost:5000
   ```

8. **Test the backend** (open a new terminal/SSH session):
   ```bash
   # Test the health endpoint
   curl http://localhost:5000/api/health
   
   # Test the root endpoint
   curl http://localhost:5000/
   
   # Test an example endpoint
   curl http://localhost:5000/api/example/sales
   ```
   
   If these return data, your backend is working! ✅

9. **Keep the backend running** - leave this terminal open.

#### On Windows/Mac (Local Computer):

1. **Navigate to the backend folder**:
   ```bash
   cd backend
   # or full path:
   cd C:\Users\kolaw\Projects\NM2-Analytics-Shorts\backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables** (if needed):
   - Create a `.env` file in the `backend` folder
   - Add any required variables (e.g., `OPENAI_API_KEY=your-key-here`)

4. **Start the backend server**:
   ```bash
   npm start
   ```
   
   You should see something like:
   ```
   Server running on port 5000
   Server running at http://localhost:5000
   ```

5. **Test the backend** (open a new terminal):
   ```bash
   # Test the health endpoint
   curl http://localhost:5000/api/health
   
   # Test the root endpoint
   curl http://localhost:5000/
   
   # Test an example endpoint
   curl http://localhost:5000/api/example/sales
   ```
   
   If these return data, your backend is working! ✅

6. **Keep the backend running** - leave this terminal open.

### Running the Frontend Locally

**Option 1: Run Frontend and Backend Separately (Recommended for first-time setup)**

1. **Open a NEW terminal** (keep the backend terminal running)

2. **Navigate to the project root folder**:
   ```bash
   cd path/to/NM2-Analytics-Shorts
   # or if you're already in backend folder:
   cd ..
   ```

3. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

4. **Create a `.env` file** in the root folder:
   ```bash
   # On Windows (PowerShell)
   New-Item .env
   
   # On Mac/Linux
   touch .env
   ```

5. **Add the backend URL to `.env`**:
   ```
   VITE_API_URL=http://localhost:5000
   ```
   
   **Important**: 
   - Use `http://localhost:5000` (not `https://`)
   - No trailing slash
   - No `/api` at the end

6. **Start the frontend development server**:
   ```bash
   npm run dev
   ```
   
   You should see something like:
   ```
   VITE v5.x.x  ready in xxx ms
   
   ➜  Local:   http://localhost:5173/
   ➜  Network: use --host to expose
   ```

7. **Open your browser** and go to:
   ```
   http://localhost:5173
   ```

8. **Test the application**:
   - Try uploading a file
   - Try using an example dataset
   - Check the browser console (F12) for any errors
   - If everything works, you're ready to deploy! ✅

**Option 2: Run Both Frontend and Backend Together (Easier)**

If you want to run both in one command:

1. **Navigate to the project root folder**:
   ```bash
   cd path/to/NM2-Analytics-Shorts
   ```

2. **Make sure dependencies are installed**:
   ```bash
   npm install
   cd backend && npm install && cd ..
   ```

3. **Create a `.env` file** in the root folder with:
   ```
   VITE_API_URL=http://localhost:5000
   ```

4. **Run both frontend and backend together**:
   ```bash
   npm run dev:all
   ```
   
   This will start:
   - Backend on `http://localhost:5000`
   - Frontend on `http://localhost:5173`
   
   Both will run in the same terminal window.

5. **Open your browser** and go to `http://localhost:5173`

### Troubleshooting Local Setup

#### ❌ Error: "ERR_CONNECTION_REFUSED" or "localhost refused to connect"

This means nothing is running on that port. Follow these steps:

**Step 1: Check if the server is actually running**

Open your terminal and look for:
- Backend: Should show `Server running on port 5000` or similar
- Frontend: Should show `Local: http://localhost:5173/`

If you don't see these messages, the server isn't running!

**Step 2: Start the servers properly**

**For Backend:**
```bash
# Make sure you're in the backend folder
cd backend

# Check if dependencies are installed
ls node_modules  # Should show folders, not "No such file"

# If node_modules doesn't exist, install:
npm install

# Start the backend
npm start
```

You should see output like:
```
Server running on port 5000
Server running at http://localhost:5000
```

**For Frontend:**
```bash
# Make sure you're in the project root (not backend folder)
cd ..  # If you're in backend folder
# or
cd path/to/NM2-Analytics-Shorts  # If you're somewhere else

# Check if dependencies are installed
ls node_modules  # Should show folders

# If node_modules doesn't exist, install:
npm install

# Create .env file if it doesn't exist
echo "VITE_API_URL=http://localhost:5000" > .env

# Start the frontend
npm run dev
```

You should see output like:
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

**Step 3: Verify the correct URL**

- **Frontend**: `http://localhost:5173` (or the port shown in terminal)
- **Backend API**: `http://localhost:5000` (for testing API directly)

**Step 4: Check if ports are already in use**

**On Windows (PowerShell):**
```powershell
# Check port 5000 (backend)
netstat -ano | findstr :5000

# Check port 5173 (frontend)
netstat -ano | findstr :5173
```

**On Mac/Linux:**
```bash
# Check port 5000 (backend)
lsof -i :5000

# Check port 5173 (frontend)
lsof -i :5173
```

If something is using the port, you'll see output. You can either:
- Stop the other process using that port
- Or use a different port (see below)

**Step 5: Try a different port if needed**

If a port is in use, you can change it:

**For Backend** (edit `backend/server.js`):
```javascript
const PORT = process.env.PORT || 5001;  // Change 5000 to 5001
```

Then update `.env`:
```
VITE_API_URL=http://localhost:5001
```

**For Frontend:**
```bash
npm run dev -- --port 3000
```

Then access `http://localhost:3000` instead of `http://localhost:5173`

**Step 6: Common mistakes to check**

- ❌ Trying to access `https://localhost` (should be `http://`)
- ❌ Server not started (no `npm start` or `npm run dev` command run)
- ❌ Wrong folder (running commands in wrong directory)
- ❌ Dependencies not installed (no `node_modules` folder)
- ❌ Typo in URL (e.g., `localhost:5173` vs `localhost:5174`)

**Quick Diagnostic Checklist:**

Run these commands and check the output:

```bash
# 1. Check if Node.js is installed
node --version
# Should show: v18.x.x or higher

# 2. Check if npm is installed
npm --version
# Should show: 9.x.x or higher

# 3. Check if you're in the right folder (for backend)
cd backend
pwd  # or 'cd' on Windows
# Should show: .../NM2-Analytics-Shorts/backend

# 4. Check if backend dependencies are installed
ls node_modules  # Should show many folders, not an error

# 5. Try starting backend
npm start
# Should show: "Server running on port 5000"

# 6. In a NEW terminal, check if frontend dependencies are installed
cd ..  # Go to project root
ls node_modules  # Should show many folders

# 7. Try starting frontend
npm run dev
# Should show: "Local: http://localhost:5173/"
```

**Backend won't start:**
- Check if port 5000 is already in use (see Step 4 above)
- Make sure you're in the `backend` folder
- Check that `npm install` completed successfully
- Check for error messages in the terminal

**Frontend can't connect to backend:**
- Make sure backend is running on `http://localhost:5000` (check terminal)
- Verify `.env` file exists in project root with `VITE_API_URL=http://localhost:5000`
- Restart the frontend dev server after changing `.env`
- Check browser console (F12) for CORS errors (backend should allow `http://localhost:5173`)
- Make sure you're using `http://` not `https://`

**Port 5173 is already in use:**
- Vite will automatically try the next port (5174, 5175, etc.) - check the terminal output
- Or specify a different port: `npm run dev -- --port 3000`

### What's Next?

Once everything works locally:
1. ✅ Backend runs on `http://localhost:5000`
2. ✅ Frontend runs on `http://localhost:5173`
3. ✅ Frontend can communicate with backend
4. ✅ You can upload files and see results

**Then proceed to the deployment steps below!**

---

## 🚀 Getting Started - Step by Step

Follow these steps in order to deploy your application:

### Step 1: Set Up Your Backend (Choose One Method)

#### Option A: Using EC2 + Cloudflare Tunnel (Recommended for Quick Start)

1. **Connect to your EC2 instance** (or server where you'll run the backend):
   ```bash
   ssh -i your-key.pem ec2-user@your-ec2-ip
   ```

2. **Install Node.js** (if not already installed):
   ```bash
   curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
   sudo yum install -y nodejs
   node --version  # Should show v18 or higher
   ```

3. **Clone your repository** (or upload your code):
   ```bash
   git clone https://github.com/mn2tech/Analytic-Shorts.git
   cd Analytic-Shorts/backend
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Start your backend server**:
   ```bash
   npm start
   ```
   You should see: `Server running on port 5000` or similar.
   
   **Keep this terminal open!** The backend needs to keep running.

6. **Open a NEW terminal** (SSH into the same server again) and install Cloudflare Tunnel:
   ```bash
   wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
   chmod +x cloudflared-linux-amd64
   sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
   ```

7. **Start the Cloudflare Tunnel**:
   ```bash
   cloudflared tunnel --url http://localhost:5000
   ```

8. **Copy the URL** that appears. It will look like:
   ```
   https://addresses-population-eat-settled.trycloudflare.com
   ```
   
   **Write this URL down!** You'll need it in Step 3.
   
   **Keep this terminal open too!** The tunnel needs to keep running.

9. **Test your backend** (from your local computer):
   ```bash
   curl https://your-tunnel-url.trycloudflare.com/api/health
   ```
   If you get a response, your backend is working! ✅

#### Option B: Using Local Computer + Cloudflare Tunnel

If you want to run the backend on your local computer:

1. **On your local computer**, navigate to the backend folder:
   ```bash
   cd path/to/Analytic-Shorts/backend
   npm install
   npm start
   ```

2. **In a new terminal**, install and run Cloudflare Tunnel:
   ```bash
   # On Windows, download from: https://github.com/cloudflare/cloudflared/releases
   # Or use: winget install --id Cloudflare.cloudflared
   cloudflared tunnel --url http://localhost:5000
   ```

3. **Copy the tunnel URL** and test it.

---

### Step 2: Deploy Frontend to AWS Amplify

1. **Go to AWS Amplify Console**:
   - Visit: https://console.aws.amazon.com/amplify
   - Sign in to your AWS account

2. **Create a new app**:
   - Click **"New app"** → **"Host web app"**
   - Select **"GitHub"** as your source
   - Authorize GitHub if prompted
   - Select repository: `mn2tech/Analytic-Shorts`
   - Select branch: `main`
   - Click **"Next"**

3. **Review build settings**:
   - Amplify should auto-detect your `amplify.yml` file
   - Verify:
     - Build command: `npm run build`
     - Output directory: `dist`
   - Click **"Next"**

4. **Review and create**:
   - Review the settings
   - Click **"Save and deploy"**
   - Wait for the build to complete (3-5 minutes)

---

### Step 3: Connect Frontend to Backend

1. **Get your backend URL**:
   - If using Cloudflare Tunnel: Use the URL from Step 1 (e.g., `https://addresses-population-eat-settled.trycloudflare.com`)
   - If using EC2 directly: Use `http://YOUR_EC2_IP:5000` (or your domain)
   - If using API Gateway: Use the Invoke URL from AWS Console

2. **Add environment variable in Amplify**:
   - In Amplify Console, go to your app
   - Click **"App settings"** (left sidebar)
   - Click **"Environment variables"**
   - Click **"Manage variables"**
   - Click **"Add variable"**
   - **Key**: `VITE_API_URL`
   - **Value**: Your backend URL (e.g., `https://addresses-population-eat-settled.trycloudflare.com`)
   - **Important**: 
     - ✅ Do NOT add a trailing slash (`/`)
     - ✅ Do NOT include `/api` in the URL
     - ✅ Use `https://` (not `http://`)
   - Click **"Save"**

3. **Redeploy your app**:
   - Go to your app's main page
   - Click **"Redeploy this version"** (or trigger a new deployment)
   - Wait for the deployment to complete

---

### Step 4: Test Your Deployment

1. **Visit your Amplify app URL**:
   - It will be something like: `https://main.xxxxx.amplifyapp.com`
   - You can find it in the Amplify Console

2. **Test the connection**:
   - Open your app in a browser
   - Open Developer Tools (F12) → Console tab
   - Look for any errors
   - Try uploading a file or using an example dataset
   - If it works, you're done! 🎉

3. **If you see "Cannot connect to backend server"**:
   - Go back to Step 3 and verify:
     - Backend is still running
     - Cloudflare Tunnel is still running (if using it)
     - `VITE_API_URL` is set correctly
     - You redeployed after setting the variable

---

### Step 5: Keep Everything Running

**Important**: For your app to work, these must stay running:

- ✅ Backend server (`npm start` on your server)
- ✅ Cloudflare Tunnel (if using it)
- ✅ Frontend is deployed on Amplify (this stays running automatically)

**Tip**: To keep processes running after you disconnect:
- Use `screen` or `tmux` on Linux
- Or set up the backend as a service
- Or use `nohup` command

---

## Quick Start - Simple Overview

Here's what you need to do in simple terms:

1. **Your app has 2 parts**:
   - **Frontend** (the website users see) → Deploy to AWS Amplify
   - **Backend** (the API that processes data) → Deploy separately (EC2, Cloudflare Tunnel, etc.)

2. **The frontend needs to know where the backend is**:
   - You'll set an environment variable `VITE_API_URL` in Amplify
   - This tells the frontend: "Hey, your backend is at this URL"

3. **That's it!** Once both are running and connected, your app works.

### Most Common Setup (Using Cloudflare Tunnel)

If you're running your backend on an EC2 server or locally, here's the simplest path:

1. **On your server/EC2**, start your backend:
   ```bash
   cd backend
   npm start
   ```
   (This runs on `http://localhost:5000`)

2. **On the same server**, start Cloudflare Tunnel:
   ```bash
   cloudflared tunnel --url http://localhost:5000
   ```
   Copy the URL it gives you (e.g., `https://addresses-population-eat-settled.trycloudflare.com`)

3. **In AWS Amplify**, set environment variable:
   - Go to your app → App settings → Environment variables
   - Add: `VITE_API_URL` = `https://addresses-population-eat-settled.trycloudflare.com`
   - Redeploy your app

4. **Done!** Your frontend can now talk to your backend.

---

## Common Questions (FAQ)

### Q: What exactly is the backend API URL?
**A:** It's the web address where your backend server is accessible. Think of it like a phone number - the frontend needs to "call" this address to get data.

### Q: Do I need to deploy the backend first or the frontend first?
**A:** Either way works, but it's easier if you:
1. Get your backend running and accessible (get the URL)
2. Then deploy the frontend with that URL configured

### Q: What if I don't have a backend URL yet?
**A:** You have a few options:
- Use Cloudflare Tunnel (easiest for testing) - see Option 5 below
- Deploy to EC2 and use the EC2 public IP
- Use AWS API Gateway (more complex but production-ready)

### Q: Why do I need Cloudflare Tunnel?
**A:** You don't always need it! But it's useful if:
- Your backend is running on your local computer
- Your EC2 instance doesn't have a public IP or domain
- You want to test quickly without setting up SSL certificates

### Q: The URL keeps changing with Cloudflare Tunnel. Is that normal?
**A:** Yes! Quick tunnels (the free ones) give you a new URL each time. For production, you'd set up a "named tunnel" that has a permanent URL.

### Q: What's the difference between frontend and backend?
**A:** 
- **Frontend** = The website users see (HTML, CSS, JavaScript) → Deployed to Amplify
- **Backend** = The server that processes data, handles file uploads, generates insights → Deployed separately

### Q: Can I skip the backend and just deploy the frontend?
**A:** No, the frontend needs the backend to work. The backend handles:
- File uploads
- Data processing
- AI insights
- Example datasets

### Q: I'm getting "Cannot connect to backend server" error. What do I do?
**A:** Check these in order:
1. Is your backend actually running? (Test with `curl http://localhost:5000/api/health` on the server)
2. Is the backend accessible from the internet? (Test the URL from your computer)
3. Is `VITE_API_URL` set correctly in Amplify? (No trailing slash, no `/api`)
4. Did you redeploy after setting the environment variable?

---

## Prerequisites

1. AWS Account
2. GitHub repository connected (already done: https://github.com/mn2tech/Analytic-Shorts)
3. Backend API endpoint (see Backend Setup section)

## Frontend Deployment (AWS Amplify)

### Step 1: Connect Repository to Amplify

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify)
2. Click **"New app"** → **"Host web app"**
3. Select **GitHub** as your source
4. Authorize GitHub if needed
5. Select repository: `mn2tech/Analytic-Shorts`
6. Select branch: `main`
7. Click **"Next"**

### Step 2: Configure Build Settings

Amplify should auto-detect the `amplify.yml` file. Verify these settings:

- **Build command**: `npm run build`
- **Output directory**: `dist`
- **Node version**: 18.x or higher

### Step 3: Environment Variables

Add these environment variables in Amplify Console → App settings → Environment variables:

```
VITE_API_URL=https://your-backend-api-url.com
```

**Important**: 
- Replace `https://your-backend-api-url.com` with your actual backend API URL
- **Do NOT include a trailing slash** (`/`) at the end
- **Do NOT include `/api`** in the URL (the frontend adds this automatically)
- Use `https://` protocol (required for production)
- After adding/updating, you must **redeploy** your app for changes to take effect

**Examples**:
- ✅ `https://addresses-population-eat-settled.trycloudflare.com`
- ✅ `https://api.example.com`
- ❌ `https://api.example.com/` (trailing slash)
- ❌ `https://api.example.com/api` (includes /api)

### How to Find Your Backend API URL

The method to find your backend API URL depends on how you've deployed your backend:

#### If Using Cloudflare Tunnel

1. **Start the tunnel**:
   ```bash
   cloudflared tunnel --url http://localhost:5000
   ```

2. **Look for the URL in the output**:
   ```
   Your quick Tunnel has been created! Visit it at:
   https://addresses-population-eat-settled.trycloudflare.com
   ```
   The URL shown is your backend API URL.

3. **Test it**:
   ```bash
   curl https://addresses-population-eat-settled.trycloudflare.com/api/health
   ```

**Note**: This URL changes each time you restart the tunnel. For a permanent URL, set up a named tunnel.

#### If Using EC2 Instance

1. **Find your EC2 public IP or domain**:
   - Go to AWS Console → EC2 → Instances
   - Select your instance
   - Copy the **Public IPv4 address** or **Public IPv4 DNS**

2. **Your API URL will be**:
   - `http://YOUR_EC2_IP:5000` (if using HTTP)
   - `https://YOUR_EC2_DOMAIN` (if you've set up SSL/HTTPS)

3. **Test it**:
   ```bash
   curl http://YOUR_EC2_IP:5000/api/health
   ```

**Note**: Ensure your EC2 security group allows inbound traffic on port 5000 (or 80/443 if using a reverse proxy).

#### If Using AWS API Gateway

1. **Go to API Gateway Console**:
   - AWS Console → API Gateway → Your API

2. **Find the Invoke URL**:
   - Go to **Stages** → Select your stage (e.g., `prod`, `dev`)
   - Copy the **Invoke URL** shown at the top
   - Example: `https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod`

3. **Your API URL is the Invoke URL** (without `/api` at the end)

4. **Test it**:
   ```bash
   curl https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod/api/health
   ```

#### If Using AWS Elastic Beanstalk

1. **Go to Elastic Beanstalk Console**:
   - AWS Console → Elastic Beanstalk → Your environment

2. **Find the URL**:
   - The **URL** is shown at the top of the environment dashboard
   - Example: `http://myapp-env.eba-abc123.us-east-1.elasticbeanstalk.com`

3. **Your API URL is this URL** (without `/api` at the end)

4. **Test it**:
   ```bash
   curl http://myapp-env.eba-abc123.us-east-1.elasticbeanstalk.com/api/health
   ```

#### If Using a Custom Domain

1. **Your API URL is your custom domain**:
   - Example: `https://api.yourdomain.com`

2. **Test it**:
   ```bash
   curl https://api.yourdomain.com/api/health
   ```

#### Quick Test Method

Once you have a potential URL, test it from your local machine:

```bash
# Test the root endpoint (should return API info)
curl https://your-api-url.com/

# Test the health endpoint
curl https://your-api-url.com/api/health

# Test an example endpoint
curl https://your-api-url.com/api/example/sales
```

If these commands return data (not connection errors), you've found the correct URL!

### Step 4: Deploy

1. Click **"Save and deploy"**
2. Wait for the build to complete (usually 3-5 minutes)
3. Your app will be live at: `https://main.xxxxx.amplifyapp.com`

## Backend Setup Options

The backend needs to be hosted separately. Here are your options:

### Option 1: AWS Lambda + API Gateway (Recommended)

1. **Create Lambda Functions**:
   - Upload handler
   - Insights handler
   - Example data handler

2. **Set up API Gateway**:
   - Create REST API
   - Configure CORS
   - Connect Lambda functions
   - Deploy to stage

3. **Update Environment Variable**:
   - In Amplify, set `VITE_API_URL` to your API Gateway endpoint

### Option 2: AWS Elastic Beanstalk

1. Package backend:
   ```bash
   cd backend
   zip -r ../backend.zip . -x "node_modules/*" "uploads/*"
   ```

2. Deploy to Elastic Beanstalk:
   - Create new application
   - Upload `backend.zip`
   - Configure environment variables

3. Update `VITE_API_URL` in Amplify

### Option 3: EC2 Instance

1. Launch EC2 instance (t2.micro is fine for testing)
2. Install Node.js
3. Clone repository
4. Run backend:
   ```bash
   cd backend
   npm install
   npm start
   ```
5. Configure security group to allow HTTP/HTTPS
6. Update `VITE_API_URL` in Amplify

### Option 4: Use Existing Backend

If you already have a backend server, just update the `VITE_API_URL` environment variable in Amplify.

### Option 5: Cloudflare Tunnel (For Testing/Development)

Cloudflare Tunnel is useful for exposing local or EC2 backends without opening firewall ports.

1. **Install cloudflared**:
   ```bash
   # On Linux
   wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
   chmod +x cloudflared-linux-amd64
   sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
   ```

2. **Start the tunnel**:
   ```bash
   cloudflared tunnel --url http://localhost:5000
   ```

3. **Note the tunnel URL**:
   - The tunnel will provide a URL like: `https://addresses-population-eat-settled.trycloudflare.com`
   - This URL is temporary and changes each time you restart the tunnel
   - For production, set up a named tunnel: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps

4. **Update `VITE_API_URL` in Amplify**:
   - Set it to your Cloudflare tunnel URL
   - Example: `https://addresses-population-eat-settled.trycloudflare.com`

**Important Notes**:
- Quick tunnels (account-less) have no uptime guarantee and are for testing only
- The tunnel URL changes each time you restart
- For production, use a named tunnel with a Cloudflare account
- Keep the `cloudflared` process running while your backend is active

## 🏭 Production Setup

For production, you need a **permanent, stable backend URL** that doesn't change. Here are the best options:

### Option 1: Cloudflare Named Tunnel (Recommended for EC2)

This gives you a permanent URL with your own domain or a stable Cloudflare subdomain.

#### Step 1: Create a Cloudflare Account (Free)

1. Go to https://dash.cloudflare.com/sign-up
2. Sign up for a free account
3. Add your domain (or use Cloudflare's free subdomain)

#### Step 2: Create a Named Tunnel

1. **Install cloudflared** (if not already installed):
   ```bash
   wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
   chmod +x cloudflared-linux-amd64
   sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
   ```

2. **Login to Cloudflare**:
   ```bash
   cloudflared tunnel login
   ```
   This will open a browser window to authenticate.

3. **Create a named tunnel**:
   ```bash
   cloudflared tunnel create nm2tech-backend
   ```
   This creates a tunnel named `nm2tech-backend`.

4. **Create a configuration file**:
   ```bash
   mkdir -p ~/.cloudflared
   nano ~/.cloudflared/config.yml
   ```
   
   Add this configuration:
   ```yaml
   tunnel: nm2tech-backend
   credentials-file: /home/raj/.cloudflared/<tunnel-id>.json
   
   ingress:
     - hostname: api.yourdomain.com  # Replace with your domain
       service: http://localhost:5000
     - service: http_status:404
   ```
   
   **Or if you don't have a domain**, use Cloudflare's free subdomain:
   ```yaml
   tunnel: nm2tech-backend
   credentials-file: /home/raj/.cloudflared/<tunnel-id>.json
   
   ingress:
     - hostname: nm2tech-backend.trycloudflare.com
       service: http://localhost:5000
     - service: http_status:404
   ```

5. **Route the tunnel** (if using your own domain):
   ```bash
   cloudflared tunnel route dns nm2tech-backend api.yourdomain.com
   ```

6. **Run the tunnel**:
   ```bash
   cloudflared tunnel run nm2tech-backend
   ```

7. **Set up as a system service** (so it runs automatically):
   ```bash
   sudo cloudflared service install
   sudo systemctl enable cloudflared
   sudo systemctl start cloudflared
   ```

**Your permanent URL will be**: `https://api.yourdomain.com` or `https://nm2tech-backend.trycloudflare.com`

#### Step 3: Set Up Backend as a Service

To keep your backend running automatically:

1. **Create a systemd service file**:
   ```bash
   sudo nano /etc/systemd/system/nm2tech-backend.service
   ```

2. **Add this content**:
   ```ini
   [Unit]
   Description=NM2TECH Analytics Backend
   After=network.target

   [Service]
   Type=simple
   User=raj
   WorkingDirectory=/home/raj/Analytic-Shorts/backend
   Environment="NODE_ENV=production"
   ExecStart=/usr/bin/node server.js
   Restart=always
   RestartSec=10

   [Install]
   WantedBy=multi-user.target
   ```

3. **Enable and start the service**:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable nm2tech-backend
   sudo systemctl start nm2tech-backend
   ```

4. **Check status**:
   ```bash
   sudo systemctl status nm2tech-backend
   ```

### Option 2: EC2 with Domain + SSL (Traditional Setup)

1. **Get a domain** (from Route 53, Namecheap, GoDaddy, etc.)

2. **Point DNS to your EC2**:
   - Create an A record: `api.yourdomain.com` → Your EC2 public IP

3. **Set up SSL with Let's Encrypt**:
   ```bash
   # Install certbot
   sudo yum install certbot python3-certbot-nginx -y
   
   # Get certificate
   sudo certbot certonly --standalone -d api.yourdomain.com
   
   # Set up auto-renewal
   sudo systemctl enable certbot-renew.timer
   ```

4. **Use Nginx as reverse proxy**:
   ```bash
   sudo yum install nginx -y
   sudo nano /etc/nginx/conf.d/api.conf
   ```
   
   Add:
   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;
       return 301 https://$server_name$request_uri;
   }

   server {
       listen 443 ssl;
       server_name api.yourdomain.com;

       ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   
   ```bash
   sudo systemctl start nginx
   sudo systemctl enable nginx
   ```

**Your URL will be**: `https://api.yourdomain.com`

### Option 3: AWS API Gateway + Lambda (Serverless)

This is more complex but scales automatically and has no server management.

1. **Package your backend for Lambda** (already has `lambda.js` and `serverless.yml`)

2. **Deploy using Serverless Framework**:
   ```bash
   cd backend
   npm install -g serverless
   serverless deploy
   ```

3. **Get the API Gateway URL** from the output

**Your URL will be**: `https://xxxxx.execute-api.us-east-1.amazonaws.com/prod`

### Option 4: AWS Elastic Beanstalk (Managed)

1. **Package your backend**:
   ```bash
   cd backend
   zip -r ../backend.zip . -x "node_modules/*" "uploads/*"
   ```

2. **Deploy to Elastic Beanstalk**:
   - Go to AWS Console → Elastic Beanstalk
   - Create new application
   - Upload `backend.zip`
   - Configure environment

**Your URL will be**: `http://your-app.eba-xxxxx.us-east-1.elasticbeanstalk.com`

### Production Checklist

- [ ] Backend has a permanent, stable URL
- [ ] Backend runs as a service (auto-starts on reboot)
- [ ] SSL/HTTPS is configured
- [ ] Monitoring/logging is set up
- [ ] Backups are configured
- [ ] Environment variables are set securely
- [ ] CORS is configured for your Amplify domain only
- [ ] Rate limiting is configured (if needed)
- [ ] `VITE_API_URL` is updated in Amplify with production URL

### Recommended Production Setup

**For most users**: **Option 1 (Cloudflare Named Tunnel)** is the easiest:
- ✅ Free
- ✅ Automatic SSL
- ✅ No firewall configuration needed
- ✅ Permanent URL
- ✅ Easy to set up

**For enterprise**: **Option 2 (EC2 + Domain + SSL)** gives you:
- ✅ Full control
- ✅ Your own domain
- ✅ Better for compliance requirements

## Custom Domain (Optional)

1. In Amplify Console → Domain management
2. Add your custom domain
3. Follow DNS configuration instructions
4. SSL certificate is automatically provisioned

## API Endpoints Reference

The NM2TECH Analytics Shorts API provides the following endpoints:

### Health Check
- **GET** `/api/health` - Check API status

### Main Endpoints
- **POST** `/api/upload` - Upload CSV/Excel file for analysis
- **POST** `/api/insights` - Generate AI-powered insights from data

### Example Datasets
- **GET** `/api/example/sales` - Get sample sales data
- **GET** `/api/example/attendance` - Get sample attendance data
- **GET** `/api/example/donations` - Get sample donations data
- **GET** `/api/example/medical` - Get sample medical data

### API Information
To get API information, make a GET request to the root endpoint. The response includes:
```json
{
  "message": "NM2TECH Analytics Shorts API",
  "version": "1.0.0",
  "endpoints": {
    "health": "GET /api/health",
    "upload": "POST /api/upload",
    "insights": "POST /api/insights",
    "examples": {
      "sales": "GET /api/example/sales",
      "attendance": "GET /api/example/attendance",
      "donations": "GET /api/example/donations",
      "medical": "GET /api/example/medical"
    }
  }
}
```

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `https://api.example.com` |
| `OPENAI_API_KEY` | (Backend only) OpenAI API key for AI insights | `sk-...` |

## Testing the API

After setting up your backend, you can test the API endpoints:

### Test Health Endpoint
```bash
curl https://your-api-url.com/api/health
```

### Test Example Datasets
```bash
# Test sales example
curl https://your-api-url.com/api/example/sales

# Test attendance example
curl https://your-api-url.com/api/example/attendance

# Test donations example
curl https://your-api-url.com/api/example/donations

# Test medical example
curl https://your-api-url.com/api/example/medical
```

### Test File Upload
```bash
curl -X POST https://your-api-url.com/api/upload \
  -F "file=@your-data.csv" \
  -F "name=Your Dataset Name"
```

### Get API Information
```bash
curl https://your-api-url.com/
```

**Note**: Replace `https://your-api-url.com` with your actual backend URL (e.g., your Cloudflare tunnel URL or EC2 instance URL).

## Troubleshooting

### "Cannot connect to backend server" Error

If you see the error: *"Cannot connect to backend server. Please ensure the API is running and VITE_API_URL is configured in Amplify environment variables."*, follow these steps:

#### Step 1: Verify Backend is Running

1. **Check if your backend server is running**:
   ```bash
   # On your server/EC2 instance
   curl http://localhost:5000/api/health
   ```
   You should get a response. If not, start your backend:
   ```bash
   cd backend
   npm start
   ```

2. **If using Cloudflare Tunnel**, ensure it's running:
   ```bash
   cloudflared tunnel --url http://localhost:5000
   ```
   Keep this process running in a separate terminal/session.

#### Step 2: Verify API is Accessible from Internet

Test your API URL from your local machine (not the server):

```bash
# Replace with your actual API URL
curl https://your-api-url.com/api/health

# Or if using Cloudflare tunnel
curl https://addresses-population-eat-settled.trycloudflare.com/api/health
```

**Expected response**: Should return API status. If you get connection errors, the API is not accessible from the internet.

#### Step 3: Configure VITE_API_URL in Amplify

1. **Go to AWS Amplify Console**:
   - Navigate to your app → **App settings** → **Environment variables**

2. **Add or Update the Variable**:
   - **Key**: `VITE_API_URL`
   - **Value**: Your backend API URL (e.g., `https://addresses-population-eat-settled.trycloudflare.com`)
   - **Important**: 
     - Do NOT include a trailing slash (`/`)
     - Use `https://` (not `http://`)
     - Do NOT include `/api` in the URL (the frontend adds this automatically)

3. **Redeploy**:
   - After adding/updating the environment variable, you must **redeploy** your app
   - Go to **App settings** → **Build settings** → Click **Redeploy this version** or trigger a new deployment

#### Step 4: Verify URL Format

**Correct format**:
```
✅ https://addresses-population-eat-settled.trycloudflare.com
✅ https://api.example.com
✅ https://your-ec2-instance.com
```

**Incorrect formats**:
```
❌ https://addresses-population-eat-settled.trycloudflare.com/  (trailing slash)
❌ https://addresses-population-eat-settled.trycloudflare.com/api  (includes /api)
❌ http://addresses-population-eat-settled.trycloudflare.com  (http instead of https)
❌ addresses-population-eat-settled.trycloudflare.com  (missing protocol)
```

#### Step 5: Check CORS Configuration

Your backend must allow requests from your Amplify domain. Verify CORS is configured:

```javascript
// Backend should allow your Amplify domain
app.use(cors({
  origin: [
    'https://main.xxxxx.amplifyapp.com',
    'https://*.amplifyapp.com',  // Allow all Amplify domains
    'http://localhost:5173'  // For local development
  ],
  credentials: true
}));
```

#### Step 6: Test from Browser Console

1. Open your deployed Amplify app in a browser
2. Open Developer Tools (F12) → Console tab
3. Check for errors related to API calls
4. Go to Network tab → Look for failed requests to `/api/health` or other endpoints
5. Check the request URL - it should be: `https://your-api-url.com/api/health`

#### Step 7: Verify Environment Variable is Loaded

In your browser console on the deployed app, run:
```javascript
console.log(import.meta.env.VITE_API_URL)
```

This should show your API URL. If it's `undefined`, the environment variable is not set correctly.

#### Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| Backend not accessible | Ensure backend is running and accessible from internet (use Cloudflare tunnel or configure firewall) |
| CORS errors | Update backend CORS to allow your Amplify domain |
| 404 errors | Verify API URL doesn't include `/api` path |
| Connection timeout | Check if backend server is running and tunnel is active |
| Environment variable not updating | Redeploy the app after changing environment variables |

### Build Fails
- Check Node.js version (should be 18+)
- Verify `amplify.yml` syntax
- Check build logs in Amplify Console

### API Calls Fail
- Verify `VITE_API_URL` is set correctly
- Check CORS configuration on backend
- Ensure backend is accessible from internet

### PWA Not Working
- Ensure icons are in `public/` folder
- Check service worker registration
- Verify HTTPS is enabled (required for PWA)

## Post-Deployment Checklist

- [ ] Frontend deployed successfully
- [ ] Backend API is accessible
- [ ] Environment variables configured
- [ ] CORS configured on backend
- [ ] Test file upload
- [ ] Test example datasets
- [ ] Test AI insights (if OpenAI key is set)
- [ ] Test shareable dashboard links
- [ ] Verify PWA installation works
- [ ] Test on mobile devices

## Support

For issues, check:
- Amplify build logs
- Browser console for frontend errors
- Backend server logs
- Network tab for API call failures


