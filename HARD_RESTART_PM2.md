# 🔄 Hard Restart PM2 - Route Not Loading

## 🚨 Route Exists But PM2 Not Loading It

The route is in the code, but PM2 might be caching the old version. Do a **hard restart**.

---

## 🔄 Step 1: Stop and Delete PM2 Process

```bash
cd ~/Analytic-Shorts/backend

# Check current processes
pm2 list

# Delete the analytics-api process
pm2 delete analytics-api
```

---

## 🔄 Step 2: Verify Route File Has No Syntax Errors

**Check for syntax errors:**

```bash
cd ~/Analytic-Shorts/backend
node -c routes/examples.js
```

**If you see errors, share them. If no errors, continue.**

---

## 🔄 Step 3: Start Fresh with PM2

```bash
cd ~/Analytic-Shorts/backend

# Start fresh
pm2 start ecosystem.config.js --update-env

# Or if ecosystem.config.js doesn't exist:
pm2 start server.js --name analytics-api --update-env
```

---

## ✅ Step 4: Check Logs

```bash
pm2 logs analytics-api --lines 50
```

**Look for:**
- `🚀 Server running on http://localhost:5000`
- No errors about routes or modules

---

## 🧪 Step 5: Test Route

```bash
curl http://localhost:5000/api/example/yearly-income
```

**Make sure you type the FULL route name: `yearly-income` (not `yearly-i`)**

---

## 🚨 If Still Not Working

**Check if the route file is actually being loaded:**

```bash
cd ~/Analytic-Shorts/backend

# Check if route exists
grep -n "yearly-income" routes/examples.js

# Check if server.js loads examples route
grep -n "example" server.js

# Check PM2 is using the right directory
pm2 info analytics-api | grep cwd
```

---

## 📝 Complete Hard Restart Commands

```bash
# 1. Navigate to backend
cd ~/Analytic-Shorts/backend

# 2. Delete old process
pm2 delete analytics-api

# 3. Check syntax
node -c routes/examples.js

# 4. Start fresh
pm2 start ecosystem.config.js --update-env

# 5. Check logs
pm2 logs analytics-api --lines 30

# 6. Test route
curl http://localhost:5000/api/example/yearly-income
```

---

**Do a hard restart: `pm2 delete analytics-api` then `pm2 start ecosystem.config.js --update-env`** 🚀

