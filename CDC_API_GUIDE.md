# CDC (Centers for Disease Control and Prevention) Health Data API Integration Guide

This guide explains how to access health statistics and disease surveillance data through the CDC API.

## Available Endpoint

**Endpoint:** `GET /api/example/cdc-health`

Fetches health statistics data from the Centers for Disease Control and Prevention.

**Base URL:**
```
GET /api/example/cdc-health
```

## Query Parameters

You can customize the date range and metric type using query parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `start_year` | integer | Current year - 5 | Start year for data (e.g., 2019) |
| `end_year` | integer | Current year | End year for data (e.g., 2024) |
| `metric` | string | `mortality` | Health metric type: `mortality`, `birth_rate`, or `life_expectancy` |

## Examples

### Get health data for the last 5 years (default):
```
GET /api/example/cdc-health
```

### Get health data for a specific range:
```
GET /api/example/cdc-health?start_year=2020&end_year=2024
```

### Get birth rate data:
```
GET /api/example/cdc-health?metric=birth_rate&start_year=2020&end_year=2024
```

### Get life expectancy data:
```
GET /api/example/cdc-health?metric=life_expectancy&start_year=2015&end_year=2024
```

## Response Format

The API returns data in the same format as other example datasets:

```json
{
  "data": [
    {
      "Date": "2019-01-01",
      "Year": "2019",
      "Month": "January",
      "Health Metric": 750.5,
      "Metric": "Death Rate (per 100,000)",
      "Period": "M01"
    },
    {
      "Date": "2019-02-01",
      "Year": "2019",
      "Month": "February",
      "Health Metric": 748.2,
      "Metric": "Death Rate (per 100,000)",
      "Period": "M02"
    }
  ],
  "columns": ["Date", "Year", "Month", "Health Metric", "Metric", "Period"],
  "numericColumns": ["Health Metric"],
  "categoricalColumns": ["Year", "Month", "Metric", "Period"],
  "dateColumns": ["Date"],
  "rowCount": 60,
  "source": "Centers for Disease Control and Prevention (CDC)",
  "metric": "mortality",
  "filters": {
    "start_year": 2019,
    "end_year": 2024,
    "metric": "mortality"
  }
}
```

## Using in Frontend

The CDC health data is available in the example datasets list:

1. Click "Load Example Dataset" in the dashboard
2. Select "CDC Health Data" from the dropdown
3. The data will load and be available for visualization

## Available Metrics

- **mortality**: Age-adjusted death rate per 100,000 population
- **birth_rate**: Births per 1,000 population
- **life_expectancy**: Life expectancy in years

## Production Integration

**Note:** The current implementation provides a demonstration endpoint. For production use, integrate with:

1. **CDC Wonder API**: https://wonder.cdc.gov/
   - Comprehensive health statistics database
   - Requires specific query parameters
   - Supports mortality, natality, and other health data

2. **CDC Data Portal**: https://data.cdc.gov/
   - Public datasets available via Socrata API
   - Various health topics and surveillance data

3. **NCHS (National Center for Health Statistics) API**:
   - Vital statistics and health survey data
   - Requires registration for some datasets

## API Key Setup

Most CDC public datasets don't require API keys, but some advanced features may require registration:

1. Visit https://wonder.cdc.gov/ for CDC Wonder API access
2. Register for an account if needed
3. Review API documentation for specific endpoints
4. Add any required API keys to your `.env` file:
   ```
   CDC_API_KEY=your_cdc_api_key_here
   ```

## Error Handling

The API handles errors gracefully:

- **404**: No data found for the specified date range
- **500**: API unavailable or network error
- Check the `hint` field in error responses for troubleshooting

## Rate Limits

CDC public APIs typically have rate limits. Check the specific API documentation for limits:
- CDC Wonder API: Varies by endpoint
- CDC Data Portal: Generally allows reasonable public access

## Official Documentation

- **CDC Wonder**: https://wonder.cdc.gov/
- **CDC Data Portal**: https://data.cdc.gov/
- **NCHS**: https://www.cdc.gov/nchs/index.htm
- **CDC API Documentation**: https://wonder.cdc.gov/wonder/help/main.html

## Example Use Cases

1. **Mortality Trends**: Track death rates over time
2. **Birth Rate Analysis**: Monitor population growth indicators
3. **Life Expectancy Tracking**: Analyze health outcomes over time
4. **Disease Surveillance**: Monitor public health trends
