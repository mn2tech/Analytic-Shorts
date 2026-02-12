const express = require('express')
const axios = require('axios')
const OpenAI = require('openai')
const { getExampleDatasetData } = require('./examples')
const router = express.Router()

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

// PII field blocklist - fields that should not be exposed in dropdowns
const PII_BLOCKLIST = [
  'name', 'email', 'ssn', 'phone', 'address',
  'firstname', 'lastname', 'first_name', 'last_name',
  'email_address', 'phone_number', 'phone_number', 'mobile',
  'social_security', 'ssn_number', 'social_security_number',
  'street_address', 'home_address', 'mailing_address',
  'credit_card', 'card_number', 'account_number',
  'password', 'pin', 'secret'
]

// In-memory cache for dropdown options
// Structure: { 'datasetId:field': { values: [...], timestamp: Date } }
const optionsCache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Helper to check if a field name contains PII keywords
function isPIIField(fieldName) {
  const lowerField = fieldName.toLowerCase()
  return PII_BLOCKLIST.some(blocked => lowerField.includes(blocked))
}

// Helper to get data from example datasets
async function getDatasetData(datasetId) {
  try {
    // First try to get from example datasets directly (for simple IDs like "sales", "attendance")
    const exampleData = getExampleDatasetData(datasetId)
    if (exampleData) {
      return exampleData
    }

    // If not found in examples, try to fetch from API endpoint
    // This handles dynamic datasets like unemployment, cdc-health, government-budget, usaspending/live
    const port = process.env.PORT || 5000
    const baseUrl = `http://localhost:${port}`
    // Handle dataset IDs with slashes (e.g., "usaspending/live")
    const encodedDatasetId = encodeURIComponent(datasetId).replace(/%2F/g, '/')
    const response = await axios.get(`${baseUrl}/api/example/${encodedDatasetId}`, {
      timeout: 10000
    })
    
    if (response.data && response.data.data) {
      return response.data.data
    }
    
    return null
  } catch (error) {
    // If it's a 404, that's okay - dataset just doesn't exist
    if (error.response && error.response.status === 404) {
      return null
    }
    console.error(`Error fetching dataset ${datasetId}:`, error.message)
    return null
  }
}

// Helper to get data from a custom API URL (for user-configured APIs in Studio)
async function getCustomApiData(customEndpoint, req) {
  if (!customEndpoint || typeof customEndpoint !== 'string') return null
  const url = customEndpoint.trim()
  if (!url) return null
  try {
    let targetUrl = url
    // If relative URL, resolve against this server
    if (url.startsWith('/')) {
      const protocol = req && req.get ? (req.get('x-forwarded-proto') || req.protocol || 'http') : 'http'
      const host = req && req.get ? req.get('host') : `localhost:${process.env.PORT || 5000}`
      targetUrl = `${protocol}://${host}${url}`
    }
    const response = await axios.get(targetUrl, {
      timeout: 15000,
      responseType: 'json',
      headers: {
        'Accept': 'application/json',
        ...(req && req.headers && req.headers.authorization ? { Authorization: req.headers.authorization } : {})
      }
    })
    const body = response.data
    if (Array.isArray(body)) return body
    if (body && Array.isArray(body.data)) return body.data
    if (body && body.rows && Array.isArray(body.rows)) return body.rows
    return null
  } catch (error) {
    if (error.response) {
      console.error(`Custom API error ${error.response.status} for ${url}:`, error.message)
    } else {
      console.error(`Error fetching custom API ${url}:`, error.message)
    }
    return null
  }
}

// Helper to get distinct values from a dataset field
function getDistinctValues(data, fieldName, limit = 500) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return []
  }

  // Find the actual column name (case-insensitive)
  const columns = Object.keys(data[0] || {})
  const actualField = columns.find(col => col.toLowerCase() === fieldName.toLowerCase()) || fieldName

  if (!actualField || !columns.includes(actualField)) {
    return []
  }

  // Extract distinct values
  const values = new Set()
  for (const row of data) {
    const value = row[actualField]
    if (value !== null && value !== undefined && value !== '') {
      // Convert to string and trim
      const stringValue = String(value).trim()
      if (stringValue) {
        values.add(stringValue)
      }
    }
  }

  // Convert to array, sort, and limit
  const distinctValues = Array.from(values).sort()
  return distinctValues.slice(0, limit)
}

// GET /api/studio/options?datasetId=<id>&field=<field> or customEndpoint=<url>&field=<field>
router.get('/options', async (req, res) => {
  try {
    const { datasetId, customEndpoint, field } = req.query

    if (!field) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'field is required'
      })
    }

    const useCustomApi = customEndpoint && typeof customEndpoint === 'string' && customEndpoint.trim().length > 0
    if (!useCustomApi && !datasetId) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'Either datasetId or customEndpoint is required'
      })
    }

    // Check PII blocklist
    if (isPIIField(field)) {
      return res.status(403).json({
        error: 'Field blocked',
        message: 'This field contains potentially sensitive information and cannot be used in dropdowns',
        field: field
      })
    }

    // If customEndpoint is our own /api/example/xxx (or full URL to it), use built-in dataset path so options always work
    let resolvedDatasetId = datasetId
    let resolvedUseCustom = useCustomApi
    if (useCustomApi && customEndpoint) {
      const url = customEndpoint.trim()
      const pathMatch = url.match(/\/api\/example\/(.+)$/)
      if (pathMatch) {
        resolvedDatasetId = pathMatch[1].replace(/%2F/g, '/')
        resolvedUseCustom = false
      }
    }

    const cacheKey = resolvedUseCustom ? `custom:${customEndpoint}:${field}` : `${resolvedDatasetId}:${field}`
    const cached = optionsCache.get(cacheKey)
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return res.json({
        datasetId: resolvedDatasetId || null,
        customEndpoint: resolvedUseCustom ? customEndpoint : null,
        field,
        values: cached.values,
        count: cached.values.length,
        cached: true
      })
    }

    let data
    if (resolvedUseCustom) {
      data = await getCustomApiData(customEndpoint.trim(), req)
    } else {
      data = await getDatasetData(resolvedDatasetId)
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        error: 'Dataset not found',
        message: resolvedUseCustom ? `Could not load data from custom API` : `Could not find dataset with id: ${resolvedDatasetId}`,
        hint: resolvedUseCustom ? 'Check that the URL returns JSON (array or { data: [] })' : 'Available example datasets: sales, attendance, donations, medical, banking, yearly-income, unemployment, cdc-health, government-budget, usaspending/live'
      })
    }

    if (!Array.isArray(data)) {
      data = (data && data.data && Array.isArray(data.data)) ? data.data : []
      if (data.length === 0) {
        return res.json({ datasetId: resolvedDatasetId || null, customEndpoint: resolvedUseCustom ? customEndpoint : null, field, values: [], count: 0 })
      }
    }

    const values = getDistinctValues(data, field, 500)
    optionsCache.set(cacheKey, { values, timestamp: Date.now() })

    res.json({
      datasetId: resolvedDatasetId || null,
      customEndpoint: resolvedUseCustom ? customEndpoint : null,
      field,
      values,
      count: values.length,
      cached: false
    })
  } catch (error) {
    console.error('Error in /api/studio/options:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'Failed to fetch dropdown options'
    })
  }
})

// Clear cache endpoint (useful for testing)
router.delete('/cache', (req, res) => {
  optionsCache.clear()
  res.json({
    message: 'Cache cleared',
    clearedAt: new Date().toISOString()
  })
})

// Get cache stats (useful for debugging)
router.get('/cache/stats', (req, res) => {
  const stats = {
    size: optionsCache.size,
    entries: Array.from(optionsCache.keys()),
    ttl: CACHE_TTL / 1000 // in seconds
  }
  res.json(stats)
})

// Dataset Registry - maps dataset IDs to their data sources
const datasetRegistry = {
  // Example datasets
  'sales': { type: 'api', endpoint: '/api/example/sales' },
  'attendance': { type: 'api', endpoint: '/api/example/attendance' },
  'donations': { type: 'api', endpoint: '/api/example/donations' },
  'medical': { type: 'api', endpoint: '/api/example/medical' },
  'banking': { type: 'api', endpoint: '/api/example/banking' },
  'yearly-income': { type: 'api', endpoint: '/api/example/yearly-income' },
  'unemployment': { type: 'api', endpoint: '/api/example/unemployment' },
  'cdc-health': { type: 'api', endpoint: '/api/example/cdc-health' },
  'government-budget': { type: 'api', endpoint: '/api/example/government-budget' },
  'usaspending/live': { type: 'api', endpoint: '/api/example/usaspending/live' },
  'treasury': { type: 'api', endpoint: '/api/example/treasury' },
  'today-snapshot': { type: 'api', endpoint: '/api/example/today-snapshot' },
  'revenue-trends': { type: 'api', endpoint: '/api/example/revenue-trends' },
  'alters-insights': { type: 'api', endpoint: '/api/example/alters-insights' },
  'samgov/live': { type: 'api', endpoint: '/api/example/samgov/live' }
}

// Helper to parse numeric values
function parseNumericValue(value) {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    // Remove currency symbols, commas, and whitespace
    const cleaned = value.replace(/[$,\s]/g, '')
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? 0 : parsed
  }
  return 0
}

// Helper to find column name (case-insensitive)
function findColumn(columns, name) {
  return columns.find(col => col.toLowerCase() === name.toLowerCase()) || name
}

// Detect a date column from the first row (for time filter)
function detectDateColumn(row) {
  if (!row || typeof row !== 'object') return null
  const known = ['Date', 'date', 'Award Date', 'award_date', 'Record Date', 'record_date']
  for (const col of known) {
    if (row[col] != null) return col
  }
  for (const [key, val] of Object.entries(row)) {
    if (val == null) continue
    const d = new Date(val)
    if (!isNaN(d.getTime())) return key
  }
  return null
}

// POST /api/studio/query - Execute a query against a dataset or custom API
router.post('/query', async (req, res) => {
  try {
    const { datasetId, customEndpoint, query, filterValues } = req.body

    if (!query || typeof query !== 'object') {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'query is required'
      })
    }
    const allowedQueryTypes = ['aggregation', 'time_series', 'breakdown', 'table']
    const queryType = query.type
    if (!queryType || !allowedQueryTypes.includes(queryType)) {
      return res.status(400).json({
        error: 'Invalid query',
        message: `query.type must be one of: ${allowedQueryTypes.join(', ')}. Got: ${queryType}`
      })
    }

    let useCustomApi = customEndpoint && typeof customEndpoint === 'string' && customEndpoint.trim().length > 0
    let resolvedDatasetId = datasetId
    // If customEndpoint is our own /api/example/xxx, use built-in dataset path (same as options)
    if (useCustomApi && customEndpoint) {
      const pathMatch = customEndpoint.trim().match(/\/api\/example\/(.+)$/)
      if (pathMatch) {
        resolvedDatasetId = pathMatch[1].replace(/%2F/g, '/')
        useCustomApi = false
      }
    }
    if (!useCustomApi && !resolvedDatasetId) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'Either datasetId or customEndpoint is required'
      })
    }

    let data
    try {
      if (useCustomApi) {
        data = await getCustomApiData(customEndpoint.trim(), req)
        if (!data || data.length === 0) {
          return res.status(404).json({
            error: 'Custom API data not found',
            message: 'Could not load data from the configured API. Ensure the URL returns JSON (array or { data: [] }).'
          })
        }
      } else {
        const datasetInfo = datasetRegistry[resolvedDatasetId]
        if (!datasetInfo) {
          return res.status(404).json({
            error: 'Dataset not found',
            message: `Dataset '${resolvedDatasetId}' is not registered`,
            hint: 'Available datasets: ' + Object.keys(datasetRegistry).join(', ')
          })
        }
        data = await getDatasetData(resolvedDatasetId)
        if (!data || data.length === 0) {
          return res.status(404).json({
            error: 'Dataset data not found',
            message: `Could not load data for dataset '${resolvedDatasetId}'`
          })
        }
      }
    } catch (fetchErr) {
      console.error('Studio query: failed to load data:', fetchErr)
      return res.status(503).json({
        error: 'Data load failed',
        message: fetchErr.message || 'Could not load dataset. Try again.'
      })
    }

    if (!Array.isArray(data)) {
      data = (data && data.data && Array.isArray(data.data)) ? data.data : []
      if (data.length === 0) {
        return res.status(404).json({ error: 'No data', message: 'Dataset did not return an array of rows.' })
      }
    }

    // Resolve filter values from query filters
    const resolvedFilters = {}
    if (query.filters) {
      Object.keys(query.filters).forEach(key => {
        const filterValue = query.filters[key]
        if (typeof filterValue === 'string' && filterValue.startsWith('{{filters.')) {
          const filterId = filterValue.replace('{{filters.', '').replace('}}', '')
          resolvedFilters[key] = filterValues?.[filterId]
        } else {
          resolvedFilters[key] = filterValue
        }
      })
    }

    // Apply filters to data
    let filteredData = Array.isArray(data) ? [...data] : []

    // Time range filter (if selection yields no rows, keep full data so dashboard always shows something)
    if (resolvedFilters.time_range?.start && resolvedFilters.time_range?.end) {
      const dateCol = filteredData.length > 0 ? detectDateColumn(filteredData[0]) : null
      if (dateCol) {
        const withTimeFilter = filteredData.filter(row => {
          const rowDate = row[dateCol]
          if (rowDate == null) return false
          try {
            const date = new Date(rowDate)
            const start = new Date(resolvedFilters.time_range.start)
            const end = new Date(resolvedFilters.time_range.end)
            return !isNaN(date.getTime()) && date >= start && date <= end
          } catch {
            return false
          }
        })
        if (withTimeFilter.length > 0) {
          filteredData = withTimeFilter
        }
      }
      // else: no date column or range has no data — keep full data
    }

    // Region/categorical filter
    if (resolvedFilters.region && resolvedFilters.region !== 'All') {
      filteredData = filteredData.filter(row => {
        const region = row['Region'] || row['region'] || row['State'] || row['state']
        return region === resolvedFilters.region
      })
    }

    // Generic dimension filter (for any dimension)
    Object.keys(resolvedFilters).forEach(key => {
      if (key !== 'time_range' && key !== 'region' && resolvedFilters[key] && resolvedFilters[key] !== 'All') {
        const columns = Object.keys(filteredData[0] || {})
        const dimensionCol = findColumn(columns, key)
        filteredData = filteredData.filter(row => {
          const value = row[dimensionCol] || row[dimensionCol.toLowerCase()] || row[dimensionCol.toUpperCase()]
          return String(value) === String(resolvedFilters[key])
        })
      }
    })

    // If filters removed all rows, use full data so the graph still shows something
    if (filteredData.length === 0 && data.length > 0) {
      filteredData = Array.isArray(data) ? [...data] : []
    }

    const columns = filteredData.length > 0 ? Object.keys(filteredData[0] || {}) : []
    let result = null

    if (filteredData.length === 0) {
      if (query.type === 'aggregation') result = { value: 0 }
      else result = { data: [] }
      return res.json({ queryId: query.id, result, rowCount: 0 })
    }

    // Execute query based on type
    if (query.type === 'aggregation') {
      const metric = findColumn(columns, query.metric || '')
      const values = filteredData
        .map(row => parseNumericValue(row[metric]))
        .filter(val => !isNaN(val) && isFinite(val))

      // When metric column is categorical (e.g. "Product"), parsed values are all 0 → sum/avg show 0.
      // Use row count so "Total Product" or "Count" shows number of records.
      const allZeros = values.length > 0 && values.every(v => v === 0)

      let value = 0
      if (query.aggregation === 'sum') {
        value = values.reduce((a, b) => a + b, 0)
        if (value === 0 && allZeros && filteredData.length > 0) value = filteredData.length
      } else if (query.aggregation === 'avg') {
        value = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
        if (value === 0 && allZeros && filteredData.length > 0) value = 1
      } else if (query.aggregation === 'count') {
        value = values.length > 0 ? values.length : filteredData.length
      } else if (query.aggregation === 'min') {
        value = values.length > 0 ? Math.min(...values) : 0
      } else if (query.aggregation === 'max') {
        value = values.length > 0 ? Math.max(...values) : 0
      }

      result = { value }
    } else if (query.type === 'time_series') {
      const metric = findColumn(columns, query.metric)
      const dimension = findColumn(columns, query.dimension)
      const grouped = {}

      filteredData.forEach(row => {
        const key = row[dimension]
        const value = parseNumericValue(row[metric])
        if (key && !isNaN(value) && isFinite(value)) {
          grouped[key] = (grouped[key] || 0) + value
        }
      })

      const data = Object.entries(grouped)
        .map(([key, value]) => ({ [dimension]: key, [metric]: value }))
        .sort((a, b) => {
          try {
            return new Date(a[dimension]) - new Date(b[dimension])
          } catch {
            return a[dimension].localeCompare(b[dimension])
          }
        })

      result = { data }
    } else if (query.type === 'breakdown') {
      const metric = findColumn(columns, query.metric)
      const dimension = findColumn(columns, query.dimension)
      const grouped = {}

      filteredData.forEach(row => {
        const key = row[dimension]
        const value = parseNumericValue(row[metric])
        if (key && !isNaN(value) && isFinite(value)) {
          grouped[key] = (grouped[key] || 0) + value
        }
      })

      let data = Object.entries(grouped)
        .map(([key, value]) => ({ [dimension]: key, [metric]: value }))

      if (query.order_by) {
        const orderByCol = findColumn(columns, query.order_by)
        data.sort((a, b) => {
          const aVal = a[orderByCol] || a[metric]
          const bVal = b[orderByCol] || b[metric]
          if (query.order_direction === 'desc') {
            return bVal - aVal
          }
          return aVal - bVal
        })
      }

      if (query.limit) {
        data = data.slice(0, query.limit)
      }

      result = { data }
    } else if (query.type === 'table') {
      const limit = Math.min(Math.max(0, parseInt(query.limit, 10) || 500), 2000)
      result = { data: filteredData.slice(0, limit) }
    } else {
      return res.status(400).json({
        error: 'Unsupported query type',
        message: `Query type '${query.type}' is not supported`,
        supportedTypes: ['aggregation', 'time_series', 'breakdown', 'table']
      })
    }

    res.json({
      queryId: query.id,
      result,
      rowCount: filteredData.length
    })
  } catch (error) {
    console.error('Error in /api/studio/query:', error)
    if (res.headersSent) return
    const msg = error && (error.message || error.toString())
    res.status(500).json({
      error: 'Query failed',
      message: msg || 'Failed to execute query'
    })
  }
})

// GET /api/studio/datasets - List all registered datasets
router.get('/datasets', (req, res) => {
  res.json({
    datasets: Object.keys(datasetRegistry).map(id => ({
      id,
      type: datasetRegistry[id].type,
      endpoint: datasetRegistry[id].endpoint
    }))
  })
})

// GET /api/studio/fetch?url=<customEndpoint> - Proxy fetch for custom API (for report/dashboard views that need full dataset)
router.get('/fetch', async (req, res) => {
  try {
    const { url: customEndpoint } = req.query
    if (!customEndpoint || typeof customEndpoint !== 'string') {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'url is required'
      })
    }
    const data = await getCustomApiData(customEndpoint.trim(), req)
    if (!data) {
      return res.status(404).json({
        error: 'Could not load data',
        message: 'The API did not return a valid JSON array or { data: [] }'
      })
    }
    res.json({ data })
  } catch (error) {
    console.error('Error in /api/studio/fetch:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'Failed to fetch from custom API'
    })
  }
})

// GET /api/studio/ai-schema - Debug: confirm route is registered (use POST for real)
router.get('/ai-schema', (req, res) => {
  res.json({ ok: true, message: 'Use POST with body: { prompt, schema?, columns }' })
})

// POST /api/studio/ai-schema - Generate filters and widgets from natural language prompt
const AI_SCHEMA_SYSTEM = `You are a dashboard schema assistant. Given a user prompt and a list of data columns (with types: numeric, categorical, date), output ONLY valid JSON (no markdown, no explanation) with this exact structure:

{
  "filters": [
    { "id": "snake_case_id", "type": "time_range|dropdown|text", "label": "Label", "dimension": "ColumnName" (for dropdown), "default": "All" or { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" } }
  ],
  "queries": [
    { "id": "unique_id", "type": "aggregation|time_series|breakdown", "metric": "NumericColumn", "dimension": "ColumnName" (for time_series/breakdown), "aggregation": "sum|avg|count", "group_by": ["Col"], "order_by": "Col", "order_direction": "desc", "limit": 10, "filters": { "filter_id": "{{filters.filter_id}}" } }
  ],
  "widgets": [
    { "id": "widget_unique_id", "type": "kpi|line_chart|bar_chart", "title": "Title", "query_ref": "query_id_from_above", "format": { "type": "number", "decimals": 0 }, "config": { "x_axis": "Col", "y_axis": "Col" } (for charts) }
  ]
}

Rules:
- Use ONLY column names from the provided columns. For dropdown/checkbox filters use categorical or date columns. For time_range use a date column. For KPI/charts use numeric columns as metric.
- Filter id must be lowercase with underscores. Query id and widget id must be unique. Widget query_ref must match a query id.
- Every query must include filters object with refs for each filter you add (e.g. "time_range": "{{filters.time_range}}", "region": "{{filters.region}}").
- For time_range filter use type "time_range" and default { "start": "2024-01-01", "end": "2024-12-31" }.
- For dropdown use type "dropdown", "source": "dimension", "dimension": "ColumnName", "default": "All".
- Output only the JSON object, no other text.`

const aiSchemaHandler = async (req, res) => {
  try {
    if (!openai) {
      return res.status(503).json({
        error: 'AI not configured',
        message: 'OPENAI_API_KEY is required for AI schema. Set it in your environment.'
      })
    }
    const { prompt, schema, columns } = req.body
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'prompt is required' })
    }
    if (!columns || !Array.isArray(columns)) {
      return res.status(400).json({ error: 'columns array is required (e.g. [{ name, type }])' })
    }

    const columnsDesc = columns.map(c => `${c.name} (${c.type || 'unknown'})`).join(', ')
    const existingFilters = (schema && schema.global_filters) ? schema.global_filters.map(f => f.id) : []
    const existingQueryIds = (schema && schema.queries) ? schema.queries.map(q => q.id) : []

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

    let text = completion.choices[0].message.content.trim()
    const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlock) text = codeBlock[1].trim()
    const jsonMatch = text.replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/, '$1')
    const parsed = JSON.parse(jsonMatch)

    const filters = Array.isArray(parsed.filters) ? parsed.filters : []
    const queries = Array.isArray(parsed.queries) ? parsed.queries : []
    const widgets = Array.isArray(parsed.widgets) ? parsed.widgets : []

    res.json({ filters, queries, widgets })
  } catch (error) {
    console.error('Error in /api/studio/ai-schema:', error)
    if (error.response?.status === 401) {
      return res.status(503).json({ error: 'Invalid OpenAI API key' })
    }
    res.status(500).json({
      error: 'AI schema failed',
      message: error.message || 'Failed to generate schema from prompt'
    })
  }
}
router.post(['/ai-schema', '/ai-schema/'], aiSchemaHandler)

module.exports = router
module.exports.aiSchemaHandler = aiSchemaHandler