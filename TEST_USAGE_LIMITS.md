# Testing Usage Limits - Step by Step Guide

## Prerequisites

1. **Backend running:** `cd backend && npm start` (or `npm run dev`)
2. **Frontend running:** `npm run dev`
3. **Supabase configured:** Make sure `.env` files are set up
4. **User account:** Sign up or log in to test

## Test 1: Dashboard Creation Limit (Free Plan)

### Steps:
1. **Sign up/Login** with a free account
2. **Create 3 dashboards:**
   - Upload a file or use example data
   - Click "Save Dashboard" 3 times
   - Each time, give it a different name
3. **Try to create 4th dashboard:**
   - Upload another file
   - Click "Save Dashboard"
   - **Expected:** Should see error message: "Dashboard limit reached"
   - **Expected:** Upgrade prompt should appear

### Verify in Database:
```sql
-- Check dashboard count for your user
SELECT COUNT(*) as dashboard_count 
FROM shorts_dashboards 
WHERE user_id = 'YOUR_USER_ID';
-- Should show 3 (limit reached)
```

## Test 2: File Upload Limit (Free Plan)

### Steps:
1. **Upload 5 files** (one at a time):
   - Go to home page
   - Upload a CSV/Excel file
   - Create dashboard from it
   - Repeat 5 times
2. **Try to upload 6th file:**
   - Upload another file
   - **Expected:** Should see error: "Upload limit reached"
   - **Expected:** File should be rejected before processing

### Verify in Database:
```sql
-- Check upload count for current month
SELECT COUNT(*) as upload_count 
FROM shorts_file_uploads 
WHERE user_id = 'YOUR_USER_ID'
  AND upload_date >= date_trunc('month', CURRENT_DATE);
-- Should show 5 (limit reached)
```

## Test 3: File Size Limit (Free Plan)

### Steps:
1. **Try to upload a file larger than 5MB:**
   - Create or find a CSV/Excel file > 5MB
   - Try to upload it
   - **Expected:** Should see error: "File size limit exceeded"
   - **Expected:** File should be rejected

## Test 4: AI Insights Limit (Free Plan)

### Steps:
1. **Generate 5 AI insights:**
   - Open a dashboard
   - Scroll to "AI Insights" section
   - Click to generate insights
   - Repeat 5 times (refresh page or reload data)
2. **Try to generate 6th insight:**
   - Click to generate insights again
   - **Expected:** Should see error: "AI insights limit reached"
   - **Expected:** Insights should not be generated

### Verify in Database:
```sql
-- Check insight count for current month
SELECT COUNT(*) as insight_count 
FROM shorts_usage_logs 
WHERE user_id = 'YOUR_USER_ID'
  AND action = 'insight'
  AND created_at >= date_trunc('month', CURRENT_DATE);
-- Should show 5 (limit reached)
```

## Test 5: Forecasting Feature (Free Plan)

### Steps:
1. **Open a dashboard** with date and numeric columns
2. **Switch to Advanced View:**
   - Click "Advanced View" button
3. **Check for Forecasting:**
   - **Expected:** Forecasting chart should NOT appear
   - **Expected:** Only basic charts visible
4. **Upgrade to Pro:**
   - Go to Pricing page
   - Upgrade to Pro plan
   - **Expected:** Forecasting chart should now appear

## Test 6: Upgrade Flow

### Steps:
1. **Hit a limit** (e.g., create 3 dashboards)
2. **Try to exceed limit** (create 4th dashboard)
3. **See upgrade prompt:**
   - Should show current usage (3/3)
   - Should show "Upgrade Now" button
4. **Click "Upgrade Now":**
   - Should redirect to Pricing page
   - Should highlight Pro/Business plan
5. **Complete upgrade** (if Stripe configured)
   - After upgrade, limits should increase
   - Should be able to create more dashboards

## Test 7: Usage Stats Display

### Steps:
1. **Go to Dashboard page**
2. **Check for Usage Stats component:**
   - Should show current plan (Free/Pro/etc.)
   - Should show usage bars for:
     - Dashboards (e.g., 2/3)
     - Uploads (e.g., 3/5)
     - AI Insights (e.g., 1/5)
   - Should show progress bars
3. **As you use features:**
   - Usage should update in real-time
   - Progress bars should fill up

## Quick Test Script

Run this in browser console (on your dashboard page):

```javascript
// Test limit checking
async function testLimits() {
  const token = localStorage.getItem('sb-access-token') || 
                (await supabase.auth.getSession()).data.session?.access_token;
  
  // Test dashboard limit
  const response = await fetch('http://localhost:5000/api/dashboards', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'Test Dashboard',
      data: [{ test: 'data' }],
      columns: ['test']
    })
  });
  
  const result = await response.json();
  console.log('Dashboard creation result:', result);
  
  if (response.status === 403) {
    console.log('✅ Limit enforcement working!');
    console.log('Error:', result.error);
    console.log('Message:', result.message);
  }
}

testLimits();
```

## Expected Error Messages

When limits are reached, you should see:

1. **Dashboard Limit:**
   ```json
   {
     "error": "Dashboard limit reached",
     "message": "You've reached your limit of 3 dashboards. Please upgrade to create more.",
     "limit": 3,
     "current": 3,
     "plan": "free",
     "upgradeRequired": true
   }
   ```

2. **Upload Limit:**
   ```json
   {
     "error": "Upload limit reached",
     "message": "You've reached your monthly upload limit of 5. Please upgrade to upload more files.",
     "limit": 5,
     "current": 5,
     "plan": "free",
     "upgradeRequired": true
   }
   ```

3. **File Size Limit:**
   ```json
   {
     "error": "File size limit exceeded",
     "message": "File size (6.5MB) exceeds your plan limit of 5MB. Please upgrade to upload larger files.",
     "fileSize": 6.5,
     "limit": 5,
     "plan": "free",
     "upgradeRequired": true
   }
   ```

## Troubleshooting

### Limits Not Working?
1. **Check backend logs:** Look for error messages
2. **Verify Supabase connection:** Check `.env` files
3. **Check database:** Verify tables exist and have data
4. **Check authentication:** Make sure user is logged in
5. **Check subscription:** Verify user has a subscription record

### Database Queries to Debug:

```sql
-- Check user's subscription
SELECT * FROM shorts_subscriptions WHERE user_id = 'YOUR_USER_ID';

-- Check dashboard count
SELECT COUNT(*) FROM shorts_dashboards WHERE user_id = 'YOUR_USER_ID';

-- Check upload count (this month)
SELECT COUNT(*) FROM shorts_file_uploads 
WHERE user_id = 'YOUR_USER_ID'
  AND upload_date >= date_trunc('month', CURRENT_DATE);

-- Check insight count (this month)
SELECT COUNT(*) FROM shorts_usage_logs 
WHERE user_id = 'YOUR_USER_ID'
  AND action = 'insight'
  AND created_at >= date_trunc('month', CURRENT_DATE);
```

## Success Criteria

✅ **All limits enforced:**
- Dashboard creation blocked at limit
- File uploads blocked at limit
- File size checked before upload
- AI insights blocked at limit
- Forecasting hidden for free users

✅ **User experience:**
- Clear error messages
- Upgrade prompts appear
- Usage stats visible
- Progress bars accurate

✅ **Backend validation:**
- Limits checked before processing
- 403 errors returned correctly
- Usage logged in database

Ready to test! Start with Test 1 and work through each one.




