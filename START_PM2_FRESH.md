# 🚀 Start PM2 Fresh

## ✅ Process Deleted - Now Start It Fresh

---

## 🔄 Step 1: Start PM2 Process

**Run this command:**

```bash
cd ~/Analytic-Shorts/backend
pm2 start ecosystem.config.js --update-env
```

**Or if ecosystem.config.js doesn't exist or has issues:**

```bash
cd ~/Analytic-Shorts/backend
pm2 start server.js --name analytics-api --update-env
```

---

## ✅ Step 2: Verify It Started

**Check PM2 status:**

```bash
pm2 status
```

**You should see `analytics-api` in the list with status `online`.**

---

## ✅ Step 3: Check Logs

**Check startup logs:**

```bash
pm2 logs analytics-api --lines 50
```

**You should see:**
```
🚀 Server running on http://localhost:5000
```

**And NO errors about routes or modules.**

---

## 🧪 Step 4: Test the Route

**Test the route (make sure to type the FULL name):**

```bash
curl http://localhost:5000/api/example/yearly-income
```

**Note: Type `yearly-income` (not `yearly-i`)**

**You should see JSON data, not "Route not found"!**

---

## 🚨 If Route Still Not Found

**Verify the route exists in the code:**

```bash
cd ~/Analytic-Shorts/backend
grep -n "yearly-income" routes/examples.js
```

**You should see line 294 with the route.**

**Check if server.js loads examples:**

```bash
grep -n "example" server.js
```

**You should see the examples route being loaded.**

---

## 📝 Quick Commands

```bash
# 1. Navigate to backend
cd ~/Analytic-Shorts/backend

# 2. Start PM2
pm2 start ecosystem.config.js --update-env

# 3. Check status
pm2 status

# 4. Check logs
pm2 logs analytics-api --lines 30

# 5. Test route (FULL name!)
curl http://localhost:5000/api/example/yearly-income
```

---

**Run `pm2 start ecosystem.config.js --update-env` now!** 🚀

