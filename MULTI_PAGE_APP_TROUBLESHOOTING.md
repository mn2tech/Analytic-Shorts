# Multi-Page App Troubleshooting Guide

## Issues Fixed

### ✅ Fixed Issues:
1. **Missing `handleUseTemplate` function** - Added to StudioHome.jsx
2. **Schema parsing** - Fixed to properly detect templates
3. **Route protection** - Added ProtectedRoute to Studio routes
4. **Page initialization** - Fixed to read from URL params

## Common Issues & Solutions

### Issue 1: "Cannot read property 'pages' of undefined"
**Cause:** Schema not normalized properly
**Solution:** Check that `normalizeSchema()` is called before accessing `pages`

### Issue 2: "handleUseTemplate is not defined"
**Cause:** Function missing from StudioHome
**Solution:** ✅ Fixed - function now exists

### Issue 3: Routes not working
**Cause:** Routes not protected or incorrect paths
**Solution:** ✅ Fixed - routes now protected with ProtectedRoute

### Issue 4: Page not loading
**Cause:** Page ID not set correctly
**Solution:** ✅ Fixed - reads from URL params

## Testing Checklist

### Test 1: Create New Multi-Page App
1. Navigate to `/studio/app/new`
2. Should see sample 2-page app
3. Should see page tabs (Overview, Details, Drill)
4. Should be able to switch between pages

### Test 2: Load Existing App
1. Create an app and save it
2. Navigate to `/studio/app/{id}`
3. Should load the app correctly
4. Should show all pages

### Test 3: Template Functionality
1. Create an app
2. Click "Save as Template"
3. Go to Studio Home
4. Click "Show Templates"
5. Should see template with "Use Template" button
6. Click "Use Template"
7. Should create new app from template

### Test 4: Drilldown Navigation
1. Open multi-page app
2. Click on a bar chart with drilldown action
3. Should navigate to detail page
4. Filters should be applied

### Test 5: Published View
1. Publish an app
2. Navigate to `/apps/{id}`
3. Should show view-only mode
4. Should not show edit controls

## Debug Steps

### Step 1: Check Browser Console
Open browser DevTools (F12) and check for errors:
- Look for red error messages
- Check Network tab for failed API calls
- Check Console for JavaScript errors

### Step 2: Verify Routes
Check that routes are registered in `src/App.jsx`:
```jsx
<Route path="/studio/app/:id" element={<StudioAppEditor />} />
<Route path="/apps/:id" element={<StudioAppView />} />
<Route path="/apps/:id/:pageId" element={<StudioAppView />} />
```

### Step 3: Check Schema Structure
Verify the schema has `pages[]` array:
```json
{
  "version": "2.0",
  "pages": [
    {
      "id": "overview",
      "title": "Overview",
      "sections": [...]
    }
  ]
}
```

### Step 4: Verify Components Exist
Check that these files exist:
- `src/pages/studio/StudioAppEditor.jsx`
- `src/pages/studio/StudioAppView.jsx`
- `src/studio/ui/AppShell.jsx`
- `src/studio/ui/PageRenderer.jsx`
- `src/studio/utils/schemaUtils.js`

### Step 5: Check API Endpoints
Verify backend endpoints work:
- `GET /api/dashboards/:id` - Should return dashboard with schema
- `POST /api/dashboards/:id/publish` - Should publish dashboard

## Common Error Messages

### "App not found"
- **Cause:** Dashboard ID doesn't exist or user doesn't have access
- **Solution:** Check dashboard exists in database, verify user authentication

### "Cannot read property 'pages' of null"
- **Cause:** Schema is null or not loaded
- **Solution:** Check `normalizeSchema()` is called, verify schema structure

### "handleUseTemplate is not defined"
- **Cause:** Function missing (should be fixed now)
- **Solution:** ✅ Fixed in latest commit

### "Route not found"
- **Cause:** Route not registered or path incorrect
- **Solution:** Check `src/App.jsx` routes, verify path matches

## Still Not Working?

1. **Clear browser cache** - Hard refresh (Ctrl+Shift+R)
2. **Check backend logs** - Verify API is responding
3. **Check network requests** - Look for 404 or 500 errors
4. **Verify authentication** - Make sure user is logged in
5. **Check database** - Verify dashboard exists with schema

## Next Steps

If still not working after fixes:
1. Check browser console for specific error
2. Check network tab for failed requests
3. Verify backend is running and updated
4. Test with sample app: `/studio/app/new`
