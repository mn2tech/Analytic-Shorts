# 🔍 Domain Available But Not Resolving

## ✅ Domain Status: Available

**In Amplify:**
- ✅ Status: "Available" (green checkmark)
- ✅ SSL certificate: "Amplify managed"
- ✅ Domain configured correctly

**But the domain is not resolving from Windows.**

---

## 🔍 Issue: DNS Propagation

**Even though:**
- DNS resolves correctly with `nslookup`
- Domain status is "Available" in Amplify

**Windows might be using a different DNS server that hasn't updated yet.**

---

## ✅ Step 1: Test with Google DNS

**Test if DNS is working globally:**

```bash
nslookup analytics-shorts.nm2tech-sas.com 8.8.8.8
```

**If it works with Google DNS:**
- DNS is propagating globally ✅
- Windows DNS cache might be stale
- Clear DNS cache and wait

**If it doesn't work:**
- DNS might not be fully propagated
- Wait 15-30 more minutes

---

## ✅ Step 2: Clear DNS Cache Completely

**Clear DNS cache on Windows:**

1. **Open PowerShell as Administrator:**
   - Right-click Start menu
   - Select "Windows PowerShell (Admin)" or "Terminal (Admin)"

2. **Run:**
   ```powershell
   ipconfig /flushdns
   ipconfig /release
   ipconfig /renew
   ```

3. **Restart your computer** (if possible)

---

## ✅ Step 3: Change DNS Server Temporarily

**Use Google DNS to test:**

1. **Go to:** Network Settings → Change adapter options
2. **Right-click** your network → Properties
3. **Select** "Internet Protocol Version 4 (TCP/IPv4)" → Properties
4. **Select** "Use the following DNS server addresses"
5. **Enter:**
   - Preferred: `8.8.8.8` (Google DNS)
   - Alternate: `8.8.4.4` (Google DNS)
6. **Click OK**

7. **Test:** `https://analytics-shorts.nm2tech-sas.com`

8. **Revert DNS** after testing (set back to automatic)

---

## ✅ Step 4: Wait for Full Propagation

**DNS propagation can take 15-30 minutes globally:**

1. **Wait** 15-30 more minutes
2. **Try again** from browser
3. **Test from different network** (mobile hotspot)

---

## ✅ Step 5: Test from Browser (Not PowerShell)

**Test from browser, not PowerShell:**

1. **Open browser** (Chrome, Edge, Firefox)
2. **Visit:** `https://analytics-shorts.nm2tech-sas.com`
3. **Does it work?**
   - **If yes:** Domain is working! ✅
   - **If no:** Clear browser cache and try again

**Browsers sometimes resolve DNS differently than PowerShell.**

---

## ✅ Step 6: Add Custom Domain to CORS

**When the domain works, add it to CORS:**

**On EC2:**
```bash
cd /home/raj/Analytic-Shorts/backend
nano .env
```

**Update:**
```env
ALLOWED_ORIGINS=https://main.d2swtp6vppsxta.amplifyapp.com,https://analytics-shorts.nm2tech-sas.com
```

**Restart:**
```bash
pm2 restart analytics-api --update-env
```

---

## 🔍 Most Likely Issue

**DNS propagation delay** - Even though status is "Available", DNS might not be fully propagated to all DNS servers yet.

**Solution:**
1. Wait 15-30 minutes
2. Clear DNS cache
3. Test from browser (not PowerShell)
4. Try from different network

---

**Test from browser and wait for DNS propagation!** 🔍

The domain is configured correctly - just need to wait for DNS to fully propagate globally.

