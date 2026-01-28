# USASpending API Integration Guide

This guide explains how to access real-time USASpending data through the API.

## Available Endpoints

### 1. Sample Data (Static)
**Endpoint:** `GET /api/example/usaspending`

Returns a static sample dataset with 30 pre-configured records. Use this for testing and demos.

**Example:**
```bash
curl http://localhost:5000/api/example/usaspending
```

### 2. Live Data (Real-time from USASpending.gov)
**Endpoint:** `GET /api/example/usaspending/live`

Fetches real-time data from the official USASpending.gov API.

**Base URL:**
```
GET /api/example/usaspending/live
```

## Query Parameters

You can filter the live data using query parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 100 | Number of records to fetch (max 500) |
| `fiscal_year` | integer | Current year | Fiscal year to filter (e.g., 2023) |
| `award_type` | string | null | Award type: `A` for grants, `C` for contracts |
| `state` | string | null | State code (e.g., `VA`, `CA`, `NY`) |

## Examples

### Get 100 recent awards from current fiscal year:
```
GET /api/example/usaspending/live
```

### Get 50 contracts from fiscal year 2023:
```
GET /api/example/usaspending/live?limit=50&fiscal_year=2023&award_type=C
```

### Get grants from Virginia:
```
GET /api/example/usaspending/live?award_type=A&state=VA
```

### Get contracts from California in 2022:
```
GET /api/example/usaspending/live?fiscal_year=2022&award_type=C&state=CA&limit=200
```

## Response Format

The API returns data in the same format as other example datasets:

```json
{
  "data": [
    {
      "Award Date": "2024-01-15",
      "Award Amount": 2500000,
      "Prime contractor": "Tech Solutions Inc",
      "Awarding Agency": "Department of Defense",
      "Award Type": "Contract",
      "State": "VA",
      "NAICS Code": 541511,
      "Description": "Software Development Services"
    }
  ],
  "columns": ["Award Date", "Award Amount", ...],
  "numericColumns": ["Award Amount", "NAICS Code"],
  "categoricalColumns": ["Prime contractor", "Awarding Agency", ...],
  "dateColumns": ["Award Date"],
  "rowCount": 100,
  "source": "USASpending.gov API (Real-time)",
  "filters": {
    "fiscal_year": 2024,
    "award_type": null,
    "state": null,
    "limit": 100
  }
}
```

## Using in Frontend

The live data option is available in the example datasets list:

1. Go to the home page
2. Click "Try Example Dashboard"
3. Select "USA Spending (Live)" from the list
4. The app will fetch real-time data from USASpending.gov

## Award Type Codes

- `A` = Assistance (Grants, Loans, etc.)
- `C` = Procurement (Contracts)

## State Codes

Use standard 2-letter state abbreviations:
- `VA` = Virginia
- `CA` = California
- `NY` = New York
- `TX` = Texas
- etc.

## Fiscal Year

USASpending uses fiscal years that run from October 1 to September 30:
- Fiscal Year 2024 = October 1, 2023 to September 30, 2024
- Fiscal Year 2023 = October 1, 2022 to September 30, 2023

## Error Handling

If the USASpending API is unavailable, you'll receive an error message. In that case:
- Try again later
- Use the sample dataset instead: `/api/example/usaspending`
- Check the USASpending API status: https://api.usaspending.gov/

## Rate Limits

The USASpending API has rate limits. If you encounter rate limiting:
- Reduce the `limit` parameter
- Add delays between requests
- Use the sample dataset for testing

## Official Documentation

For more details about the USASpending API:
- **API Base:** https://api.usaspending.gov/
- **Documentation:** https://api.usaspending.gov/docs/
- **Intro Tutorial:** https://api.usaspending.gov/docs/intro-tutorial

## Notes

- The live API requires Node.js 18+ (for built-in `fetch`)
- Maximum 500 records per request
- Data is fetched in real-time, so it may take a few seconds
- The API response format may vary, so the code handles multiple formats
