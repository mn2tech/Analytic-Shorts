const express = require('express')
const { compareSchemas, profileDataset } = require('../services/validationSchemaProfiler')
const { compareDatasets } = require('../services/validationComparator')
const {
  buildSummary,
  buildAuditOutput,
  buildCsvReport,
  buildPipelineSummary,
} = require('../services/validationReportBuilder')

const router = express.Router()

function normalizeOptions(raw = {}) {
  return {
    numericTolerance: Number.isFinite(Number(raw.numericTolerance)) ? Number(raw.numericTolerance) : 0.01,
    ignoreCase: !!raw.ignoreCase,
    trimWhitespace: !!raw.trimWhitespace,
    treatNullAsEmpty: !!raw.treatNullAsEmpty,
    enableToleranceComparison: raw.enableToleranceComparison !== false,
  }
}

router.post('/profile', (req, res) => {
  try {
    const sourceData = Array.isArray(req.body?.sourceData) ? req.body.sourceData : []
    const targetData = Array.isArray(req.body?.targetData) ? req.body.targetData : []
    const sourceProfile = profileDataset(sourceData)
    const targetProfile = profileDataset(targetData)
    const schemaDiff = compareSchemas(sourceData, targetData)
    res.json({ sourceProfile, targetProfile, schemaDiff })
  } catch (error) {
    res.status(400).json({ error: 'Failed to profile datasets', message: error.message })
  }
})

router.post('/compare', (req, res) => {
  try {
    const options = normalizeOptions(req.body?.options || {})
    const keyColumns = Array.isArray(req.body?.keyColumns) ? req.body.keyColumns : []
    const datasetPairs = Array.isArray(req.body?.datasetPairs) ? req.body.datasetPairs : null

    if (datasetPairs && datasetPairs.length > 0) {
      const pairResults = datasetPairs.map((pair, index) => {
        const sourceData = Array.isArray(pair?.sourceData) ? pair.sourceData : []
        const targetData = Array.isArray(pair?.targetData) ? pair.targetData : []
        const pairKeys = Array.isArray(pair?.keyColumns) && pair.keyColumns.length > 0 ? pair.keyColumns : keyColumns
        const comparison = compareDatasets(sourceData, targetData, pairKeys, options)
        const summary = buildSummary(comparison)
        return {
          pair_index: index,
          pair_name: pair?.name || `Dataset Pair ${index + 1}`,
          key_columns: pairKeys,
          ...summary,
          sample_mismatched_rows: comparison.sampleMismatchedRows,
        }
      })

      return res.json({
        pipeline_mode: true,
        aggregate: buildPipelineSummary(pairResults),
        results: pairResults,
      })
    }

    const sourceData = Array.isArray(req.body?.sourceData) ? req.body.sourceData : []
    const targetData = Array.isArray(req.body?.targetData) ? req.body.targetData : []
    const comparison = compareDatasets(sourceData, targetData, keyColumns, options)
    const summary = buildSummary(comparison)
    return res.json({
      ...summary,
      sample_mismatched_rows: comparison.sampleMismatchedRows,
    })
  } catch (error) {
    res.status(400).json({ error: 'Validation comparison failed', message: error.message })
  }
})

router.post('/report', (req, res) => {
  try {
    const validationResult = req.body?.validationResult
    if (!validationResult || typeof validationResult !== 'object') {
      return res.status(400).json({ error: 'validationResult is required.' })
    }
    const format = (req.body?.format || 'json').toLowerCase()
    const metadata = req.body?.metadata || {}

    if (format === 'csv') {
      const csv = buildCsvReport(validationResult)
      return res.json({ format: 'csv', content: csv })
    }

    return res.json({
      format: 'json',
      content: buildAuditOutput(validationResult, metadata),
    })
  } catch (error) {
    res.status(400).json({ error: 'Failed to build report', message: error.message })
  }
})

module.exports = router
