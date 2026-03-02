/**
 * Static example dataset routes (sales, attendance, donations, etc.)
 */
const express = require('express')
const { detectColumnTypes, processDataPreservingNumbers } = require('../../controllers/dataProcessor')
const { exampleDatasets, loadNflSchedule } = require('../../data/exampleDatasets')

const router = express.Router()

function sendDatasetResponse(res, dataset, columns) {
  const cols = columns || Object.keys(dataset.data[0] || {})
  const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(dataset.data, cols)
  const processedData = processDataPreservingNumbers(dataset.data, numericColumns)
  res.json({
    data: processedData,
    columns: cols,
    numericColumns,
    categoricalColumns,
    dateColumns,
    rowCount: processedData.length,
  })
}

const ROUTE_TO_KEY = {
  'sales': 'sales', 'attendance': 'attendance', 'donations': 'donations', 'medical': 'medical',
  'banking': 'banking', 'yearly-income': 'yearlyIncome', 'pharmacy': 'pharmacy',
  'superbowl-winners': 'superbowl-winners', 'today-snapshot': 'today-snapshot',
  'revenue-trends': 'revenue-trends', 'alters-insights': 'alters-insights', 'usaspending': 'usaspending',
}

Object.entries(ROUTE_TO_KEY).forEach(([routePath, key]) => {
  router.get(`/${routePath}`, (req, res) => {
    const dataset = exampleDatasets[key]
    if (!dataset?.data?.length) return res.status(503).json({ error: 'Dataset not available' })
    sendDatasetResponse(res, dataset)
  })
})

router.get('/nfl-schedule', (req, res) => {
  const data = loadNflSchedule()
  if (!data || data.length === 0) return res.status(503).json({ error: 'NFL schedule data not available' })
  const dataset = { data }
  sendDatasetResponse(res, dataset)
})

module.exports = router
