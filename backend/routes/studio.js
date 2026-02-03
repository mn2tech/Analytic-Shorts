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

module.exports = router
