# Schema & AI Plan — Single Source of Truth

This doc describes the **canonical DashboardSpec schema** and how it keeps all AI prompts, validation, and rendering in sync.

---

## 1. Single source of truth

- **File:** `backend/schema/dashboardSpecSchema.js`
- **Contains:** Allowed filter/chart/aggregation/theme values, `getSystemPromptSchemaBlock()`, and `validate(spec, datasetFields)`.
- **Used by:**
  - **POST /api/ai/dashboard-spec** — system prompt uses `getSystemPromptSchemaBlock()`; validation uses `validate()` (with one retry on invalid).
  - **Studio** and **AI Visual Builder** — same spec shape; frontend renderer and suggested prompts align with these types.

**Dataset schema** (profiled at runtime) is separate: see `src/studio/schema/data-and-dashboard-schema.md` for dataset schema API and known example datasets.

---

## 2. End-to-end flow

```
Dataset (example or dashboard:<uuid>)
    → GET /api/ai/dataset-schema?dataset=<id>
    → Profiled schema (rowCount, fields with name, type, examples, min/max)

User prompt + (optional) existingSpec
    → POST /api/ai/dashboard-spec { datasetId, userPrompt, existingSpec? }
    → System prompt = getSystemPromptSchemaBlock() + “use only field names from schema”
    → User message = dataset schema + user request (+ current spec if refining)
    → AI returns JSON → parseSpecFromResponse() → validate(spec, schemaSummary.fields)
    → If invalid: one retry with validation errors in follow-up user message
    → Response: { spec }

Frontend (Studio / AI Visual Builder)
    → Renders spec via DashboardRenderer (filters, KPIs, charts)
    → Suggested prompts from datasetPrompts.js (by datasetId + schema); describe capabilities that match allowed chart/filter types
```

So: **one schema definition** drives both what the AI is told to output and what the backend accepts. Adding a new chart or filter type is done in one place (below).

---

## 3. How to add a new chart or filter type

1. **Update canonical schema**
   - In `backend/schema/dashboardSpecSchema.js`:
     - Add the new type to `ALLOWED_CHART_TYPES` or `ALLOWED_FILTER_TYPES` (or aggregations/themes if needed).
     - If the new chart uses extra field keys (e.g. `groupBy`), add them to `CHART_FIELD_KEYS` so validation checks them against the dataset.
     - In `getSystemPromptSchemaBlock()`, extend the `charts` or `filters` description and the Rules so the AI knows the new type and which fields to use.

2. **Validation**
   - `validate()` already uses the `ALLOWED_*` arrays and `CHART_FIELD_KEYS`/`FILTER_FIELD_KEYS`; no extra validation file needed.

3. **Renderer**
   - In `src/components/aiVisualBuilder/DashboardRenderer.jsx` (or equivalent), add a branch for the new chart/filter type and render it (e.g. new Recharts component or filter control).

4. **Suggested prompts (optional)**
   - In `src/studio/utils/datasetPrompts.js`, add or adjust prompts so that “suggested prompts” mention the new capability where it makes sense (e.g. “Show X as a donut chart” when you add `donut`).

5. **Docs**
   - Update `src/studio/schema/data-and-dashboard-schema.md` (DashboardSpec shape table) and this plan if the spec shape or flow changes.

---

## 4. Keeping AI prompts aligned

- **System prompt:** Built from `getSystemPromptSchemaBlock()` only. No duplicate schema text in `backend/routes/aiDashboardSpec.js` (or elsewhere). Edits to allowed types and spec shape happen in `dashboardSpecSchema.js`.
- **Suggested prompts:** In `datasetPrompts.js`, suggested prompts describe actions that match the schema (e.g. “Bar chart of X by Y”, “Date range filter”). When you add a new chart/filter type, add a corresponding suggestion so users discover it.
- **Validation errors on retry:** The backend sends the exact `validate()` errors back to the AI so it can fix field names and types; the AI’s “contract” is the same as validation.

---

## 5. Optional: public schema endpoint

To expose the spec shape to the frontend or docs (e.g. for a schema-driven UI or codegen), you can add:

- **GET /api/ai/schema** — returns `{ dashboardSpec: getSystemPromptSchemaBlock(), allowedChartTypes, allowedFilterTypes, ... }` (re-export from `dashboardSpecSchema.js`).

This is optional; the main contract is “AI outputs DashboardSpec JSON; backend validates with `validate()`; frontend renders with DashboardRenderer.”
