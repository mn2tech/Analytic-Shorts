/**
 * Misc example routes: network CSV, sas7bdat sample.
 */
const express = require('express')
const fs = require('fs')
const path = require('path')
const Papa = require('papaparse')
const { detectColumnTypes, processDataPreservingNumbers } = require('../../controllers/dataProcessor')
const { exampleDatasets } = require('../../data/exampleDatasets')

const router = express.Router()

let SAS7BDAT
try {
  SAS7BDAT = require('sas7bdat')
} catch {
  SAS7BDAT = null
}

// GET /network
router.get('/network', (req, res) => {
  try {
    const possiblePaths = [
      path.join(__dirname, '../../../sample-network-data.csv'),
      path.join(__dirname, '../../../../sample-network-data.csv'),
      path.join(process.cwd(), 'sample-network-data.csv'),
    ]
    const csvPath = possiblePaths.find((p) => fs.existsSync(p))
    if (!csvPath) {
      return res.status(404).json({
        error: 'Network example data file not found',
        message: `File not found. Tried: ${possiblePaths.join(', ')}`,
      })
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      transform: (v) => v.trim(),
    })

    const data = (parseResult.data || []).filter((row) =>
      Object.values(row).some((val) => val && val.toString().trim() !== '')
    )
    if (data.length === 0) return res.status(400).json({ error: 'No data found', message: 'CSV file contains no valid data rows' })

    const processedData = data.map((row) => {
      const processed = { ...row }
      if (processed.Amount && !isNaN(parseFloat(processed.Amount))) processed.Amount = parseFloat(processed.Amount)
      return processed
    })

    const columns = Object.keys(processedData[0] || {})
    const columnTypes = detectColumnTypes(processedData, columns)
    const finalData = processDataPreservingNumbers(processedData, columnTypes.numericColumns)

    res.json({
      data: finalData,
      columns,
      numericColumns: columnTypes.numericColumns,
      categoricalColumns: columnTypes.categoricalColumns,
      dateColumns: columnTypes.dateColumns,
      rowCount: finalData.length,
    })
  } catch (error) {
    console.error('Error loading network example:', error?.message || error)
    res.status(500).json({ error: 'Failed to load network example data', message: error?.message || 'Internal error' })
  }
})

// GET /sas7bdat-sample
router.get('/sas7bdat-sample', async (req, res) => {
  const fallback = () => {
    const dataset = exampleDatasets.sales
    const columns = Object.keys(dataset.data[0] || {})
    const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(dataset.data, columns)
    const processedData = processDataPreservingNumbers(dataset.data, numericColumns)
    return res.json({ data: processedData, columns, numericColumns, categoricalColumns, dateColumns, rowCount: processedData.length })
  }

  if (!SAS7BDAT) return fallback()

  const candidates = [
    path.join(__dirname, '../../sample-data/sample.sas7bdat'),
    path.join(__dirname, '../../../sample-data/sample.sas7bdat'),
    path.join(process.cwd(), 'backend/sample-data/sample.sas7bdat'),
    path.join(process.cwd(), 'sample-data/sample.sas7bdat'),
  ]
  const filePath = candidates.find((p) => fs.existsSync(p))
  if (!filePath) return fallback()

  try {
    const rows = await SAS7BDAT.parse(filePath, { rowFormat: 'object' })
    const data = Array.isArray(rows) ? rows : []
    if (data.length === 0) return fallback()
    const columns = Object.keys(data[0] || {})
    const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(data, columns)
    const processedData = processDataPreservingNumbers(data, numericColumns)
    return res.json({ data: processedData, columns, numericColumns, categoricalColumns, dateColumns, rowCount: processedData.length })
  } catch (err) {
    console.warn('sas7bdat-sample: parse failed, using sales fallback:', err?.message || err)
    return fallback()
  }
})

module.exports = router
