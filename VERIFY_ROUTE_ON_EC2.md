# 🔍 Verify Route on EC2

## 🚨 Route Still Not Found After Restart

The route might not be loading. Let's verify it exists in the code.

---

## ✅ Step 1: Verify Route File Has the Route

**Check if the route exists in the code:**

```bash
cd ~/Analytic-Shorts/backend
grep -n "yearly-income" routes/examples.js
```

**You should see line numbers with "yearly-income".**

---

## ✅ Step 2: Check Route Definition

**View the route definition:**

```bash
cat routes/examples.js | grep -A 10 "yearly-income"
```

**You should see:**
```javascript
router.get('/yearly-income', (req, res) => {
  ...
})
```

---

## ✅ Step 3: Check if Server.js Includes Examples Route

**Verify server.js loads the examples route:**

```bash
grep -n "example" server.js
```

**You should see:**
```javascript
app.use('/api/example', exampleRoutes)
```

---

## 🔄 Step 4: Hard Restart PM2

**If route exists but still not working, do a hard restart:**

```bash
cd ~/Analytic-Shorts/backend

# Stop the process
pm2 delete analytics-api

# Start fresh
pm2 start ecosystem.config.js --update-env

# Check logs
pm2 logs analytics-api --lines 50
```

---

## 🧪 Step 5: Test Route Again

**After hard restart, test:**

```bash
curl http://localhost:5000/api/example/yearly-income
```

**Note: Make sure you type the full route name "yearly-income", not "yearly-i"**

---

## 🚨 If Route Still Not Found

**Check for syntax errors in the route file:**

```bash
cd ~/Analytic-Shorts/backend
node -c routes/examples.js
```

**If there are syntax errors, fix them and restart.**

---

**Run these verification commands first!** 🔍

