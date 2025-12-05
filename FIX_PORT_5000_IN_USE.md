# Fix "Port 5000 Already in Use" Error

## 🔍 The Problem

Another process is already using port 5000. This usually means:
- Another backend instance is already running
- Or another application is using port 5000

## ✅ Quick Fix: Kill the Process

### Method 1: Find and Kill (Windows PowerShell)

1. **Find the process:**
   ```powershell
   netstat -ano | findstr :5000
   ```
   This will show something like:
   ```
   TCP    0.0.0.0:5000    0.0.0.0:0    LISTENING    12345
   ```
   The last number (12345) is the Process ID (PID)

2. **Kill the process:**
   ```powershell
   taskkill /PID 12345 /F
   ```
   (Replace 12345 with the actual PID from step 1)

3. **Start backend again:**
   ```powershell
   cd backend
   npm start
   ```

### Method 2: Kill All Node Processes (Quick but aggressive)

```powershell
# Kill all Node.js processes
taskkill /IM node.exe /F
```

⚠️ **Warning:** This will kill ALL Node.js processes, including your frontend if it's running!

### Method 3: Use a Different Port (Alternative)

If you can't kill the process, change the port:

1. Edit `backend/.env`:
   ```env
   PORT=5001
   ```

2. Update `frontend/.env.local`:
   ```env
   VITE_API_URL=http://localhost:5001
   ```

3. Restart both frontend and backend

## 🎯 Recommended: Method 1

Use Method 1 to find and kill only the process on port 5000.

## ✅ After Killing the Process

1. Start backend:
   ```powershell
   cd backend
   npm start
   ```

2. Should see: `Server running on port 5000` ✅

---

**Try Method 1 first - it's the safest!** 🚀
