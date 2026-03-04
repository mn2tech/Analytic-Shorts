# Federal Entry Engine Report

## Endpoint

`POST /api/example/govcon/federal-entry-report`

## Request Body

```json
{
  "naics": ["541512"],
  "keywords": ["data analytics", "dashboard"],
  "agency": "TREASURY",
  "fy": ["2024", "2025"],
  "limit": 200
}
```

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| naics | string[] | [] | NAICS codes to filter |
| keywords | string[] | [] | Search keywords (first used for SAM.gov title) |
| agency | string | "TREASURY" | Agency shorthand or full name |
| fy | string[] | ["2024","2025"] | Fiscal years |
| limit | number | 200 | 1–500, caps at 500 |

## Response Shape

```json
{
  "reportId": "uuid",
  "generatedAt": "ISO8601",
  "inputs": { "naics": [], "keywords": [], "agency": "...", "fy": [], "limit": 200 },
  "scores": { "growthRate": number|null, "concentrationProxy": number|null },
  "market": {
    "marketSizeByFY": { "2024": number, "2025": number },
    "growthRate": number|null,
    "avgAwardSize": number|null,
    "opportunityCount": number,
    "totalAwardAmount": number,
    "awardCount": number
  },
  "agencyTargets": [{ "agency": "...", "opportunity_count": n, "total_award_amount": n }],
  "competitors": [{ "description": "...", "percentage": n }],
  "opportunities": [...],
  "strategy": { "summary": "..." },
  "actionPlan": ["...", "..."],
  "narrative": "..." | null
}
```

## Error Handling

| Status | Condition |
|--------|-----------|
| 400 | Validation error (bad naics/keywords/fy/limit) |
| 502 | Fetch timeout or upstream failure |
| 503 | SAM.gov API key not configured |
| 500 | Unexpected error |

## Test Commands

### curl

```bash
curl -X POST http://localhost:5000/api/example/govcon/federal-entry-report \
  -H "Content-Type: application/json" \
  -d '{"naics":["541512"],"keywords":["data analytics","dashboard"],"agency":"TREASURY","fy":["2024","2025"],"limit":200}'
```

### PowerShell Invoke-RestMethod

```powershell
$body = @{
  naics = @("541512")
  keywords = @("data analytics", "dashboard")
  agency = "TREASURY"
  fy = @("2024", "2025")
  limit = 200
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/example/govcon/federal-entry-report" `
  -Method Post -Body $body -ContentType "application/json" -UseBasicParsing
```

### Health Check

```bash
curl http://localhost:5000/api/health
```

```powershell
Invoke-RestMethod http://localhost:5000/api/health -UseBasicParsing
```

## Prerequisites

- **SAM.gov**: Set `SAM_GOV_API_KEY` in `backend/.env` for opportunities and agency report
- **OpenAI** (optional): Set `OPENAI_API_KEY` for narrative generation; otherwise `narrative` is `null`

## Files

| File | Purpose |
|------|---------|
| `backend/utils/govconFetchers.js` | Internal fetchers (SAM.gov, USAspending) |
| `backend/routes/example/federalEntryRoutes.js` | POST handler, metrics, narrative |
| `backend/routes/example/index.js` | Mount `/govcon` router |
