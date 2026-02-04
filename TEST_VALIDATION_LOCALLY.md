# Testing Data Validation Locally

## Step 1: Start the Servers

### Terminal 1 - Backend
```powershell
cd backend
npm start
```

You should see: `🚀 Server running on http://localhost:5000`

### Terminal 2 - Frontend
```powershell
npm run dev
```

You should see: `Local: http://localhost:5173/` (or port 3000)

---

## Step 2: Test Scenarios

### Test 1: No Numeric Columns (Should Show Warning)

**File:** `test-validation-data.csv`

This file has:
- Name (text)
- Description (text)  
- Status (text)
- **No numeric columns**

**Expected Result:**
- ⚠️ Warning: "No numeric columns detected. Charts require at least one numeric column."
- Suggestions to add numeric columns
- Examples of how to format numbers

**Steps:**
1. Open http://localhost:5173 (or 3000)
2. Upload `test-validation-data.csv`
3. You should see a yellow warning box with recommendations

---

### Test 2: Currency-Formatted Numbers (Should Show Warning)

**File:** `test-validation-data-currency.csv`

This file has:
- Date column ✅
- Product (text) ✅
- Amount with currency symbols: `$1,200.00` ❌

**Expected Result:**
- ⚠️ Warning about potential numeric column
- Suggestion to remove currency symbols
- Examples: `$1,200.00` → `1200`

**Steps:**
1. Upload `test-validation-data-currency.csv`
2. Check if it detects "Amount" as potentially numeric
3. Should show recommendation to clean the data

---

### Test 3: Good Data (Should Work Fine)

**File:** `test-validation-data-good.csv`

This file has:
- Date column ✅
- Product (categorical) ✅
- Category (categorical) ✅
- Sales (numeric) ✅
- Units (numeric) ✅

**Expected Result:**
- ✅ No errors or warnings
- Should navigate to dashboard immediately
- All charts should work

**Steps:**
1. Upload `test-validation-data-good.csv`
2. Should go directly to dashboard
3. No validation messages should appear

---

## Step 3: Verify Backend Validation

Test the API directly:

```powershell
# Test with bad data (no numeric columns)
$formData = @{
    file = Get-Item "test-validation-data.csv"
}
$response = Invoke-WebRequest -Uri "http://localhost:5000/api/upload" -Method Post -Form $formData -ErrorAction SilentlyContinue
if ($response) {
    $json = $response.Content | ConvertFrom-Json
    Write-Host "Validation errors: $($json.validation.errors.Count)"
    Write-Host "Validation warnings: $($json.validation.warnings.Count)"
    Write-Host "Validation recommendations: $($json.validation.recommendations.Count)"
}
```

---

## Step 4: Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Upload a file
4. Look for:
   - Validation data in console logs
   - Any JavaScript errors
   - Network requests to `/api/upload`

---

## Expected Validation Results

### File: test-validation-data.csv (No Numeric Columns)

**Errors:** 0  
**Warnings:** 1
- Type: `no_numeric`
- Message: "No numeric columns detected..."
- Examples shown

**Recommendations:** 0

---

### File: test-validation-data-currency.csv (Currency Format)

**Errors:** 0  
**Warnings:** 1-2
- Type: `potential_numeric` (for Amount column)
- Message: "Column 'Amount' might contain numbers but is detected as text"
- Examples: `$1,200.00` → `1200`

**Recommendations:** 0-1
- May suggest date formatting if dates aren't detected

---

### File: test-validation-data-good.csv (Good Data)

**Errors:** 0  
**Warnings:** 0  
**Recommendations:** 0-1 (optional, like adding more data)

**Summary:**
- 5 rows, 5 columns
- 2 numeric (Sales, Units)
- 1 date (Date)
- 2 categorical (Product, Category)

---

## Troubleshooting

### Backend not responding
```powershell
# Check if backend is running
Invoke-WebRequest http://localhost:5000/api/health

# If not, start it
cd backend
npm start
```

### Frontend not showing recommendations
1. Check browser console for errors
2. Verify backend returned `validation` in response
3. Check Network tab - look at `/api/upload` response
4. Make sure `DataRecommendations` component is imported

### Validation not working
1. Check backend terminal for errors
2. Verify `dataValidator.js` is in `backend/controllers/`
3. Check `backend/routes/upload.js` imports `validateData`
4. Restart backend after changes

---

## Quick Test Checklist

- [ ] Backend running on port 5000
- [ ] Frontend running on port 5173 (or 3000)
- [ ] Test file 1 (no numeric) shows warning
- [ ] Test file 2 (currency) shows recommendation
- [ ] Test file 3 (good data) works without warnings
- [ ] Recommendations are dismissible
- [ ] Errors block navigation
- [ ] Warnings allow navigation (with delay)

---

## Next Steps After Testing

If everything works:
1. ✅ Commit changes to git
2. ✅ Push to repository
3. ✅ Test on production

If issues found:
1. Fix the issues
2. Test again
3. Then commit and push

