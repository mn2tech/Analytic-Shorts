# 🔄 Restart Backend on EC2 - Step by Step

## ✅ Project Found: `~/Analytic-Shorts`

---

## 📥 Step 1: Navigate and Pull Latest Code

```bash
cd ~/Analytic-Shorts
git pull origin main
```

**This will download the new `/api/example/yearly-income` route.**

---

## 🔄 Step 2: Restart Backend with PM2

```bash
cd backend
pm2 restart analytics-api --update-env
```

**Or if the process has a different name:**

```bash
# Check what PM2 processes are running
pm2 list

# Restart the correct one (usually "analytics-api" or similar)
pm2 restart <process-name> --update-env
```

---

## ✅ Step 3: Verify Backend is Running

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs analytics-api --lines 30
```

**You should see:**
```
🚀 Server running on http://localhost:5000
```

---

## 🧪 Step 4: Test the New Route

```bash
# Test locally on EC2
curl http://localhost:5000/api/example/yearly-income

# Or test from your API URL
curl http://api.nm2tech-sas.com/api/example/yearly-income
```

**You should see JSON with Year/Income data!**

---

## 🎯 Step 5: Try the Example Button

1. Go to your frontend (Amplify URL)
2. Click "Yearly Income" example button
3. Dashboard should load!

---

## 🚨 If PM2 Process Doesn't Exist

**If `pm2 restart analytics-api` fails:**

```bash
# Check what's running
pm2 list

# If nothing, start it:
cd ~/Analytic-Shorts/backend
pm2 start ecosystem.config.js --update-env
```

---

**Run these commands now!** 🚀

