/**
 * AI Visual Builder Studio - DashboardSpec generation and dataset schema/data.
 * POST /api/ai/dashboard-spec - Generate or refine a DashboardSpec from natural language.
 * GET /api/ai/dataset-schema - Profile dataset and return schema summary.
 * GET /api/ai/dataset-data - Return raw data for a dataset (for renderer).
 */

const express = require('express')
const OpenAI = require('openai')
const axios = require('axios')
const { getExampleDatasetData } = require('./examples')
const { detectColumnTypes } = require('../controllers/dataProcessor')
const { getSystemPromptSchemaBlock, validate: validateDashboardSpec } = require('../schema/dashboardSpecSchema')

const router = express.Router()
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

// GET /api/ai - verify mount and list routes
router.get('/', (req, res) => {
  res.json({
    ok: true,
    routes: [
      'GET /api/ai/dataset-schema?dataset=<id>',
      'GET /api/ai/dataset-data?dataset=<id>',
      'POST /api/ai/dashboard-spec'
    ]
  })
})

/**
 * Resolve datasetId to raw data array.
 * datasetId: example id (e.g. "sales") or "dashboard:<uuid>" for user dashboard data.
 */
async function getDataForDataset(datasetId, req) {
  if (!datasetId || typeof datasetId !== 'string') return null
  const trimmed = datasetId.trim()

  // User dashboard: fetch from Supabase via dashboards API (we need auth)
  if (trimmed.startsWith('dashboard:')) {
    const dashId = trimmed.replace(/^dashboard:/, '')
    if (!dashId) return null
    try {
      const { createClient } = require('@supabase/supabase-js')
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
      const authHeader = req && req.headers && req.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) return null
      const token = authHeader.split(' ')[1]
      const { data: { user } } = await supabase.auth.getUser(token)
      if (!user) return null
      const { data: row, error } = await supabase
        .from('shorts_dashboards')
        .select('data')
        .eq('id', dashId)
        .eq('user_id', user.id)
        .single()
      if (error || !row || !Array.isArray(row.data)) return null
      return row.data
    } catch (e) {
      console.error('AI dashboard-spec: get dashboard data error', e.message)
      return null
    }
  }

  // Example dataset: in-memory first, then API
  const fromExamples = getExampleDatasetData(trimmed)
  if (fromExamples && Array.isArray(fromExamples)) return fromExamples

  try {
    const port = process.env.PORT || 5000
    const baseUrl = `http://localhost:${port}`
    const encoded = encodeURIComponent(trimmed).replace(/%2F/g, '/')
    const res = await axios.get(`${baseUrl}/api/example/${encoded}`, { timeout: 10000 })
    const data = res.data && res.data.data ? res.data.data : Array.isArray(res.data) ? res.data : null
    return Array.isArray(data) ? data : null
  } catch (err) {
    if (err.response && err.response.status === 404) return null
    console.error('AI dashboard-spec: fetch example error', err.message)
    return null
  }
}

/**
 * Dataset schema profiler: infer field types, examples, min/max.
 * Returns { rowCount, fields: [ { name, type, examples, min?, max? } ] }
 */
function profileSchema(data) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return { rowCount: 0, fields: [] }
  }

  const columns = Object.keys(data[0] || {})
  const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(data, columns)
  const fields = columns.map((name) => {
    const values = data
      .map((row) => row[name])
      .filter((v) => v !== null && v !== undefined && v !== '')
    const sample = values.slice(0, 5).map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v)))
    let type = 'string'
    if (dateColumns.includes(name)) type = 'date'
    else if (numericColumns.includes(name)) type = 'number'
    else if (categoricalColumns.includes(name)) type = 'string'

    let min, max
    if (type === 'number' && values.length > 0) {
      const nums = values.map((v) => parseFloat(String(v).replace(/[$,\s]/g, ''))).filter((n) => !isNaN(n))
      if (nums.length) {
        min = Math.min(...nums)
        max = Math.max(...nums)
      }
    }
    if (type === 'date' && values.length > 0) {
      const dates = values.map((v) => new Date(v)).filter((d) => !isNaN(d.getTime()))
      if (dates.length) {
        min = new Date(Math.min(...dates.map((d) => d.getTime()))).toISOString().slice(0, 10)
        max = new Date(Math.max(...dates.map((d) => d.getTime()))).toISOString().slice(0, 10)
      }
    }

    return {
      name,
      type,
      examples: sample,
      ...(min !== undefined && { min }),
      ...(max !== undefined && { max })
    }
  })

  return {
    rowCount: data.length,
    fields
  }
}

/**
 * Extract JSON object from AI response (strip markdown/code blocks if present)
 */
function parseSpecFromResponse(text) {
  if (!text || typeof text !== 'string') return null
  let raw = text.trim()
  const codeMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeMatch) raw = codeMatch[1].trim()
  const objMatch = raw.match(/\{[\s\S]*\}/)
  if (!objMatch) return null
  try {
    return JSON.parse(objMatch[0])
  } catch (e) {
    return null
  }
}

// GET /api/ai/dataset-schema?dataset=sales (req passed for dashboard:xxx auth)
router.get('/dataset-schema', async (req, res) => {
  try {
    const datasetId = req.query.dataset || req.query.datasetId
    if (!datasetId) {
      return res.status(400).json({ error: 'dataset (or datasetId) query is required' })
    }
    const data = await getDataForDataset(datasetId, req)
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Dataset not found or empty' })
    }
    const schema = profileSchema(data)
    res.json(schema)
  } catch (err) {
    console.error('GET /api/ai/dataset-schema', err)
    res.status(500).json({ error: err.message || 'Server error' })
  }
})

// GET /api/ai/dataset-data?dataset=sales
router.get('/dataset-data', async (req, res) => {
  try {
    const datasetId = req.query.dataset || req.query.datasetId
    if (!datasetId) {
      return res.status(400).json({ error: 'dataset (or datasetId) query is required' })
    }
    const data = await getDataForDataset(datasetId, req)
    if (!data) {
      return res.status(404).json({ error: 'Dataset not found' })
    }
    res.json({ data })
  } catch (err) {
    console.error('GET /api/ai/dataset-data', err)
    res.status(500).json({ error: err.message || 'Server error' })
  }
})

// POST /api/ai/dashboard-spec (handler shared for with/without trailing slash)
async function handleDashboardSpec(req, res) {
  try {
    if (!openai) {
      return res.status(503).json({
        error: 'AI not configured',
        message: 'OPENAI_API_KEY is required. Set it in backend .env.'
      })
    }

    const { datasetId, userPrompt, existingSpec, data: bodyData } = req.body || {}
    if (typeof userPrompt !== 'string' || !userPrompt.trim()) {
      return res.status(400).json({ error: 'userPrompt is required' })
    }

    const hasUploadData = Array.isArray(bodyData) && bodyData.length > 0
    const hasDatasetId = typeof datasetId === 'string' && datasetId.trim().length > 0
    if (!hasUploadData && !hasDatasetId) {
      return res.status(400).json({
        error: 'Provide either datasetId (example/dashboard) or data (uploaded data array). userPrompt is required.'
      })
    }

    let data = null
    if (hasUploadData) {
      data = bodyData
    } else {
      data = await getDataForDataset(datasetId.trim(), req)
    }
    if (!data || data.length === 0) {
      return res.status(400).json({ error: 'Dataset not found or empty. Use an example dataset, your dashboard, or upload data.' })
    }

    const schemaSummary = profileSchema(data)
    const schemaDesc = schemaSummary.fields
      .map((f) => `${f.name} (${f.type})${f.examples && f.examples.length ? ` e.g. ${f.examples.slice(0, 2).join(', ')}` : ''}`)
      .join('\n')

    const schemaBlock = getSystemPromptSchemaBlock()
    const systemPrompt = `You are a dashboard spec generator. Output ONLY a single JSON object (no markdown, no explanation). Use only field names from the dataset schema below.

${schemaBlock}`

    const userContent = `Dataset schema:\n${schemaDesc}\n\nUser request: ${userPrompt}\n${
      existingSpec ? `\nCurrent spec (refine/update this):\n${JSON.stringify(existingSpec)}` : ''
    }\n\nOutput only the DashboardSpec JSON:`

    let lastErrors = []
    let lastText = ''
    for (let attempt = 0; attempt <= 1; attempt++) {
      const messages =
        attempt === 0
          ? [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userContent }
            ]
          : [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userContent },
              { role: 'assistant', content: lastText },
              {
                role: 'user',
                content: `The response above had validation errors. Fix them and output ONLY the corrected DashboardSpec JSON, no other text.\nErrors:\n${lastErrors.join('\n')}`
              }
            ]

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 2000,
        temperature: 0.2
      })

      const text = completion.choices?.[0]?.message?.content?.trim() || ''
      lastText = text
      const spec = parseSpecFromResponse(text)
      if (!spec) {
        lastErrors = ['Response was not valid JSON.']
        continue
      }

      const { valid, errors, spec: normalized } = validateDashboardSpec(spec, schemaSummary.fields)
      if (valid) {
        return res.json({ spec: normalized })
      }
      lastErrors = errors
    }

    return res.status(502).json({
      error: 'Invalid spec',
      message: 'AI returned invalid DashboardSpec after retry.',
      validationErrors: lastErrors
    })
  } catch (err) {
    console.error('POST /api/ai/dashboard-spec', err)
    const status = err.status ?? err.response?.status ?? 500
    res.status(status >= 400 ? status : 500).json({
      error: err.message || 'AI dashboard-spec failed'
    })
  }
}

router.post('/dashboard-spec', handleDashboardSpec)
router.post('/dashboard-spec/', handleDashboardSpec)

module.exports = router
module.exports.handleDashboardSpec = handleDashboardSpec
