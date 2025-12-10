# 🔧 Force Update Server Code

## ⚠️ "Already up to date" but errors persist

**The server might have uncommitted changes or be on a different branch.**

---

## 🔍 Step 1: Check Current Status

**On EC2 server:**

```bash
cd ~/Analytic-Shorts

# Check current commit
git log --oneline -5

# Check if there are uncommitted changes
git status

# Check current branch
git branch
```

---

## 🔍 Step 2: Verify Code Matches GitHub

**Check if the fixes are actually in the files:**

```bash
# Check upload.js has the async/await fix
grep -A 5 "async () =>" ~/Analytic-Shorts/backend/routes/upload.js

# Check insights.js has selectedNumeric
grep "selectedNumeric" ~/Analytic-Shorts/backend/routes/insights.js
```

**If you DON'T see these, the code isn't updated!**

---

## 🚀 Step 3: Force Pull Latest Code

**If code doesn't match, force update:**

```bash
cd ~/Analytic-Shorts

# Fetch latest
git fetch origin

# Reset to match GitHub exactly
git reset --hard origin/main

# Verify files were updated
git log --oneline -1

# Restart backend
cd backend
pm2 restart analytics-api --update-env

# Check logs
pm2 logs analytics-api --lines 30
```

---

## 🔍 Step 4: Verify Fixes Are There

**After force update, verify:**

```bash
# Should see async/await pattern
grep -n "async () =>" ~/Analytic-Shorts/backend/routes/upload.js

# Should see selectedNumeric
grep -n "selectedNumeric" ~/Analytic-Shorts/backend/routes/insights.js
```

**If you see both, the code is updated!**

---

## ⚠️ If Still Not Working

**Check if Node.js is caching old code:**

```bash
# Clear PM2 cache
pm2 delete analytics-api
cd ~/Analytic-Shorts/backend
pm2 start ecosystem.config.js --update-env

# Or restart with fresh environment
pm2 restart analytics-api --update-env
```

---

**Run Step 3 (force pull) to ensure code matches GitHub!** 🚀

