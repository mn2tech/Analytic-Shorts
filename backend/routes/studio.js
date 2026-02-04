const express = require('express')
const axios = require('axios')
const { getExampleDatasetData } = require('./examples')
const router = express.Router()

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

// GET /api/studio/options?datasetId=<id>&field=<field>
router.get('/options', async (req, res) => {
  try {
    const { datasetId, field } = req.query

    // Validate required parameters
    if (!datasetId) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'datasetId is required'
      })
    }

    if (!field) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'field is required'
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

    // Check cache
    const cacheKey = `${datasetId}:${field}`
    const cached = optionsCache.get(cacheKey)
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return res.json({
        datasetId,
        field,
        values: cached.values,
        count: cached.values.length,
        cached: true
      })
    }

    // Fetch dataset data
    const data = await getDatasetData(datasetId)
    
    if (!data) {
      return res.status(404).json({
        error: 'Dataset not found',
        message: `Could not find dataset with id: ${datasetId}`,
        hint: 'Available example datasets: sales, attendance, donations, medical, banking, yearly-income, unemployment, cdc-health, government-budget, usaspending/live'
      })
    }

    // Get distinct values
    const values = getDistinctValues(data, field, 500)

    // Cache the results
    optionsCache.set(cacheKey, {
      values,
      timestamp: Date.now()
    })

    res.json({
      datasetId,
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
  'treasury': { type: 'api', endpoint: '/api/example/treasury' }
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

// POST /api/studio/query - Execute a query against a dataset
router.post('/query', async (req, res) => {
  try {
    const { datasetId, query, filterValues } = req.body

    // Validate required parameters
    if (!datasetId) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'datasetId is required'
      })
    }

    if (!query) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'query is required'
      })
    }

    // Get dataset info from registry
    const datasetInfo = datasetRegistry[datasetId]
    if (!datasetInfo) {
      return res.status(404).json({
        error: 'Dataset not found',
        message: `Dataset '${datasetId}' is not registered`,
        hint: 'Available datasets: ' + Object.keys(datasetRegistry).join(', ')
      })
    }

    // Fetch dataset data
    const data = await getDatasetData(datasetId)
    if (!data || data.length === 0) {
      return res.status(404).json({
        error: 'Dataset data not found',
        message: `Could not load data for dataset '${datasetId}'`
      })
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
    let filteredData = [...data]

    // Time range filter
    if (resolvedFilters.time_range?.start && resolvedFilters.time_range?.end) {
      filteredData = filteredData.filter(row => {
        const rowDate = row['Date'] || row['date'] || row['Award Date'] || row['award_date'] || row['Record Date'] || row['record_date']
        if (!rowDate) return false
        try {
          const date = new Date(rowDate)
          const start = new Date(resolvedFilters.time_range.start)
          const end = new Date(resolvedFilters.time_range.end)
          return date >= start && date <= end
        } catch {
          return false
        }
      })
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

    const columns = Object.keys(filteredData[0] || {})
    let result = null

    // Execute query based on type
    if (query.type === 'aggregation') {
      const metric = findColumn(columns, query.metric)
      const values = filteredData
        .map(row => parseNumericValue(row[metric]))
        .filter(val => !isNaN(val) && isFinite(val))

      let value = 0
      if (query.aggregation === 'sum') {
        value = values.reduce((a, b) => a + b, 0)
      } else if (query.aggregation === 'avg') {
        value = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
      } else if (query.aggregation === 'count') {
        value = values.length
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
    } else {
      return res.status(400).json({
        error: 'Unsupported query type',
        message: `Query type '${query.type}' is not supported`,
        supportedTypes: ['aggregation', 'time_series', 'breakdown']
      })
    }

    res.json({
      queryId: query.id,
      result,
      rowCount: filteredData.length
    })
  } catch (error) {
    console.error('Error in /api/studio/query:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'Failed to execute query'
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

module.exports = router
