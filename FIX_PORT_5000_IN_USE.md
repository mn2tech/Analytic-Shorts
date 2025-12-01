# Fix: Port 5000 Already in Use

The error `EADDRINUSE: address already in use :::5000` means something is already running on port 5000.

## 🔍 Step 1: Find What's Using Port 5000

In PowerShell, run:

```powershell
netstat -ano | findstr :5000
```

This will show you what process is using port 5000. Look for the PID (Process ID) in the last column.

**Example output:**
```
TCP    0.0.0.0:5000           0.0.0.0:0              LISTENING       12345
TCP    [::]:5000              [::]:0                 LISTENING       12345
```

The number `12345` is the PID.

---

## 🛑 Step 2: Stop the Process

### Option A: Kill by PID

```powershell
# Replace 12345 with the actual PID from Step 1
taskkill /PID 12345 /F
```

### Option B: Kill All Node Processes (If it's a Node process)

```powershell
taskkill /IM node.exe /F
```

**Warning:** This will stop ALL Node.js processes. Make sure you're OK with that.

### Option C: Find and Kill Node Processes on Port 5000

```powershell
# Find the process
Get-NetTCPConnection -LocalPort 5000 | Select-Object OwningProcess

# Kill it (replace PID with the number from above)
Stop-Process -Id <PID> -Force
```

---

## ✅ Step 3: Start Backend Again

After stopping the process, try starting the backend again:

```powershell
cd C:\Users\kolaw\Projects\NM2-Analytics-Shorts\backend
npm start
```

You should now see:
```
🚀 Server running on http://localhost:5000
```

---

## 🔄 Alternative: Use a Different Port

If you want to keep whatever is on port 5000, you can change the backend port:

### Step 1: Create/Edit `.env` file in `backend` folder

```powershell
cd C:\Users\kolaw\Projects\NM2-Analytics-Shorts\backend
notepad .env
```

Add:
```
PORT=5001
```

Save and close.

### Step 2: Start Backend

```powershell
npm start
```

Now it will run on port 5001.

### Step 3: Update Vite Proxy (if using locally)

If you're running frontend locally, update `vite.config.js`:

```javascript
proxy: {
  '/api': {
    target: 'http://localhost:5001',  // Changed from 5000
    changeOrigin: true
  }
}
```

---

## 💡 Quick Fix (Recommended)

**Just kill all Node processes and restart:**

```powershell
# Kill all Node processes
taskkill /IM node.exe /F

# Wait a second
Start-Sleep -Seconds 2

# Start backend
cd C:\Users\kolaw\Projects\NM2-Analytics-Shorts\backend
npm start
```

---

## 📝 About the Supabase Warnings

The Supabase warnings are **OK to ignore for now**. They just mean:
- Supabase isn't configured (that's fine)
- Some features won't work (dashboard saving, subscriptions, etc.)
- But the basic API (file upload, insights, examples) will work fine

You can configure Supabase later if you need those features.

---

## ✅ After Backend Starts

Once you see `🚀 Server running on http://localhost:5000`, you can:

1. **Test it:**
   ```powershell
   curl http://localhost:5000/api/health
   ```

2. **Start Cloudflare tunnel** (in a new PowerShell window):
   ```powershell
   cloudflared tunnel --url http://localhost:5000
   ```

3. **Get your backend URL** from the tunnel output

---

*Try the quick fix first - it's the fastest way!*

