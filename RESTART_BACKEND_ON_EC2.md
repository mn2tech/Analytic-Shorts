# 🔄 Restart Backend on EC2 Server

## ✅ You're on EC2, Not Local!

The backend is running on your EC2 server. Here's how to restart it:

---

## 🔍 Step 1: Find the Project Directory

**First, find where your project is located:**

```bash
# Check if it's in your home directory
ls -la ~

# Or search for the project
find ~ -name "package.json" -type f 2>/dev/null | grep -i analytics

# Or check common locations
ls -la ~/Analytic-Shorts
ls -la ~/NM2-Analytics-Shorts
ls -la ~/projects
```

---

## 📁 Step 2: Navigate to Project Directory

**Once you find it, navigate there:**

```bash
# Example (adjust path based on what you find):
cd ~/Analytic-Shorts
# OR
cd ~/NM2-Analytics-Shorts
# OR wherever your project is
```

---

## 🔄 Step 3: Restart Backend with PM2

**On EC2, the backend is managed by PM2. Restart it:**

```bash
# Navigate to backend folder
cd backend

# Restart the PM2 process
pm2 restart analytics-api --update-env

# Or if the process has a different name:
pm2 list  # Check process name
pm2 restart <process-name> --update-env
```

---

## ✅ Step 4: Verify Backend is Running

**Check PM2 status:**

```bash
pm2 status
pm2 logs analytics-api --lines 20
```

**You should see:**
```
🚀 Server running on http://localhost:5000
```

---

## 🧪 Step 5: Test the Route

**Test the new route:**

```bash
curl http://localhost:5000/api/example/yearly-income
```

**Or test from your local machine:**

```bash
curl http://api.nm2tech-sas.com/api/example/yearly-income
```

---

## 🚨 If PM2 Process Doesn't Exist

**If PM2 doesn't have the process, start it:**

```bash
cd ~/Analytic-Shorts/backend  # Adjust path
pm2 start ecosystem.config.js --update-env
```

---

## 📝 Quick Commands Summary

```bash
# 1. Find project
find ~ -name "package.json" -type f 2>/dev/null | head -5

# 2. Navigate to project
cd ~/Analytic-Shorts  # Adjust based on what you find

# 3. Restart backend
cd backend
pm2 restart analytics-api --update-env

# 4. Check status
pm2 status
pm2 logs analytics-api --lines 20
```

---

**Find your project directory first, then restart with PM2!** 🚀

