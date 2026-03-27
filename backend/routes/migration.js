const express = require('express')
const { parseSasCode } = require('../services/sasParser')
const { convertSasBlocks } = require('../services/sasToPysparkConverter')
const { buildTransformationMap } = require('../services/transformationMapper')
const { buildMigrationExplanation } = require('../services/explanationEngine')

const router = express.Router()

/** Mirrors client/server converter weighting when top-level overall is missing (older builds). */
function computeOverallConfidenceFromBlocks(blocks = []) {
  if (!Array.isArray(blocks) || blocks.length === 0) return null
  const vals = blocks
    .map((b) => {
      const v = b?.conversion_confidence
      if (v === null || v === undefined || v === '') return null
      const n = Number(v)
      return Number.isFinite(n) ? Math.round(n) : null
    })
    .filter((x) => x != null)
  if (vals.length === 0) return null
  const min = Math.min(...vals)
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  return Math.round(min * 0.45 + avg * 0.55)
}

function normalizeOverallConfidence(raw, blocks) {
  if (raw !== null && raw !== undefined && raw !== '') {
    const n = Number(raw)
    if (Number.isFinite(n)) return Math.round(n)
  }
  const derived = computeOverallConfidenceFromBlocks(blocks)
  return derived != null ? derived : null
}

router.post('/parse', (req, res) => {
  try {
    const sasCode = String(req.body?.sas_code || '')
    if (!sasCode.trim()) {
      return res.status(400).json({ error: 'sas_code is required' })
    }
    const parsed = parseSasCode(sasCode)
    return res.json(parsed)
  } catch (error) {
    return res.status(500).json({ error: 'Failed to parse SAS code', message: error.message })
  }
})

router.post('/convert', (req, res) => {
  try {
    const sasCode = String(req.body?.sas_code || '')
    const mode = String(req.body?.mode || 'basic').toLowerCase()
    if (!sasCode.trim()) {
      return res.status(400).json({ error: 'sas_code is required' })
    }
    const parsed = parseSasCode(sasCode)
    const converted = convertSasBlocks(parsed.blocks, mode, parsed.warnings || [])
    const mapping = buildTransformationMap(converted.blocks)
    const blocksOut = converted.blocks.map((b) => ({
      id: b.id,
      type: b.type,
      line_start: b.line_start,
      line_end: b.line_end,
      input: b.input,
      output: b.output,
      converted_code: b.converted_code,
      warnings: b.warnings || [],
      conversion_confidence: b.conversion_confidence,
      business_impact: b.business_impact,
      next_steps: b.next_steps || [],
      constructs: b.constructs,
      input_datasets: b.input_datasets,
      output_datasets: b.output_datasets,
    }))
    const overall = normalizeOverallConfidence(converted.overall_conversion_confidence, converted.blocks)
    return res.json({
      blocks: blocksOut,
      pyspark_code: converted.pyspark_code,
      warnings: converted.warnings || [],
      overall_conversion_confidence: overall,
      business_impact_summary: converted.business_impact_summary || '',
      next_steps_recommendations: converted.next_steps_recommendations || [],
      transformation_map: mapping,
    })
  } catch (error) {
    return res.status(500).json({ error: 'Failed to convert SAS code', message: error.message })
  }
})

router.post('/explain', (req, res) => {
  try {
    const sasCode = String(req.body?.sas_code || '')
    const mode = String(req.body?.mode || 'basic').toLowerCase()
    if (!sasCode.trim()) {
      return res.status(400).json({ error: 'sas_code is required' })
    }
    const parsed = parseSasCode(sasCode)
    const converted = convertSasBlocks(parsed.blocks, mode, parsed.warnings || [])
    const explanation = buildMigrationExplanation({
      blocks: converted.blocks,
      warnings: converted.warnings || [],
      overall_conversion_confidence: converted.overall_conversion_confidence,
      business_impact_summary: converted.business_impact_summary,
      next_steps_recommendations: converted.next_steps_recommendations,
    })
    return res.json(explanation)
  } catch (error) {
    return res.status(500).json({ error: 'Failed to explain migration', message: error.message })
  }
})

module.exports = router
