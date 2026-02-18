# Schema for All Data & Dashboards

Single reference for (1) how **dataset schema** is defined and returned, (2) the **DashboardSpec** shape used by Studio and AI Visual Builder, and (3) **known example datasets** and their fields.

---

## 1. Dataset schema (all data)

Every dataset (example or user-provided) is **profiled at runtime**. The same schema shape is used for all.

**API:** `GET /api/ai/dataset-schema?dataset=<datasetId>`

**Response shape:**

```ts
{
  rowCount: number;
  fields: Array<{
    name: string;        // Column name
    type: "string" | "number" | "date";
    examples: string[];  // Up to 5 sample values
    min?: number | string;  // For number: min value; for date: ISO date string
    max?: number | string;  // For number: max value; for date: ISO date string
  }>;
}
```

- **Types** are inferred from data (date patterns, numeric ratio, else string).
- **examples** help the AI and UI show sample values.
- **min/max** are set for numeric and date fields when available.

Other datasets (e.g. from `/api/example/:id` or user dashboards) use this same schema; they are not listed below but follow the same format.

---

## 2. Known example datasets (reference)

Canonical list of example dataset IDs and their typical fields. Used for prompts, docs, and UI. Actual schema is always from the API above.

| Dataset ID       | Typical fields (name → type) |
|------------------|-----------------------------|
| **sales**        | Date (date), Product (string), Category (string), Sales (number), Region (string), Units (number) |
| **attendance**   | Date (date), Employee (string), Department (string), Hours (number), Status (string) |
| **donations**    | Date (date), Donor (string), Category (string), Amount (number), PaymentMethod (string) |
| **medical**      | Date (date), Patient ID (string), Department (string), Diagnosis (string), Age (number), Blood Pressure (mmHg) (string), Heart Rate (bpm) (number), Temperature (°F) (number), Treatment Cost ($) (number), Medication (string), Visit Duration (min) (number), Status (string) |
| **banking**      | (Varies by endpoint; typically date, category, amount/balance, etc.) |
| **yearly-income**| (Varies; typically year and income/metric columns) |
| **today-snapshot**| date (date), occupancy_rate (number), rooms_available (number), rooms_occupied (number), arrivals_today (number), departures_today (number), revenue_today (number), adr (number), revpar (number) |
| **revenue-trends** | date (date), occupancy_rate (number), revenue (number), adr (number), revpar (number) |
| **alters-insights** | date (date), alert_type (string), severity (string), description (string), recommended_action (string) |
| **samgov/live** | postedDate (date), updatedDate (date), title (string), solicitationNumber (string), type (string), organization (string), naicsCode (string), state (string), responseDeadLine (date), award_amount (number), uiLink (string) |

User data: `datasetId` can be `dashboard:<uuid>` for a user’s saved dashboard; schema is profiled from that dashboard’s stored data.

---

## 3. DashboardSpec (dashboard schema)

Used by **Studio** and **AI Visual Builder**. AI returns only this JSON; the app renders it (no code generation).

**Shape:**

```ts
{
  title: string;
  filters: Array<{
    id: string;
    type: "date_range" | "select" | "number_range";
    label: string;
    field: string;  // Must exist in dataset schema
  }>;
  kpis: Array<{
    id: string;
    label: string;
    field: string;
    aggregation: "sum" | "avg" | "count" | "min" | "max";
  }>;
  charts: Array<{
    id: string;
    type: "line" | "bar" | "pie" | "table" | "kpi";
    title: string;
    xField?: string;
    yField?: string;
    dimension?: string;
    metric?: string;
    field?: string;
    aggregation?: string;
    columns?: string[];
    limit?: number;
  }>;
  layout: Array<{ type: "row"; items: string[] }>;  // Optional; renderer may use default order
  style?: { theme?: "executive_clean" | "light" | "dark" };
  warnings?: string[];
  datasetId?: string;   // Set by Studio when saving
  metadata?: { name: string; status: string; version?: string; ... };
}
```

**Rules:**

- Every `field`, `xField`, `yField`, `dimension`, `metric` must be a field name from the dataset schema.
- Chart types: `line` (x = date, y = numeric), `bar` (x = dimension, y = metric), `pie` (dimension + metric), `table` (rows), `kpi` (field + aggregation).
- Filter types: `date_range` (date field), `select` (categorical), `number_range` (numeric).
- If the user asks for a date filter but the dataset has no date field, the AI omits it and adds a `warnings` entry.

---

## 4. Where each schema is used

| Schema            | Used by |
|-------------------|--------|
| Dataset schema    | `GET /api/ai/dataset-schema`, Studio/AI Visual Builder dataset preview, AI prompt context |
| DashboardSpec     | `POST /api/ai/dashboard-spec` response, Studio save/load, StudioAppView and DashboardRenderer |
| Known datasets    | `datasetPrompts.js` (suggested prompts), docs, dataset selector options |

---

## 5. Getting the schema for “all” data

- **Per dataset:** Use `GET /api/ai/dataset-schema?dataset=<id>` for one dataset at a time.
- **Reference for example data:** Use the “Known example datasets” table above.
- **Programmatic list of dataset IDs:** Example IDs are in `EXAMPLE_DATASET_IDS` in the app (e.g. sales, attendance, donations, medical, banking, yearly-income); user datasets use `dashboard:<uuid>`.

There is no single API that returns every dataset’s schema in one response; the single **schema format** (rowCount + fields) is the same for all.
