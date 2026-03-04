# Federal Entry Intelligence Report Engine

## Overview

Automated report engine built on GovCon 4-pack data sources. Generates opportunity scores, first-win shortlist, and AI summary.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/reports/federal-entry/run` | Start report generation (returns 202 + reportRunId) |
| GET | `/api/reports/federal-entry/:reportRunId/data` | Full data (raw + computed) |
| GET | `/api/reports/federal-entry/:reportRunId/summary` | AI summary + shortlist |
| GET | `/api/reports/federal-entry/:reportRunId/pdf` | Stub (501) |
| GET | `/api/reports/federal-entry/:reportRunId/leads.csv` | CSV export of shortlist |

## Request Body (POST /run)

For companies pursuing their first federal contract (no GSA schedule or existing vehicle required). Use industry category or custom NAICS.

```json
{
  "industryKey": "JANITORIAL",
  "naics": ["561720"],
  "keywords": [],
  "agency": "TREASURY",
  "fy": ["2024", "2025", "2026"],
  "limit": 500,
  "debug": false
}
```

**Override rules:**
- **Custom NAICS overrides industry**: When `naics` is provided and non-empty, it replaces industry-derived NAICS.
- **When `naics` is blank**: Backend uses `industryKey` to derive `industryNaics[]` from the mapping (see `backend/govcon/industryNaicsMap.js`).
- **Other**: `industryKey: "OTHER"` has no default NAICS; user must provide custom `naics`.

- **industryKey**: One of `IT_FIRMS`, `CONSTRUCTION`, `STAFFING`, `PROF_SERVICES`, `LOGISTICS`, `JANITORIAL`, `MANUFACTURING`, `MEDICAL`, `ENVIRONMENTAL`, `SECURITY`, `OTHER`
- **naics**: Resolved list; frontend sends from industry (when custom blank) or from custom input (overrides).
- **keywords**: Optional; leave `[]` for broad search.
- **agency**: Default `TREASURY`; specify e.g. `"DOD"`, `"GSA"`.
- **fy**: Fiscal years; defaults to 2024, 2025, 2026.
- **debug**: When `true`, response includes `debug` object with `resolvedFilters`, `sampleOpportunityNaics`, `samQuery`, `samCount`, `awardsQuery`, `awardsCount`, `spendQuery`, `spendCount`.
- **usOnly**, **preferSetAsides**, **excludeVehicleRequired**: Optional toggles; when true, filter/score opportunities accordingly.

## Computed Outputs

1. **computeEntryBarrierScore(data)** – Market-level barrier (0–100), weighted:
   - concentration 40%, avg award size 25%, growth trend 15%, opportunity volume 20%
   - barrierLevel: Low (<40), Medium (40–70), High (≥70)

2. **computeOpportunityWinScore(opportunity, companyProfile)** – Per-opportunity win score (0–100), pure deterministic:
   - fit_score: NAICS match, keyword hits, agency match, set-aside (+15 small business/8a/WOSB/SDVOSB/HUBZone, +10 janitorial/custodial/cleaning)
   - penalty: −20 if GSA schedule / task order under IDIQ / vehicle required in text
   - per-opp barrier: days until deadline (fewer days = higher barrier)
   - win_score = fit_score × (1 − barrier_score/100)

3. **computeConfidenceFromCoverage(oppCount, awardsCount, spendCount)** – Returns confidenceLevel (High/Medium/Low) and confidenceReason based on data coverage.

4. **growthRatePercent**: `((marketSizeFY2025 - marketSizeFY2024) / marketSizeFY2024) * 100`, 1 decimal; null (display "N/A") when FY2024 is 0 or null.

5. **Report JSON** (all computed before AI): `barrierScore`, `barrierLevel`, `marketSizeFY2024`, `marketSizeFY2025`, `growthRatePercent`, `avgAwardSize`, `concentrationPercent`, `topRecipients`, `opportunityScores: [{ noticeId, winScore }]` (sorted by winScore DESC)

6. **first_win_shortlist** – Top 20 opportunities by win_score (after US-only and exclude-vehicle-required filtering)

7. **AI summary** (OpenAI): executive_summary, top_agencies, top_opps (10), next_actions (10)

## Database

- **report_runs** table (Supabase migration: `supabase/migrations/20260302000000_report_runs.sql`)
- Columns: id, created_at, input_json, data_json, summary_json, status

Run migration:
```bash
supabase db push
# or apply manually in Supabase SQL Editor
```

## Frontend

- **Page**: `/reports/federal-entry`
- **Nav**: Sidebar "Federal Entry Report"
- **GovCon 4-Pack**: "Federal Entry Report" button links to report page
- Flow: Run → poll for completion → display shortlist + executive summary + Download leads.csv

## Testing / Validation

Use the following curl examples to validate industry-based NAICS filtering and custom override.

**1. Run with industry JANITORIAL** (NAICS 561720 auto-populated; opportunities should skew janitorial-related):

```bash
curl -X POST http://localhost:5000/api/reports/federal-entry/run \
  -H "Content-Type: application/json" \
  -d '{"industryKey":"JANITORIAL","naics":["561720"],"keywords":[],"agency":"TREASURY","fy":["2024","2025","2026"],"limit":100,"debug":true}'
```

Poll for summary (replace `REPORT_ID` with `reportRunId` from response):

```bash
curl http://localhost:5000/api/reports/federal-entry/REPORT_ID/summary
```

**Expect:** `first_win_shortlist` titles/NAICS should lean toward janitorial/facilities (561720) rather than unrelated codes.

**2. Custom NAICS override** (industry-derived NAICS replaced by user input):

```bash
curl -X POST http://localhost:5000/api/reports/federal-entry/run \
  -H "Content-Type: application/json" \
  -d '{"industryKey":"JANITORIAL","naics":["541512","541511"],"keywords":[],"agency":"","fy":["2024","2025"],"limit":50,"debug":true}'
```

**Expect:** Backend uses `naics: ["541512","541511"]` (IT) instead of JANITORIAL’s 561720. Opportunities and awards should reflect IT-related NAICS.

**3. Debug output interpretation**

When `debug: true`, the summary response includes:

| Field | Meaning |
|-------|---------|
| `resolvedFilters` | Final filters used (naics, agency, fy, etc.) |
| `samQuery` | SAM.gov opportunities request (URL + params); `ncode` is first NAICS |
| `samCount` | Number of opportunities returned |
| `awardsQuery` | USAspending spending_by_award request |
| `awardsCount` | Number of recent awards |
| `spendQuery` | USAspending spending_over_time request |
| `spendCount` | Number of spend-over-time rows |

Use these to confirm NAICS filtering is applied across SAM.gov and USAspending.

## Files

| File | Purpose |
|------|---------|
| `backend/routes/reports/federalEntry.js` | Route handlers |
| `backend/routes/reports/index.js` | Mount at /federal-entry |
| `backend/utils/govconFetchers.js` | Data fetchers (updated with responseDeadLine) |
| `supabase/migrations/20260302000000_report_runs.sql` | report_runs table |
| `src/pages/FederalEntryReport.jsx` | Report page |
| `src/pages/GovCon4Pack.jsx` | Link to report |
