# How to Find Your Backend Server

## 🔍 Where is the Backend?

### **1. Backend Code Location**

The backend code is in your project:
```
C:\Users\kolaw\Projects\NM2-Analytics-Shorts\backend\
```

Main file: `backend/server.js`

---

## 🚀 Is Your Backend Running?

### **Check if Backend is Running Locally**

Open PowerShell and run:

```powershell
# Check if something is running on port 5000
netstat -ano | findstr :5000
```

Or test the health endpoint:

```powershell
curl http://localhost:5000/api/health
```

**If you see:**
- ✅ `{"status":"ok","message":"NM2TECH Analytics Shorts API is running"}` → Backend is running!
- ❌ Connection refused → Backend is NOT running

---

## 🏃 Start the Backend (If Not Running)

### **Option 1: Start Locally**

```powershell
cd C:\Users\kolaw\Projects\NM2-Analytics-Shorts\backend
npm start
```

You should see:
```
🚀 Server running on http://localhost:5000
```

**Keep this terminal open!** The backend needs to stay running.

---

## 🌐 Where is Your Backend Deployed?

The backend needs to be **deployed to a server** for your Amplify frontend to use it. Here are your options:

### **Option 1: Check if Already Deployed**

Do you have:
- ✅ An EC2 instance?
- ✅ A Railway account?
- ✅ A Render account?
- ✅ A Cloudflare Tunnel running?

### **Option 2: Quick Deployment Options**

#### **A. Railway (Fastest - 5 minutes)**

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. New Project → Deploy from GitHub
4. Select your repo
5. Set **Root Directory**: `backend`
6. Deploy!
7. Copy the URL (e.g., `https://your-app.railway.app`)

#### **B. Render (Free tier)**

1. Go to [render.com](https://render.com)
2. New → Web Service
3. Connect GitHub repo
4. Set **Root Directory**: `backend`
5. Deploy!
6. Copy the URL

#### **C. EC2 Instance**

If you have an AWS EC2 instance:
1. SSH into it
2. Deploy backend there
3. Get the public IP
4. Your URL: `http://YOUR-EC2-IP:5000`

#### **D. Cloudflare Tunnel (For Testing)**

If you want to test with local backend:

```powershell
# Install cloudflared (if not installed)
# Download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

# Start tunnel
cloudflared tunnel --url http://localhost:5000
```

Copy the URL it gives you (e.g., `https://xxxx-xxxx-xxxx.trycloudflare.com`)

---

## 📍 Finding Your Backend URL

### **If Using Railway:**
- Go to Railway dashboard
- Click your service
- Copy the URL from the "Domains" section

### **If Using Render:**
- Go to Render dashboard
- Click your service
- Copy the URL (e.g., `https://your-app.onrender.com`)

### **If Using EC2:**
```bash
# SSH into EC2 and run:
curl http://169.254.169.254/latest/meta-data/public-ipv4
```
Your URL: `http://YOUR-IP:5000`

### **If Using Cloudflare Tunnel:**
- The URL is shown when you start the tunnel
- Format: `https://xxxx-xxxx-xxxx.trycloudflare.com`

---

## ✅ Next Steps

Once you have your backend URL:

1. **Update `amplify.yml`:**
   ```yaml
   environment:
     VITE_API_URL: https://your-backend-url.com
   ```

2. **Or if you can access Environment variables in Amplify:**
   - Add: `VITE_API_URL` = `https://your-backend-url.com`

3. **Commit and push:**
   ```powershell
   git add amplify.yml
   git commit -m "Add backend URL"
   git push
   ```

---

## 🧪 Test Your Backend

Once you have a URL, test it:

```powershell
# Replace with your actual URL
curl https://your-backend-url.com/api/health
```

Should return: `{"status":"ok","message":"NM2TECH Analytics Shorts API is running"}`

---

## ❓ Still Not Sure?

**Answer these questions:**

1. **Have you deployed the backend anywhere?**
   - If NO → You need to deploy it (use Railway or Render)
   - If YES → Where? (EC2, Railway, Render, etc.)

2. **Is the backend running locally?**
   - Check: `curl http://localhost:5000/api/health`
   - If it works → You can use Cloudflare Tunnel to expose it

3. **Do you have an AWS account?**
   - If YES → You can use EC2
   - If NO → Use Railway or Render (easier)

---

## 💡 Recommendation

**For fastest setup:**
1. Use **Railway** (5 minutes to deploy)
2. Get the URL
3. Add it to `amplify.yml`
4. Done!

**For testing locally:**
1. Start backend: `cd backend && npm start`
2. Use Cloudflare Tunnel: `cloudflared tunnel --url http://localhost:5000`
3. Copy the tunnel URL
4. Add to `amplify.yml`

---

*Need help with a specific deployment option? Let me know which one you want to use!*



