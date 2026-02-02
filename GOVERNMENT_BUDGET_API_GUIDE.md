# Government Budget API Integration Guide

This guide explains how to access federal budget and fiscal data through the Government Budget API.

## Available Endpoint

**Endpoint:** `GET /api/example/government-budget`

Fetches federal budget data by category from U.S. Treasury Fiscal Data.

**Base URL:**
```
GET /api/example/government-budget
```

## Query Parameters

You can customize the date range and budget category using query parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `start_year` | integer | Current year - 5 | Start fiscal year for data (e.g., 2019) |
| `end_year` | integer | Current year | End fiscal year for data (e.g., 2024) |
| `category` | string | `all` | Budget category: `all`, `defense`, `healthcare`, `education`, `infrastructure`, `social_security`, `interest_on_debt` |

## Examples

### Get all budget categories for the last 5 years (default):
```
GET /api/example/government-budget
```

### Get budget data for a specific range:
```
GET /api/example/government-budget?start_year=2020&end_year=2024
```

### Get only defense budget:
```
GET /api/example/government-budget?category=defense&start_year=2020&end_year=2024
```

### Get healthcare budget:
```
GET /api/example/government-budget?category=healthcare&start_year=2015&end_year=2024
```

## Response Format

The API returns data in the same format as other example datasets:

```json
{
  "data": [
    {
      "Fiscal Year": "2019",
      "Year": "2019",
      "Budget Category": "Defense",
      "Budget Amount (Billions $)": 700.5,
      "Date": "2019-01-01"
    },
    {
      "Fiscal Year": "2019",
      "Year": "2019",
      "Budget Category": "Healthcare",
      "Budget Amount (Billions $)": 1200.3,
      "Date": "2019-01-01"
    }
  ],
  "columns": ["Fiscal Year", "Year", "Budget Category", "Budget Amount (Billions $)", "Date"],
  "numericColumns": ["Budget Amount (Billions $)"],
  "categoricalColumns": ["Fiscal Year", "Year", "Budget Category"],
  "dateColumns": ["Date"],
  "rowCount": 30,
  "source": "U.S. Treasury Fiscal Data",
  "category": "all",
  "filters": {
    "start_year": 2019,
    "end_year": 2024,
    "category": "all"
  }
}
```

## Using in Frontend

The government budget data is available in the example datasets list:

1. Click "Load Example Dataset" in the dashboard
2. Select "Government Budget" from the dropdown
3. The data will load with all budget categories
4. Use the "Budget Category" filter to view specific categories or compare them

## Available Budget Categories

- **Defense**: National defense spending
- **Healthcare**: Healthcare and medical programs
- **Education**: Education and training programs
- **Infrastructure**: Transportation and infrastructure projects
- **Social Security**: Social Security benefits
- **Interest on Debt**: Interest payments on national debt

## Production Integration

**Note:** The current implementation provides a demonstration endpoint. For production use, integrate with:

1. **Treasury Fiscal Data API**: https://fiscaldata.treasury.gov/
   - Official U.S. Treasury fiscal data
   - Federal budget, debt, and spending data
   - RESTful API with JSON responses

2. **USAspending.gov API**: https://api.usaspending.gov/
   - Detailed federal spending data
   - Award-level and agency-level data
   - Already integrated for contract/award data

3. **Congressional Budget Office (CBO)**: https://www.cbo.gov/
   - Budget projections and analysis
   - Economic forecasts
   - May require data scraping or manual downloads

4. **OMB (Office of Management and Budget)**: https://www.whitehouse.gov/omb/
   - President's budget proposals
   - Historical budget data

## API Key Setup

Most government budget APIs don't require API keys for public data:

- **Treasury Fiscal Data API**: No API key required for public data
- **USAspending.gov API**: No API key required (already integrated)
- Some advanced features may require registration

## Error Handling

The API handles errors gracefully:

- **404**: No data found for the specified date range
- **500**: API unavailable or network error
- Check the `hint` field in error responses for troubleshooting

## Rate Limits

Government APIs typically have reasonable rate limits for public access:

- Treasury Fiscal Data API: Generally allows reasonable public access
- USAspending.gov API: No strict limits for reasonable use

## Official Documentation

- **Treasury Fiscal Data**: https://fiscaldata.treasury.gov/
- **USAspending.gov API**: https://api.usaspending.gov/
- **CBO Data**: https://www.cbo.gov/data
- **Federal Budget Data**: https://www.govinfo.gov/app/collection/BUDGET

## Example Use Cases

1. **Budget Analysis**: Compare spending across different categories over time
2. **Trend Analysis**: Track budget growth or reduction in specific areas
3. **Category Comparison**: Compare defense vs. healthcare vs. education spending
4. **Fiscal Year Reports**: Generate reports for specific fiscal years
5. **Multi-year Trends**: Analyze budget changes over multiple years

## Data Visualization Tips

- Use **line charts** to show budget trends over time
- Use **bar charts** to compare different budget categories
- Use **donut charts** to show budget distribution by category
- Filter by **Budget Category** to focus on specific areas
- Use **date filters** to analyze specific fiscal years
