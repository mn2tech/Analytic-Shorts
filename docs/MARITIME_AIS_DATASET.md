# Maritime AIS Demo Dataset

## Overview

The **Maritime AIS Demo** dataset provides realistic mock AIS (Automatic Identification System) vessel data for Analytics Shorts. It is exposed at `GET /api/datasets/maritime-ais` and is compatible with the Metric Engine and `/api/insights`.

### Fields

| Field         | Type   | Description                          |
|---------------|--------|--------------------------------------|
| `timestamp`   | date   | ISO 8601 time of the AIS message     |
| `mmsi`        | string | Maritime Mobile Service Identity      |
| `lat`         | number | Latitude                             |
| `lon`         | number | Longitude                            |
| `sog`         | number | Speed over ground (knots)             |
| `cog`         | number | Course over ground (degrees)          |
| `vessel_type` | string | e.g. Cargo, Tanker, Passenger, etc.  |

### Suggested starter dashboards

1. **Traffic volume over time** – AIS message count by hour or day  
2. **Top active vessels (by MMSI)** – Vessels with most messages  
3. **Suspicious loitering (sog < 1)** – Vessels with speed over ground below 1 knot  

---

## Manual test checklist

- [ ] **Backend: endpoint**
  - `GET http://localhost:5000/api/datasets/maritime-ais` returns 200.
  - Response has `data` (array), `columns`, `numericColumns`, `categoricalColumns`, `dateColumns`, `rowCount`, `suggestedDashboards`.
  - Each row has `timestamp`, `mmsi`, `lat`, `lon`, `sog`, `cog`, `vessel_type`.
  - Optional `?limit=100` returns up to 100 rows (10–5000 allowed).

- [ ] **Dashboard (Analytics Shorts)**
  - Open Dashboard → Data → Public Data APIs.
  - “Maritime AIS Demo” appears in the list.
  - Click it; data loads and charts render.
  - At least one numeric column (e.g. sog) and date (timestamp) and categorical (mmsi or vessel_type) are detected.
  - Line chart “Traffic volume over time”, bar chart “Top active vessels (by MMSI)”, and numeric filter “Suspicious loitering (sog < 1)” are suggested or configurable.

- [ ] **Insights**
  - With Maritime AIS data loaded, open a chart and request AI insights.
  - POST `/api/insights` receives `data` and `columns`; response returns insights (no errors).

- [ ] **Studio / AI Visual Builder**
  - In Studio, select dataset “maritime-ais” (or endpoint `/api/datasets/maritime-ais`).
  - Data loads for options/query.
  - Suggested prompts include the three starter dashboards (traffic, top vessels, loitering).
  - Generate a dashboard from one of the prompts; spec and render succeed.

- [ ] **AI dashboard-spec**
  - POST `/api/ai/dashboard-spec` with `datasetId: 'maritime-ais'` and a prompt.
  - Response includes a valid dashboard spec using fields from the schema (timestamp, mmsi, sog, etc.).

- [ ] **No regressions**
  - Existing example datasets (e.g. Sales, SAM.gov) still load.
  - Existing routes (`/api/example/*`, `/api/insights`) behave as before.
