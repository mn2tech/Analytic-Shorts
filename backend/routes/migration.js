const express = require('express')
const { parseSasCode } = require('../services/sasParser')
const { convertSasBlocks } = require('../services/sasToPysparkConverter')
const { buildTransformationMap } = require('../services/transformationMapper')
const { buildMigrationExplanation } = require('../services/explanationEngine')

const router = express.Router()

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
    const converted = convertSasBlocks(parsed.blocks, mode)
    const mapping = buildTransformationMap(converted.blocks)
    return res.json({
      blocks: converted.blocks.map((b) => ({
        type: b.type,
        input: b.input,
        output: b.output,
        converted_code: b.converted_code,
      })),
      pyspark_code: converted.pyspark_code,
      warnings: [...new Set([...(parsed.warnings || []), ...(converted.warnings || [])])],
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
    const converted = convertSasBlocks(parsed.blocks, mode)
    const explanation = buildMigrationExplanation({
      blocks: converted.blocks,
      warnings: [...(parsed.warnings || []), ...(converted.warnings || [])],
    })
    return res.json(explanation)
  } catch (error) {
    return res.status(500).json({ error: 'Failed to explain migration', message: error.message })
  }
})

module.exports = router
