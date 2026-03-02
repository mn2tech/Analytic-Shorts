# Executive AI Report API

Multi-skin Executive AI reporting endpoints built on the Studio Canonical IR.

## POST /api/studio/report

Generates a report from a pre-built Studio response with configurable mode and voice.

### Request

```json
{
  "buildResponse": { /* full response from POST /api/studio/build */ },
  "mode": "descriptive",
  "voice": "executive"
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| buildResponse | object | required | Response from `POST /api/studio/build` |
| mode | string | "descriptive" | `descriptive` \| `diagnostic` \| `predictive` \| `prescriptive` |
| voice | string | "executive" | `analyst` \| `agency` \| `executive` |

### Flow

1. Call `POST /api/studio/build` with `sourceConfig` (e.g. `{ datasetId: "sales" }`)
2. Pass the response to `POST /api/studio/report` as `buildResponse`
3. Receive `canonicalIR`, `report`, and `narrative`

### Sample Response

```json
{
  "runId": "uuid",
  "canonicalIR": {
    "dataset_profile": {
      "columns": [...],
      "rowCount": 1000,
      "intent": "sales",
      "primaryMetric": "revenue"
    },
    "metrics": [...],
    "segments": [...],
    "time_series": [...],
    "anomalies": [],
    "blocks": [...],
    "scene_graph": { "nodes": [...], "filters": [...], "pages": [...] },
    "charts": [...],
    "confidence": { "overall": 0.78, "perBlock": {} },
    "forecasts": [...]
  },
  "report": {
    "mode": "descriptive",
    "reportBlocks": [
      {
        "section": "ExecutiveOverview",
        "title": "Key metrics",
        "blocks": [...],
        "sourceRefs": ["metrics"]
      }
    ]
  },
  "narrative": {
    "voice": "executive",
    "executiveSummary": "...",
    "topInsights": ["...", "...", "..."],
    "suggestedQuestions": ["...", "...", "..."]
  }
}
```

### Report Modes

| Mode | Sections |
|------|----------|
| descriptive | ExecutiveOverview, PerformanceDrivers (KPIs, trends) |
| diagnostic | + drivers, period comparison |
| predictive | + ForwardOutlook (forecasts) |
| prescriptive | + StrategicRecommendations (evidence-backed actions) |

### Narrative Voices

- **analyst**: Factual, concise
- **agency**: Client-ready, professional
- **executive**: Corporate, confident, risk-aware, cites metrics, no slang/emojis

---

## POST /api/upload/analyze

Upload a file and receive CanonicalIR + descriptive report without running Studio Build separately.

### Request

`POST /api/upload/analyze` with `multipart/form-data`, field `file` (CSV, XLSX, JSON, or PDF).

### Response

```json
{
  "runId": "uuid",
  "canonicalIR": { ... },
  "report": {
    "mode": "descriptive",
    "reportBlocks": [...]
  }
}
```

No narrative is generated (for that, use `/api/studio/report` with the buildResponse from a dataset flow).
