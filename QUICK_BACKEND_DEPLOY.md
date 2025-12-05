# Quick Backend Deployment Guide

Your frontend is deployed on Amplify, but the backend needs to be hosted separately. Here are the **fastest** options:

## 🚀 Option 1: Railway (Fastest - ~5 minutes)

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select `mn2tech/Analytic-Shorts`
5. **Configure:**
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
6. Add Environment Variable:
   - `OPENAI_API_KEY` (optional, for AI insights)
7. Deploy!
8. Copy the generated URL (e.g., `https://your-app.railway.app`)
9. **In AWS Amplify:**
   - Go to App settings → Environment variables
   - Add: `VITE_API_URL` = `https://your-app.railway.app`
   - Redeploy frontend

## 🚀 Option 2: Render (Free tier available)

1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Click "New" → "Web Service"
4. Connect `mn2tech/Analytic-Shorts`
5. **Configure:**
   - Name: `nm2tech-analytics-api`
   - Environment: `Node`
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
6. Add Environment Variable:
   - `OPENAI_API_KEY` (optional)
7. Deploy!
8. Copy the URL and add to Amplify as `VITE_API_URL`

## 🚀 Option 3: AWS Lambda (More setup, but AWS-native)

See `AMPLIFY_SETUP.md` for detailed Lambda setup.

## ⚡ Quick Test (Local Backend)

If you want to test locally while setting up production:

1. **Start backend locally:**
   ```bash
   cd backend
   npm install
   npm start
   ```

2. **Use a tunnel service:**
   - Install ngrok: `npm install -g ngrok`
   - Run: `ngrok http 5000`
   - Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

3. **In Amplify:**
   - Add environment variable: `VITE_API_URL` = your ngrok URL
   - Redeploy

## ✅ After Backend is Deployed

1. Get your backend URL (e.g., `https://api.example.com`)
2. In AWS Amplify Console:
   - App settings → Environment variables
   - Add: `VITE_API_URL` = your backend URL
3. Redeploy the frontend
4. Test upload and example data buttons

## 🔍 Verify Backend is Working

Test the health endpoint:
```bash
curl https://your-backend-url.com/api/health
```

Should return: `{"status":"ok","message":"NM2TECH Analytics Shorts API is running"}`





