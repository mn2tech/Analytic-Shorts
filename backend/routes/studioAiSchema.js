/**
 * Standalone handler for POST /api/studio/ai-schema.
 * Loaded directly by server.js so the route works even if the full studio router has load issues.
 */
const OpenAI = require('openai')

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

const AI_SCHEMA_SYSTEM = `You are a dashboard schema assistant like Tableau or Power BI. The user asks in natural language (ChatGPT-style), e.g. "Create a tab with data and another tab with graphs of that data" or "Give me a Data tab with a table and a Charts tab with bar chart and pie chart like Tableau." Given their prompt and a list of data columns (with types: numeric, categorical, date), output ONLY valid JSON (no markdown, no explanation) with this exact structure:

{
  "filters": [
    { "id": "snake_case_id", "type": "time_range|dropdown|text", "label": "Label", "dimension": "ColumnName" (for dropdown), "default": "All" or { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" } }
  ],
  "queries": [
    { "id": "unique_id", "type": "aggregation|time_series|breakdown|table", "metric": "NumericColumn", "dimension": "ColumnName" (for time_series/breakdown), "aggregation": "sum|avg|count", "group_by": ["Col"], "order_by": "Col", "order_direction": "desc", "limit": 10, "filters": { "filter_id": "{{filters.filter_id}}" } }
  ],
  "sections": [
    { "id": "data-section", "title": "Data", "layout": "grid", "columns": 1, "widgets": [ { "id": "widget_id", "type": "data_table", "title": "Data", "query_ref": "table_query_id", "config": {}, "format": {} } ] },
    { "id": "graph-section", "title": "Graph", "layout": "grid", "columns": 1, "widgets": [ { "id": "w1", "type": "kpi|line_chart|bar_chart|pie_chart|area_chart", "title": "Title", "query_ref": "query_id", "config": { "x_axis": "Col", "y_axis": "Col" }, "format": {} } ] }
  ]
}

Rules:
- Interpret natural language: "tab with data" / "data tab" = a page with a data_table widget; "tab with graph" / "charts tab" = a page with chart widgets. Prefer creating multiple sections (tabs): one "Data" section with a table, one "Graph" or "Charts" section with Tableau-style visualizations (bar, line, pie).
- Use ONLY column names from the provided columns. For dropdown filters use categorical or date columns. For time_range use a date column. For KPI/charts use numeric columns as metric.
- Query types: "aggregation" (KPI), "time_series" (line chart, needs dimension=date), "breakdown" (bar or pie, needs dimension), "table" (raw data; id e.g. table_data_view, filters refs, limit: 500).
- Widget types: "kpi" (query_ref = aggregation), "line_chart" (time_series; trend lines), "area_chart" (time_series; filled area), "bar_chart" (breakdown; vertical or horizontal bars), "pie_chart" (breakdown; config.nameKey=dimension, config.valueKey=metric), "data_table" (query_ref = table query id).
- sections: Each section becomes a tab. Always prefer at least two sections when user asks for "data and graph": first section "Data" with one data_table; second section "Graph" or "Charts" with pie_chart, bar_chart, line_chart as appropriate. Section id snake_case (e.g. data-section, graph-section). Each section has widgets array; each widget has id, type, title, query_ref, config, format.
- Filter id lowercase with underscores. Query id and widget id unique. Every query must include "filters" object with refs for each filter (e.g. "time_range": "{{filters.time_range}}").
- For time_range filter use default { "start": "2024-01-01", "end": "2024-12-31" }. For dropdown use "default": "All".
- Output only the JSON object, no other text.`

async function aiSchemaHandler(req, res) {
  try {
    if (!openai) {
      return res.status(503).json({
        error: 'AI not configured',
        message: 'OPENAI_API_KEY is required for AI schema. Set it in your environment.'
      })
    }
    const { prompt, schema, columns } = req.body || {}
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'prompt is required' })
    }
    if (!columns || !Array.isArray(columns)) {
      return res.status(400).json({ error: 'columns array is required (e.g. [{ name, type }])' })
    }

    const safeSchema = schema && typeof schema === 'object' ? schema : {}
    const columnsDesc = columns.map(c => `${(c && c.name) || 'col'} (${(c && c.type) || 'unknown'})`).join(', ')
    const existingFilters = Array.isArray(safeSchema.global_filters) ? safeSchema.global_filters.map(f => f && f.id).filter(Boolean) : []
    const existingQueryIds = Array.isArray(safeSchema.queries) ? safeSchema.queries.map(q => q && q.id).filter(Boolean) : []

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: AI_SCHEMA_SYSTEM },
        {
          role: 'user',
          content: `Available columns: ${columnsDesc}. Existing filter ids (avoid duplicating): ${existingFilters.join(', ') || 'none'}. Existing query ids (avoid duplicating): ${existingQueryIds.join(', ') || 'none'}.\n\nUser request: ${prompt}\n\nOutput only the JSON object:`
        }
      ],
      max_tokens: 1500,
      temperature: 0.3
    })

    let text = (completion.choices && completion.choices[0] && completion.choices[0].message && completion.choices[0].message.content)
      ? String(completion.choices[0].message.content).trim()
      : ''
    if (!text) {
      return res.status(502).json({
        error: 'AI returned no content',
        message: 'OpenAI returned an empty response. Try again.'
      })
    }
    const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlock) text = codeBlock[1].trim()
    const jsonMatch = text.replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/, '$1')
    let parsed
    try {
      parsed = JSON.parse(jsonMatch)
    } catch (parseErr) {
      console.error('AI JSON parse error:', parseErr.message, 'text:', text.slice(0, 200))
      return res.status(502).json({
        error: 'Invalid AI response',
        message: 'Could not parse AI output as JSON. Try again or rephrase your prompt.'
      })
    }

    const filters = Array.isArray(parsed.filters) ? parsed.filters : []
    const queries = Array.isArray(parsed.queries) ? parsed.queries : []
    const sections = Array.isArray(parsed.sections) ? parsed.sections : []
    const widgets = Array.isArray(parsed.widgets) ? parsed.widgets : []

    if (sections.length > 0) {
      res.json({ filters, queries, sections })
    } else {
      res.json({ filters, queries, widgets })
    }
  } catch (error) {
    console.error('Error in /api/studio/ai-schema:', error)
    if (res.headersSent) return
    // OpenAI Node SDK uses error.status; axios uses error.response.status
    const status = error.status ?? error.response?.status
    const msg = error.message || (error.error && error.error.message) || (error.response?.data?.error?.message) || 'Unknown error'
    if (status === 401) {
      return res.status(503).json({ error: 'Invalid OpenAI API key', message: 'Check OPENAI_API_KEY in backend/.env or rotate the key at platform.openai.com' })
    }
    if (status === 429) {
      return res.status(503).json({ error: 'Rate limited', message: 'OpenAI rate limit. Try again in a moment.' })
    }
    if (status >= 400 && status < 500) {
      return res.status(502).json({ error: 'OpenAI API error', message: msg })
    }
    if (status >= 500) {
      return res.status(502).json({ error: 'OpenAI server error', message: 'OpenAI is temporarily unavailable. Try again in a moment.' })
    }
    res.status(500).json({
      error: 'AI schema failed',
      message: msg
    })
  }
}

module.exports = aiSchemaHandler
