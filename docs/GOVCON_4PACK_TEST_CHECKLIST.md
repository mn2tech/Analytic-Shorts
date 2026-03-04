# GovCon 4-Pack Template – Manual Test Checklist

## Overview

Template ID: `govcon-4pack`  
Page URL: `/govcon-4pack`

Four widgets wired to backend endpoints:
| Widget | Endpoint |
|--------|----------|
| Opportunities Feed | `GET /api/example/samgov/live` |
| Agency Rollup | `GET /api/example/samgov/agency-report` |
| Spend Over Time | `GET /api/example/proxy/usaspending/spending-over-time` |
| Recent Awards | `GET /api/example/usaspending/live` |

---

## Pre-requisites

- [ ] Backend running (`npm run server` or PM2)
- [ ] Frontend running (`npm run dev`)
- [ ] SAM.gov: Set `SAM_GOV_API_KEY` in `backend/.env` for Opportunities Feed and Agency Rollup (otherwise they show 503)

---

## Test Checklist

### 1. Page loads

- [ ] Go to `http://localhost:5173/govcon-4pack`
- [ ] Page loads without console errors
- [ ] Four widget cards visible in 2x2 grid

### 2. Test Template Data button

- [ ] Click **Test Template Data**
- [ ] Output shows status + rowCount for each of 4 endpoints
- [ ] Example expected (with SAM key):
  ```
  opportunities-feed: status=200 rowCount=...
  agency-rollup: status=200 rowCount=...
  spend-over-time: status=200 rowCount=...
  recent-awards: status=200 rowCount=...
  ```
- [ ] Without SAM key: first two show `status=503`

### 3. Spend Over Time widget (no SAM key needed)

- [ ] Widget loads data (TREASURY, FY 2024–2025)
- [ ] Table shows `fiscal_year`, `obligations`, `agency`
- [ ] Row count > 0

### 4. Recent Awards widget (no SAM key needed)

- [ ] Widget loads data
- [ ] Table shows award columns
- [ ] Row count > 0

### 5. SAM.gov widgets (with SAM_GOV_API_KEY)

- [ ] Opportunities Feed: loads live SAM.gov opportunities
- [ ] Agency Rollup: loads agency-level rollup
- [ ] Both show data table with row count

### 6. SAM.gov widgets (without SAM key)

- [ ] Opportunities Feed: shows amber message "API key not configured..."
- [ ] Agency Rollup: same
- [ ] Retry button present

### 7. Graceful error handling

- [ ] Stop backend, refresh page
- [ ] Widgets show "Cannot connect to backend" or similar
- [ ] No uncaught errors in console
- [ ] Restart backend, click Retry → data loads

### 8. Backend routes unchanged

- [ ] `curl "http://localhost:5000/api/example/samgov/live?ptype=o&limit=10"` → 200 or 503
- [ ] `curl "http://localhost:5000/api/example/samgov/agency-report?ptype=o&limit=10"` → 200 or 503
- [ ] `curl "http://localhost:5000/api/example/proxy/usaspending/spending-over-time?agency=TREASURY&fy=2024,2025"` → 200
- [ ] `curl "http://localhost:5000/api/example/usaspending/live?limit=10"` → 200

---

## Files Changed

| File | Change |
|------|--------|
| `src/config/govconTemplates.js` | New – template + 4 widget definitions |
| `src/hooks/useApiWidgetData.js` | New – generic API widget data loader |
| `src/components/widgets/GovConApiWidget.jsx` | New – widget renderer |
| `src/pages/GovCon4Pack.jsx` | New – page with 4 widgets + Test button |
| `src/config/studioTemplates.js` | Added `govcon-4pack` |
| `backend/studio-ai/templates/templates.js` | Added `govcon-4pack` |
| `src/App.jsx` | Route `/govcon-4pack` |

---

## Quick curl tests

```bash
# Health
curl -s http://localhost:5000/api/health

# USAspending (no key)
curl -s "http://localhost:5000/api/example/proxy/usaspending/spending-over-time?agency=TREASURY&fy=2024"
curl -s "http://localhost:5000/api/example/usaspending/live?limit=5"

# SAM.gov (needs SAM_GOV_API_KEY in .env)
curl -s "http://localhost:5000/api/example/samgov/live?ptype=o&limit=5"
curl -s "http://localhost:5000/api/example/samgov/agency-report?ptype=o&limit=10"
```
