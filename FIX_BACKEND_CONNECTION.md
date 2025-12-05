# Fix: Cannot Connect to Backend Server

## 🔍 Quick Diagnosis

When you see the error: *"Cannot connect to backend server. Please ensure the API is running and VITE_API_URL is configured..."*

This means the frontend cannot reach your backend API. Here's how to fix it:

---

## ✅ Step-by-Step Fix

### **Step 1: Determine Your Environment**

**Are you running locally or in production (Amplify)?**

- **Local Development**: Backend should be on `http://localhost:5000`
- **Production (Amplify)**: Backend needs a public URL and `VITE_API_URL` must be set

---

### **Step 2: For Local Development**

#### Check if Backend is Running

```powershell
# In a terminal, check if backend is running
cd backend
npm start
```

You should see:
```
🚀 Server running on http://localhost:5000
```

#### If Backend is Not Running

1. **Start the backend:**
   ```powershell
   cd backend
   npm start
   ```

2. **Keep it running** in a separate terminal window

3. **Test the backend:**
   ```powershell
   curl http://localhost:5000/api/health
   ```
   
   Should return: `{"status":"ok","message":"NM2TECH Analytics Shorts API is running"}`

#### If Backend is Running but Still Getting Error

1. **Check the frontend is using the proxy:**
   - Frontend should be on `http://localhost:3000`
   - Vite proxy should forward `/api/*` to `http://localhost:5000`
   - Check `vite.config.js` has the proxy configured

2. **Check for CORS errors in browser console:**
   - Press F12 → Console tab
   - Look for CORS errors
   - If you see CORS errors, check `backend/server.js` CORS configuration

---

### **Step 3: For Production (AWS Amplify)**

#### Check if Backend is Deployed and Running

Your backend needs to be:
1. **Deployed** to a server (EC2, Railway, Render, etc.)
2. **Accessible** from the internet (public URL)
3. **Running** and responding to requests

**Test your backend URL:**
```bash
# Replace with your actual backend URL
curl https://your-backend-url.com/api/health
```

Should return: `{"status":"ok","message":"NM2TECH Analytics Shorts API is running"}`

#### Configure VITE_API_URL in Amplify

**This is the most common issue!**

1. **Go to AWS Amplify Console:**
   - Navigate to your app
   - Click **App settings** → **Environment variables**

2. **Add or Update the Variable:**
   - **Key**: `VITE_API_URL`
   - **Value**: Your backend API URL
   - **Important Rules:**
     - ✅ Use `https://` (not `http://`)
     - ✅ Do NOT include trailing slash (`/`)
     - ✅ Do NOT include `/api` in the URL
     - ✅ Use the full domain (e.g., `https://api.example.com`)

3. **Correct Examples:**
   ```
   ✅ https://your-backend-url.com
   ✅ https://api.example.com
   ✅ https://addresses-population-eat-settled.trycloudflare.com
   ```

4. **Incorrect Examples:**
   ```
   ❌ https://your-backend-url.com/          (trailing slash)
   ❌ https://your-backend-url.com/api       (includes /api)
   ❌ http://your-backend-url.com            (http instead of https)
   ```

5. **Save and Redeploy:**
   - After adding/updating, you **MUST redeploy** the app
   - Go to **App settings** → **Build settings**
   - Click **Redeploy this version** or trigger a new deployment

---

### **Step 4: Verify Configuration**

#### Check Browser Console

1. Open your app in the browser
2. Press **F12** → **Console** tab
3. Look for these log messages:
   ```
   API Base URL: https://your-backend-url.com
   VITE_API_URL env var: https://your-backend-url.com
   ```

If you see:
- `API Base URL: Not set - using relative paths` → VITE_API_URL is not configured
- `VITE_API_URL env var: Not set` → VITE_API_URL is not configured

#### Test Backend Health Endpoint

In browser console, run:
```javascript
fetch('https://your-backend-url.com/api/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

Should return: `{status: "ok", message: "NM2TECH Analytics Shorts API is running"}`

---

## 🔧 Common Issues & Solutions

### Issue 1: VITE_API_URL Not Set in Amplify

**Symptom:** Error message mentions "VITE_API_URL is not configured"

**Solution:**
1. Go to Amplify Console → Environment variables
2. Add `VITE_API_URL` with your backend URL
3. Redeploy the app

---

### Issue 2: Backend Not Accessible from Internet

**Symptom:** Can access backend locally but not from Amplify

**Solution:**
1. **If using EC2:**
   - Check Security Group allows inbound traffic on port 5000
   - Check backend is running: `pm2 status` or `npm start`
   - Test from outside: `curl http://YOUR-EC2-IP:5000/api/health`

2. **If using Cloudflare Tunnel:**
   - Ensure tunnel is running: `cloudflared tunnel --url http://localhost:5000`
   - Use the tunnel URL in `VITE_API_URL`

3. **If using Railway/Render:**
   - Check service is deployed and running
   - Use the provided public URL in `VITE_API_URL`

---

### Issue 3: CORS Errors

**Symptom:** Browser console shows CORS policy errors

**Solution:**
1. Update `backend/server.js` CORS configuration:
   ```javascript
   const allowedOrigins = process.env.ALLOWED_ORIGINS 
     ? process.env.ALLOWED_ORIGINS.split(',')
     : ['*'] // Allow all in development
   ```
   
2. For production, set `ALLOWED_ORIGINS` in backend `.env`:
   ```
   ALLOWED_ORIGINS=https://your-amplify-domain.amplifyapp.com,https://main.d1234567890.amplifyapp.com
   ```

---

### Issue 4: Backend Server Not Running

**Symptom:** Health check fails, connection refused

**Solution:**
1. **On EC2:**
   ```bash
   cd backend
   npm start
   # Or if using PM2:
   pm2 start server.js --name analytics-api
   ```

2. **On Railway/Render:**
   - Check deployment logs
   - Ensure `PORT` environment variable is set
   - Verify build completed successfully

---

### Issue 5: Wrong URL Format

**Symptom:** Connection works but gets 404 errors

**Solution:**
- Check URL format in `VITE_API_URL`:
  - ✅ Correct: `https://api.example.com`
  - ❌ Wrong: `https://api.example.com/api` (don't include /api)
  - ❌ Wrong: `https://api.example.com/` (no trailing slash)

---

## 🧪 Testing Checklist

- [ ] Backend server is running
- [ ] Backend health endpoint responds: `/api/health`
- [ ] Backend is accessible from internet (for production)
- [ ] `VITE_API_URL` is set in Amplify (for production)
- [ ] `VITE_API_URL` format is correct (no trailing slash, no /api)
- [ ] App has been redeployed after setting `VITE_API_URL`
- [ ] CORS is configured correctly
- [ ] Browser console shows correct API URL in logs

---

## 📞 Still Having Issues?

1. **Check browser console** (F12) for specific error messages
2. **Check backend logs** for errors
3. **Test backend directly** using curl or Postman
4. **Verify environment variables** are set correctly
5. **Check network tab** in browser DevTools to see failed requests

---

## 💡 Quick Reference

**Local Development:**
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`
- No `VITE_API_URL` needed (uses Vite proxy)

**Production (Amplify):**
- Frontend: `https://your-app.amplifyapp.com`
- Backend: `https://your-backend-url.com`
- **Must set** `VITE_API_URL` in Amplify environment variables

---

*Last updated: Based on current codebase configuration*



