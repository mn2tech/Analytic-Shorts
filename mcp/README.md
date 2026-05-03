# Analytics Shorts MCP Server

This MCP server lets Claude call the Analytics Shorts backend engine through the existing HTTP API.

## Install

From the project root:

```bash
cd mcp
npm install
```

Start it manually for a quick smoke test:

```bash
npm start
```

The Analytics Shorts backend must also be running. By default, the MCP server calls `http://localhost:5000`.

## Environment Variables

- `ANALYTICS_SHORTS_URL`: Backend base URL. Defaults to `http://localhost:5000`.
- `ANALYTICS_SHORTS_API_KEY`: Optional API key or bearer token. When set, requests include `Authorization: Bearer <value>`.

## Claude Desktop Config

Add this to `claude_desktop_config.json`. Update the path if your checkout is in a different location.

```json
{
  "mcpServers": {
    "analytics-shorts": {
      "command": "node",
      "args": [
        "C:\\Users\\kolaw\\Projects\\NM2-Analytics-Shorts\\mcp\\index.js"
      ],
      "env": {
        "ANALYTICS_SHORTS_URL": "http://localhost:5000",
        "ANALYTICS_SHORTS_API_KEY": ""
      }
    }
  }
}
```

Restart Claude Desktop after saving the config.

## Exposed Tools

- `health_check`: `GET /api/health`
- `get_example_dataset`: `GET /api/example/:dataset` for `sales`, `attendance`, or `donations`
- `upload_and_analyze`: `POST /api/upload` with multipart field `file`
- `generate_insights`: `POST /api/insights` with `data`, `columns`, and optional `filename`
- `run_federal_entry_report`: `POST /api/reports/federal-entry/run` with `industryKey`, `naics`, optional `agency`, optional `fy`, and optional `limit`
- `get_federal_report_summary`: `GET /api/reports/federal-entry/:reportRunId/summary`

## Example Claude Prompts

- "Use Analytics Shorts to check whether the backend is healthy."
- "Fetch the sales example dataset and summarize the columns and row count."
- "Upload and analyze `C:\\Users\\kolaw\\Projects\\NM2-Analytics-Shorts\\sample-data.csv`."
- "Generate insights for this data array using these columns: `Region`, `Revenue`, and `Month`."
- "Run a federal entry report for industry key `HEALTHCARE`, NAICS `541611` and `541990`, agency `Department of Health and Human Services`, fiscal years `2024` and `2025`, limit 100."
- "Get the summary for federal report run `<reportRunId>`."
