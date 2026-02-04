# Debugging Blank Screen Issue

## Quick Checks

### 1. Open Browser Console (F12)
Look for:
- Red error messages
- Console logs starting with "Dashboard:"
- Any JavaScript errors

### 2. Check Network Tab
- Look for `/api/upload` request
- Check the response - does it have `validation` field?
- Check status code (should be 200)

### 3. Check sessionStorage
In browser console, type:
```javascript
JSON.parse(sessionStorage.getItem('analyticsData'))
```

This should show:
- `data` array
- `columns` array
- `numericColumns` array
- `validation` object (if validation ran)

### 4. Check if Backend is Running
```powershell
Invoke-WebRequest http://localhost:5000/api/health
```

---

## What Should Happen Now

When you upload CRM data with no numeric columns:

1. **On Home Page**: You should see yellow warning box with recommendations
2. **If you proceed to Dashboard**: You should see a helpful error message explaining why it's blank

---

## If Still Blank

1. **Hard refresh**: Ctrl+F5 (clears cache)
2. **Clear sessionStorage**: 
   ```javascript
   sessionStorage.clear()
   ```
3. **Check backend logs**: Look at terminal where backend is running
4. **Restart both servers**: Stop and restart frontend and backend

---

## Test with Sample File

Try uploading `test-validation-data.csv` (the one with only Name, Description, Status).

**Expected:**
- Warning on home page about no numeric columns
- If you navigate to dashboard anyway, should show error message instead of blank screen

