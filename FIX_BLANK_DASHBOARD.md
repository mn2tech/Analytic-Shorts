# 🔧 Fix Blank Dashboard Issue

## Quick Fixes

### 1. Clear Browser Storage
The dashboard might be stuck with corrupted data in `sessionStorage`:

1. Open your browser's Developer Tools (F12)
2. Go to the **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Find **Session Storage** → your domain
4. Delete the `analyticsData` key
5. Refresh the page
6. Re-upload your file

### 2. Check Browser Console
Look for JavaScript errors:

1. Open Developer Tools (F12)
2. Go to the **Console** tab
3. Look for red error messages
4. Share any errors you see

### 3. Re-upload Your File
The data might be corrupted:

1. Go back to the home page
2. Upload your Excel file again: `public/examples/yearly-income-data.xlsx`
3. Wait for the dashboard to load

### 4. Check Network Tab
Verify the upload was successful:

1. Open Developer Tools (F12)
2. Go to the **Network** tab
3. Upload your file
4. Look for the `/api/upload` request
5. Check if it returns status `200` and valid JSON data

---

## Common Issues

### Issue: "No Data Available" Message
**Cause:** Data wasn't saved to `sessionStorage` or was cleared

**Fix:**
- Re-upload your file
- Make sure the file upload completes successfully
- Check the browser console for errors

### Issue: Stuck on Loading Spinner
**Cause:** `loading` state never set to `false`

**Fix:**
- Clear browser cache and refresh
- Check browser console for JavaScript errors
- Try a different browser

### Issue: Blank White Screen
**Cause:** JavaScript error preventing render

**Fix:**
1. Open Developer Tools (F12)
2. Check Console for errors
3. Check if there are any red error messages
4. Share the error message for debugging

---

## Verify Backend is Working

### Test the Upload Endpoint
```bash
# Replace with your backend URL
curl -X POST https://api.nm2tech-sas.com/api/upload \
  -F "file=@public/examples/yearly-income-data.xlsx" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Check Backend Logs
If you have access to the backend server:
```bash
pm2 logs analytics-api --lines 50
```

Look for:
- Upload success messages
- Column detection logs
- Any error messages

---

## Expected Data Format

The backend should return:
```json
{
  "data": [
    { "Year": "2020", "Income": "$0" },
    { "Year": "2021", "Income": "$1,200" }
  ],
  "columns": ["Year", "Income"],
  "numericColumns": ["Income"],
  "categoricalColumns": [],
  "dateColumns": ["Year"],
  "rowCount": 6
}
```

---

## Debug Steps

1. **Check if data exists:**
   - Open browser console
   - Type: `sessionStorage.getItem('analyticsData')`
   - Should return a JSON string

2. **Check if columns are detected:**
   - After upload, check console logs
   - Should see: "Initializing data: { dateColumns: ['Year'], numericColumns: ['Income'] }"

3. **Check if loading state is false:**
   - In console, the dashboard should log: "Setting loading to false"

---

## Still Not Working?

1. **Share the browser console errors** (F12 → Console tab)
2. **Share the Network tab** for the `/api/upload` request
3. **Try a different browser** (Chrome, Firefox, Edge)
4. **Clear all browser data** and try again

---

## Recent Fixes Applied

✅ Added error handling to `initializeData`
✅ Added validation for data format
✅ Added try-catch blocks
✅ Added console logging for debugging
✅ Improved year detection in backend

The fixes are deployed. After clearing browser storage and re-uploading, the dashboard should work.

