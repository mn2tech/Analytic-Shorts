# BLS (Bureau of Labor Statistics) API Integration Guide

This guide explains how to access unemployment rate data through the BLS API.

## Available Endpoint

**Endpoint:** `GET /api/example/unemployment`

Fetches real-time unemployment rate data from the official Bureau of Labor Statistics API.

**Base URL:**
```
GET /api/example/unemployment
```

## Query Parameters

You can customize the date range using query parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `start_year` | integer | Current year - 5 | Start year for data (e.g., 2019) |
| `end_year` | integer | Current year | End year for data (e.g., 2024) |

## Examples

### Get unemployment data for the last 5 years (default):
```
GET /api/example/unemployment
```

### Get unemployment data for a specific range:
```
GET /api/example/unemployment?start_year=2020&end_year=2024
```

### Get unemployment data for the last 10 years:
```
GET /api/example/unemployment?start_year=2014&end_year=2024
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
      "Unemployment Rate (%)": 4.0,
      "Period": "M01"
    },
    {
      "Date": "2019-02-01",
      "Year": "2019",
      "Month": "February",
      "Unemployment Rate (%)": 3.8,
      "Period": "M02"
    }
  ],
  "columns": ["Date", "Year", "Month", "Unemployment Rate (%)", "Period"],
  "numericColumns": ["Unemployment Rate (%)"],
  "categoricalColumns": ["Year", "Month", "Period"],
  "dateColumns": ["Date"],
  "rowCount": 60,
  "source": "Bureau of Labor Statistics (BLS) API",
  "series": "LNS14000000 (U.S. Unemployment Rate, Seasonally Adjusted)",
  "filters": {
    "start_year": 2019,
    "end_year": 2024
  }
}
```

## Using in Frontend

The unemployment data is available in the example datasets list:

1. Go to the home page
2. Click "Try Example Dashboard"
3. Select "Unemployment Rate (BLS)" from the list
4. The app will fetch real-time data from the BLS API

## Data Series

The integration uses the following BLS series:

- **LNS14000000**: U.S. Unemployment Rate, Seasonally Adjusted
  - This is the official monthly unemployment rate published by the BLS
  - Data is seasonally adjusted
  - Updated monthly, typically on the first Friday of each month

## API Key (Optional)

The BLS API has two versions:

- **Version 1.0**: No registration required, but has lower rate limits
- **Version 2.0**: Requires free registration, provides higher rate limits and additional features

### Setting Up API Key (Optional)

To use BLS API v2.0 with higher rate limits:

1. Register for a free API key at: https://www.bls.gov/developers/api_signature_v2.htm
2. Add the key to your backend environment variables:
   ```bash
   # In backend/.env
   BLS_API_KEY=your_api_key_here
   ```
3. Restart your backend server

**Note:** The integration works without an API key using v1.0, but you may encounter rate limits with frequent requests.

## Error Handling

If the BLS API is unavailable, you'll receive an error message. In that case:

- Try again later
- Check the BLS API status: https://www.bls.gov/developers/
- Verify your date range is valid (BLS data typically goes back to 1948)

## Rate Limits

The BLS API has rate limits:

- **Without API key (v1.0)**: 25 requests per day
- **With API key (v2.0)**: 500 requests per day

If you encounter rate limiting:
- Wait before making another request
- Register for a free API key to get higher limits
- Reduce the number of requests

## Date Range Limits

- **Minimum**: Data available from 1948
- **Maximum**: Current month (data is updated monthly)
- **Default**: Last 5 years

## Official Documentation

For more details about the BLS API:

- **API Base:** https://api.bls.gov/publicAPI/v2/timeseries/data/
- **Documentation:** https://www.bls.gov/developers/api_signature_v2.htm
- **Getting Started:** https://www.bls.gov/developers/home.htm
- **Series Catalog:** https://www.bls.gov/help/hlpforma.htm

## Additional BLS Series IDs

You can extend this integration to include other economic indicators:

- **LNS12300000**: Labor Force Participation Rate
- **LNS14000001**: Unemployment Rate - Men
- **LNS14000002**: Unemployment Rate - Women
- **LNS14000003**: Unemployment Rate - White
- **LNS14000006**: Unemployment Rate - Black or African American
- **LNS14000009**: Unemployment Rate - Hispanic or Latino

See the full catalog: https://www.bls.gov/help/hlpforma.htm

## Notes

- Data is updated monthly, typically on the first Friday of each month
- All data is seasonally adjusted
- The API returns data in reverse chronological order (newest first), but our integration reverses it for better time series visualization
- Maximum 20 years of data per request (BLS API limitation)
- Data format is consistent with other example datasets for seamless dashboard integration
