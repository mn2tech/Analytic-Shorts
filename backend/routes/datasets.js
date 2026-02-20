/**
 * Datasets API - demo and specialty datasets (e.g. Maritime AIS).
 * Mounted at /api/datasets. Does not replace /api/example; add new dataset types here.
 */
const express = require('express')
const { detectColumnTypes } = require('../controllers/dataProcessor')

const router = express.Router()

// Vessel type codes (IMO/SAM common)
const VESSEL_TYPES = [
  'Cargo', 'Tanker', 'Passenger', 'Fishing', 'Pleasure', 'Pilot', 'Tug', 'SAR', 'Law', 'Military'
]

function processDataPreservingNumbers(data, numericColumns) {
  return data.map((row) => {
    const processed = {}
    Object.keys(row).forEach((key) => {
      const value = row[key]
      if (numericColumns.includes(key) && typeof value === 'number') {
        processed[key] = value
      } else if (value === null || value === undefined) {
        processed[key] = ''
      } else {
        processed[key] = typeof value === 'object' ? JSON.stringify(value) : String(value).trim()
      }
    })
    return processed
  })
}

/**
 * Generate realistic mock AIS vessel data.
 * Fields: timestamp, mmsi, lat, lon, sog (speed over ground), cog (course over ground), vessel_type
 */
function generateMaritimeAISData(rowCount = 500) {
  const now = Date.now()
  const oneDayMs = 24 * 60 * 60 * 1000
  const mmsiPool = Array.from({ length: 40 }, (_, i) => String(200000000 + i * 1000))
  const data = []
  for (let i = 0; i < rowCount; i++) {
    const t = new Date(now - Math.random() * 7 * oneDayMs)
    const mmsi = mmsiPool[Math.floor(Math.random() * mmsiPool.length)]
    const lat = 25 + (Math.random() * 20) - 10
    const lon = -90 + (Math.random() * 40) - 20
    const sog = Math.random() < 0.15 ? Math.random() * 1 : 1 + Math.random() * 24
    const cog = Math.floor(Math.random() * 360)
    const vessel_type = VESSEL_TYPES[Math.floor(Math.random() * VESSEL_TYPES.length)]
    data.push({
      timestamp: t.toISOString(),
      mmsi,
      lat: Math.round(lat * 10000) / 10000,
      lon: Math.round(lon * 10000) / 10000,
      sog: Math.round(sog * 10) / 10,
      cog,
      vessel_type
    })
  }
  return data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
}

/**
 * GET /api/datasets/maritime-ais
 * Returns mock AIS vessel data compatible with Metric Engine and /api/insights.
 * Optional query: limit (default 500).
 */
router.get('/maritime-ais', (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 500, 10), 5000)
    const rawData = generateMaritimeAISData(limit)
    const columns = Object.keys(rawData[0] || {})
    const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(rawData, columns)
    const processedData = processDataPreservingNumbers(rawData, numericColumns)

    const suggestedDashboards = [
      { title: 'Traffic volume over time', description: 'AIS message count by hour or day', prompt: 'Show vessel traffic volume over time (count of AIS messages by timestamp or date).' },
      { title: 'Top active vessels (by MMSI)', description: 'Vessels with most AIS messages', prompt: 'Show top active vessels by MMSI (count or number of records per MMSI).' },
      { title: 'Suspicious loitering (sog < 1)', description: 'Vessels with speed over ground below 1 knot', prompt: 'Show vessels with speed over ground (sog) less than 1 knot — loitering or anchored.' }
    ]

    res.json({
      data: processedData,
      columns,
      numericColumns,
      categoricalColumns,
      dateColumns,
      rowCount: processedData.length,
      suggestedDashboards
    })
  } catch (err) {
    console.error('[datasets/maritime-ais]', err?.message || err)
    res.status(500).json({
      error: 'Failed to generate Maritime AIS demo data',
      message: err?.message || 'Internal error'
    })
  }
})

module.exports = router
