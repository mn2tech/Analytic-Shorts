/**
 * Suggested prompts by dataset — executive and statistician level.
 * Used by Studio App and AI Visual Builder Studio. Prompts drive DashboardSpec (filters, KPIs, charts).
 * @see backend/schema/dashboardSpecSchema.js, data-and-dashboard-schema.md
 */

/** Executive & statistician prompts by dataset. Use actual column names from known schemas. */
export const DATASET_PROMPTS = {
  sales: [
    'Executive summary: Total Sales and Units KPIs, Sales trend over Date, top 10 Products by Sales, Region pie; date slider and Region filter.',
    'Board view: headline KPIs (sum Sales, sum Units), line chart of Sales over Date, bar chart Sales by Category, date range filter.',
    'Revenue concentration: KPIs for total Sales and count, bar chart of Sales by Region (top 10), pie by Category; Region and date filters.',
    'Sales performance: date slider, KPIs (Total Sales, Total Units), line chart Sales vs Date, bar chart by Product, table of top rows.',
    'Statistician view: distribution of Sales by Category and by Region; time series of Sales by Date; sum Sales KPI; date and Region filters.',
    'One-page exec dashboard: date range, Total Sales and Units KPIs, trend line (Sales by Date), bar chart by Product top 10, Region dropdown.'
  ],
  attendance: [
    'Executive summary: Total Hours KPI, Hours by Department bar chart, Hours over Date line chart; date slider and Department filter.',
    'Board view: sum Hours KPI, bar chart Hours by Department, line chart Hours vs Date, Employee/Department filters.',
    'Labor concentration: KPIs for total Hours and count, bar chart by Department, pie by Status; date range and Department filter.',
    'Attendance performance: date slider, Total Hours KPI, line chart Hours over Date, bar chart by Employee top 10, Status filter.',
    'Statistician view: distribution of Hours by Department and Status; time series Hours by Date; sum Hours KPI; date and Department filters.',
    'One-page exec dashboard: date range, Total Hours KPI, trend line (Hours by Date), bar chart by Department, Status dropdown.'
  ],
  donations: [
    'Executive summary: Total Amount KPI, Amount by Category bar chart, Donations over Date line chart; date slider and Category filter.',
    'Board view: sum Amount KPI, bar chart Amount by Category, line chart Amount vs Date, Donor and PaymentMethod filters.',
    'Giving concentration: KPIs for total Amount and count, bar chart by Category top 10, pie by PaymentMethod; date range filter.',
    'Donations performance: date slider, Total Amount KPI, line chart Amount over Date, bar chart by Donor top 10, Category filter.',
    'Statistician view: distribution of Amount by Category and PaymentMethod; time series Amount by Date; sum Amount KPI; date filter.',
    'One-page exec dashboard: date range, Total Amount KPI, trend line (Amount by Date), bar chart by Category, PaymentMethod dropdown.'
  ],
  medical: [
    'Executive summary: Total Treatment Cost KPI, Cost by Department bar chart, visits trend over Date; date slider and Department filter.',
    'Board view: sum Treatment Cost KPI, bar chart Cost by Department, line chart Cost vs Date, Diagnosis and Department filters.',
    'Cost concentration: KPIs for total Treatment Cost and count, bar chart by Department top 10, pie by Diagnosis; date range filter.',
    'Clinical performance: date slider, Treatment Cost and Visit Duration KPIs, line chart Cost over Date, bar chart by Diagnosis top 10.',
    'Statistician view: distribution of Treatment Cost by Department and Diagnosis; time series by Date; sum and avg KPIs; date and Department filters.',
    'One-page exec dashboard: date range, Total Treatment Cost KPI, trend line (Cost by Date), bar chart by Department, Diagnosis filter.'
  ],
  banking: [
    'Executive summary: Total Amount KPI, Amount by Category bar chart, trend over Date; date slider and Category filter.',
    'Board view: sum Amount KPI, bar chart Amount by Category, line chart Amount vs Date, date range filter.',
    'Concentration view: KPIs for total Amount and count, bar chart by Category top 10, table of rows; date and number range filters.',
    'Statistician view: distribution of Amount by Category; time series Amount by Date; sum Amount KPI; date range filter.'
  ],
  'yearly-income': [
    'Executive summary: Total Income KPI, Income by Year bar chart and line chart; date/year filter.',
    'Board view: sum Income KPI, bar chart Income by Year, line chart Income vs Year.',
    'Statistician view: time series Income by Year, sum and avg Income KPIs, table of yearly data.'
  ],
  'nfl-schedule': [
    'Wins by team: KPI count of games won, bar chart Winner (top 10), date range filter by Date.',
    'Points and yards: PtsW/PtsL KPIs (sum/avg), line chart PtsW by Week, bar chart YdsW by Winner top 10; Week filter.',
    'Executive summary: Total points (PtsW + PtsL) KPI, bar chart by Winner top 10, line chart points by Date; date slider and Winner dropdown.',
    'Turnovers and outcomes: TOW and TOL by Winner bar chart, PtsW vs PtsL table; Week and Winner filters.',
    'One-page dashboard: date range, PtsW/PtsL KPIs, bar chart Winner by wins (count), line chart PtsW by Week; Winner and Week filters.'
  ],
  pharmacy: [
    'Executive summary: Total Value KPI, Value by ReportType bar chart, Value over Date line chart; date slider and Location filter.',
    'Pharmacy report view: sum Value KPI, bar chart Value by ReportType, line chart Value vs Date; ReportType and Location dropdowns.',
    'By location: KPIs for total Value, bar chart Value by Location, pie by ReportType; date range and Location filter.',
    'Prescription and revenue: filter ReportType to Prescription volume and Revenue; KPIs and bar chart by Location, line chart by Date.',
    'One-page pharmacy dashboard: date range, Total Value KPI, trend line (Value by Date), bar chart by ReportType, Location and ReportType filters.'
  ],
  'superbowl-winners': [
    'Wins by team: KPI count of wins, bar chart Winner (wins count) with detailField Year to show years in tooltip, Year filter.',
    'Team and years in one chart: bar chart Winner by count with detailField Year so each bar shows which years that team won.',
    'Champions by year: stacked bar Year on x-axis and Winner as stack (one colored segment per year), Year filter.',
    'Executive summary: Total championships KPI (count), bar chart Winner by count, table Year and Winner; Year dropdown.',
    'One-page dashboard: count of wins KPI, bar chart Winner (top 10 by wins) with Year as detailField, line or table of Year vs Winner; Winner and Year filters.',
    'Modern view: radial bar chart Winner by count (gauge-style), bar chart with sheen; Year filter.'
  ],
  dashboard: [
    'Executive summary: headline KPIs for main metrics, trend over date, top segments bar chart, breakdown pie; date slider and category filter.',
    'Board view: KPIs, time series line chart, bar chart by main dimension, filters for date and category.',
    'Statistician view: distribution by category, time series, sum/count KPIs, table of top rows; date and segment filters.'
  ],
  upload: [
    'Executive summary: headline KPIs for your main metric, trend over time if you have a date column, top 10 bar chart by category, breakdown pie; add filters for your dimensions.',
    'Board view: sum KPI for first numeric column, bar chart by first category, line chart over date if available; date and category filters.',
    'Statistician view: distribution of your main metric by category; time series if date exists; sum/count KPIs; filters for category and date.',
    'One-page exec dashboard: KPIs, trend line (metric over date if you have it), bar chart by category top 10, category dropdown filter.',
    'Concentration view: total and count KPIs, bar chart by category (top 10), pie by second category; add filters.',
    'Performance dashboard: KPI tiles, bar chart by dimension, table of top rows; use your column names for filters.'
  ],
  'maritime-ais': [
    'Traffic volume over time: line chart of AIS message count by timestamp (or by hour/day); use timestamp as date axis.',
    'Top active vessels (by MMSI): bar chart of message count by mmsi (top 10 or 20); KPI total count.',
    'Suspicious loitering (sog < 1): filter or highlight vessels with speed over ground (sog) below 1 knot; table or bar chart of mmsi where sog < 1.'
  ]
}

/**
 * Templates when we have metric + dimension + date (full schema).
 */
const SCHEMA_PROMPT_TEMPLATES_FULL = [
  'Executive summary: Total {metric} KPI, {metric} trend over {date}, top 10 by {dimension} bar chart, breakdown pie; date slider and {dimension} filter.',
  'Board view: sum {metric} KPI, line chart {metric} vs {date}, bar chart by {dimension}; date range and {dimension} filter.',
  'Statistician view: distribution of {metric} by {dimension}; time series {metric} by {date}; sum {metric} KPI; date and {dimension} filters.',
  'One-page exec dashboard: date range, {metric} KPI, trend line ({metric} by {date}), bar chart by {dimension} top 10, {dimension} dropdown.'
]

/**
 * Templates when we only have metric + dimension (no date). Used for uploaded data and any schema.
 */
const SCHEMA_PROMPT_TEMPLATES_METRIC_DIM = [
  'Executive: Total {metric} KPI, bar chart {metric} by {dimension} (top 10), {dimension} filter.',
  'Board view: sum {metric} KPI, bar chart by {dimension}, table of top rows; {dimension} dropdown.',
  'Statistician view: distribution of {metric} by {dimension}; sum {metric} KPI; {dimension} filter.',
  'One-page dashboard: {metric} KPI, bar chart by {dimension} top 10, pie by {dimension}, {dimension} filter.'
]

/** Maximum number of suggested prompts to return. */
const MAX_SUGGESTED_PROMPTS = 5

/**
 * Get suggested prompts for a dataset. Uses DATASET_PROMPTS and adds schema-based executive/statistician prompts.
 * @param {string} datasetId - e.g. 'sales', 'attendance', or 'dashboard:uuid'
 * @param {{ fields?: { name: string, type: string }[] } | null} schema - From GET /api/ai/dataset-schema
 * @returns {string[]} Suggested prompts (executive and statistician level), max 5
 */
export function getSuggestedPrompts(datasetId, schema = null) {
  const baseId = typeof datasetId === 'string' && datasetId.startsWith('dashboard:')
    ? 'dashboard'
    : datasetId
  const list = DATASET_PROMPTS[baseId] ? [...DATASET_PROMPTS[baseId]] : []

  if (schema && schema.fields && Array.isArray(schema.fields) && schema.fields.length > 0) {
    const fields = schema.fields
    const numeric = fields.filter((f) => f.type === 'number').map((f) => f.name)
    const categorical = fields.filter((f) => f.type === 'string').map((f) => f.name)
    const date = fields.filter((f) => f.type === 'date').map((f) => f.name)
    const firstNum = numeric[0]
    const firstCat = categorical[0]
    const firstDate = date[0]
    const secondCat = categorical[1]

    if (firstNum && firstCat && firstDate) {
      for (const template of SCHEMA_PROMPT_TEMPLATES_FULL) {
        if (list.length >= MAX_SUGGESTED_PROMPTS) break
        const prompt = template
          .replace(/\{metric\}/g, firstNum)
          .replace(/\{dimension\}/g, firstCat)
          .replace(/\{date\}/g, firstDate)
        if (!list.includes(prompt)) list.push(prompt)
      }
    }
    if (firstNum && firstCat && list.length < MAX_SUGGESTED_PROMPTS) {
      for (const template of SCHEMA_PROMPT_TEMPLATES_METRIC_DIM) {
        if (list.length >= MAX_SUGGESTED_PROMPTS) break
        const prompt = template
          .replace(/\{metric\}/g, firstNum)
          .replace(/\{dimension\}/g, firstCat)
        if (!list.includes(prompt)) list.push(prompt)
      }
    }
    if (firstNum && firstCat && list.length < MAX_SUGGESTED_PROMPTS) {
      const p = `Executive: Total ${firstNum} KPI, bar chart ${firstNum} by ${firstCat} (top 10), date slider and ${firstCat} filter.`
      if (!list.includes(p)) list.push(p)
    }
    if (firstNum && firstDate && list.length < MAX_SUGGESTED_PROMPTS) {
      const p = `Statistician: time series of ${firstNum} by ${firstDate}, sum ${firstNum} KPI, date range filter.`
      if (!list.includes(p)) list.push(p)
    }
    if (firstNum && secondCat && list.length < MAX_SUGGESTED_PROMPTS) {
      const p = `Bar chart ${firstNum} by ${firstCat}, pie by ${secondCat}; add ${firstCat} and ${secondCat} filters.`
      if (!list.includes(p)) list.push(p)
    }
  }

  // Return unique prompts only, capped at 5
  return [...new Set(list)].slice(0, MAX_SUGGESTED_PROMPTS)
}
