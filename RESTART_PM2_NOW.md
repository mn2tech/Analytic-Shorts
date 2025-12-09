# 🔄 Restart PM2 Backend Now

## ✅ Code Pulled Successfully!

You've pulled all the latest changes including the new `/api/example/yearly-income` route.

---

## 🔄 Step 1: Restart Backend with PM2

**Run this command:**

```bash
cd ~/Analytic-Shorts/backend
pm2 restart analytics-api --update-env
```

**Or if you're already in the project root:**

```bash
cd backend
pm2 restart analytics-api --update-env
```

---

## ✅ Step 2: Verify Backend Restarted

**Check PM2 status:**

```bash
pm2 status
```

**Check logs to see if it started correctly:**

```bash
pm2 logs analytics-api --lines 30
```

**You should see:**
```
🚀 Server running on http://localhost:5000
```

---

## 🧪 Step 3: Test the New Route

**Test locally on EC2:**

```bash
curl http://localhost:5000/api/example/yearly-income
```

**Or test from your API URL:**

```bash
curl http://api.nm2tech-sas.com/api/example/yearly-income
```

**You should see JSON with Year/Income data like:**
```json
{
  "data": [
    {"Year": "2020", "Income": "$0"},
    {"Year": "2021", "Income": "$1,200"},
    ...
  ],
  "columns": ["Year", "Income"],
  "numericColumns": ["Income"],
  "dateColumns": ["Year"],
  ...
}
```

---

## 🎯 Step 4: Try the Example Button

1. **Go to your frontend** (Amplify URL: `https://analytics-shorts.nm2tech-sas.com` or your Amplify URL)
2. **Scroll to "Or Try Example Data"**
3. **Click "Yearly Income"**
4. **Dashboard should load with your data!**

---

## 🚨 If PM2 Process Doesn't Exist

**If `pm2 restart analytics-api` fails, check what's running:**

```bash
pm2 list
```

**If you see a different process name, restart that one:**

```bash
pm2 restart <process-name> --update-env
```

**Or if no process exists, start it:**

```bash
cd ~/Analytic-Shorts/backend
pm2 start ecosystem.config.js --update-env
```

---

## 📝 Quick Command Summary

```bash
# 1. Navigate to backend
cd ~/Analytic-Shorts/backend

# 2. Restart PM2
pm2 restart analytics-api --update-env

# 3. Check status
pm2 status
pm2 logs analytics-api --lines 20

# 4. Test route
curl http://localhost:5000/api/example/yearly-income
```

---

**Run `pm2 restart analytics-api --update-env` now!** 🚀

