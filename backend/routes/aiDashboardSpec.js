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
const { getDatasetById: getDatalakeDataset } = require('./datalake')
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
      'POST /api/ai/dataset-chat',
      'POST /api/ai/chat',
      'POST /api/ai/dashboard-spec'
    ]
  })
})

const APP_CHAT_SYSTEM = `You are a helpful assistant for NM2TECH Analytics Shorts, an analytics and dashboard platform. You help users with:
- Feed: social feed for sharing dashboards, posts, liking, saving, and messaging other members.
- Dashboards: create and view data dashboards; use Studio to build them with AI or manually.
- Careers: job postings and resume uploads for the community.
- Profile: name, avatar, and preferences.
- General: how to get started, upload data, create charts, share to the feed, go live on a post, or find help.
Keep answers concise and friendly. If you don't know something, suggest visiting the Help page or exploring the app. Do not make up feature names; stick to what exists (Feed, Studio, Careers, Profile, Messages, Dashboards).`

// POST /api/ai/chat - app-wide assistant (chatbot widget)
router.post('/chat', async (req, res) => {
  try {
    if (!openai) {
      return res.status(503).json({ error: 'Chat is not available right now.', message: 'AI is not configured.' })
    }
    const { messages } = req.body || {}
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' })
    }
    const last = messages[messages.length - 1]
    if (!last || last.role !== 'user' || typeof last.content !== 'string' || !last.content.trim()) {
      return res.status(400).json({ error: 'Last message must be from user with non-empty content' })
    }
    const trimmed = messages.map((m) => ({
      role: m.role === 'user' ? 'user' : m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || '').trim().slice(0, 4000)
    })).filter((m) => m.content.length > 0)
    const chatMessages = [
      { role: 'system', content: APP_CHAT_SYSTEM },
      ...trimmed
    ]
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: chatMessages,
      max_tokens: 600,
      temperature: 0.6
    })
    const reply = completion?.choices?.[0]?.message?.content?.trim() || ''
    if (!reply) return res.status(502).json({ error: 'No reply from assistant' })
    res.json({ reply })
  } catch (err) {
    console.error('POST /api/ai/chat', err)
    res.status(500).json({ error: err.message || 'Chat failed' })
  }
})

// Basic PII blocklist for column names (avoid echoing sensitive values in samples)
const PII_BLOCKLIST = [
  'name', 'email', 'ssn', 'phone', 'address',
  'firstname', 'lastname', 'first_name', 'last_name',
  'email_address', 'phone_number', 'mobile',
  'social_security', 'ssn_number', 'social_security_number',
  'street_address', 'home_address', 'mailing_address',
  'credit_card', 'card_number', 'account_number',
  'password', 'pin', 'secret'
]
function isPIIField(fieldName) {
  const lowerField = String(fieldName || '').toLowerCase()
  return PII_BLOCKLIST.some((blocked) => lowerField.includes(blocked))
}

function safeSampleRows(sampleRows, schemaFields, { maxRows = 30, maxCols = 18 } = {}) {
  const rows = Array.isArray(sampleRows) ? sampleRows.slice(0, maxRows) : []
  if (rows.length === 0) return []
  const fields = Array.isArray(schemaFields) ? schemaFields : []
  const orderedCols = fields.map((f) => f.name).filter(Boolean)
  const cols = (orderedCols.length ? orderedCols : Object.keys(rows[0] || {}))
    .filter((c) => c && !isPIIField(c))
    .slice(0, maxCols)
  return rows.map((r) => {
    const o = {}
    cols.forEach((c) => { o[c] = r?.[c] })
    return o
  })
}

/**
 * Resolve datasetId to raw data array.
 * datasetId: example id (e.g. "sales") or "dashboard:<uuid>" for user dashboard data.
 */
async function getDataForDataset(datasetId, req) {
  if (!datasetId || typeof datasetId !== 'string') return null
  const trimmed = datasetId.trim()

  // Data lake: persisted datasets
  if (trimmed.startsWith('datalake:')) {
    const lakeId = trimmed.replace(/^datalake:/, '')
    const payload = getDatalakeDataset(lakeId)
    if (payload && Array.isArray(payload.data)) return payload.data
    return null
  }

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

  // Example dataset: in-memory first, then /api/datasets, then /api/example
  const fromExamples = getExampleDatasetData(trimmed)
  if (fromExamples && Array.isArray(fromExamples)) return fromExamples

  const port = process.env.PORT || 5000
  const baseUrl = `http://localhost:${port}`
  const encoded = encodeURIComponent(trimmed).replace(/%2F/g, '/')

  try {
    const dsRes = await axios.get(`${baseUrl}/api/datasets/${encoded}`, { timeout: 10000 })
    const data = dsRes.data && dsRes.data.data ? dsRes.data.data : Array.isArray(dsRes.data) ? dsRes.data : null
    if (Array.isArray(data)) return data
  } catch (_) {}

  try {
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

// POST /api/ai/dataset-chat
// Body: { message: string, datasetId?: string, schema?: {rowCount, fields}, rowCount?: number, sampleRows?: any[] }
router.post('/dataset-chat', async (req, res) => {
  try {
    if (!openai) {
      return res.status(503).json({
        error: 'AI not configured',
        message: 'OPENAI_API_KEY is required. Set it in backend .env.'
      })
    }

    const { message, datasetId, schema, rowCount, sampleRows } = req.body || {}
    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'message is required' })
    }

    let resolvedSchema = schema && typeof schema === 'object' ? schema : null
    let resolvedRows = Array.isArray(sampleRows) ? sampleRows : null
    let resolvedRowCount = typeof rowCount === 'number' ? rowCount : null

    // If schema/sample not provided, fall back to datasetId fetch (server-side).
    if ((!resolvedSchema || !Array.isArray(resolvedSchema.fields)) && typeof datasetId === 'string' && datasetId.trim()) {
      const data = await getDataForDataset(datasetId.trim(), req)
      if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Dataset not found or empty' })
      }
      resolvedRowCount = data.length
      resolvedSchema = profileSchema(data)
      resolvedRows = data.slice(0, 30)
    }

    if (!resolvedSchema || !Array.isArray(resolvedSchema.fields)) {
      return res.status(400).json({ error: 'schema.fields is required (or provide datasetId)' })
    }

    const safeRows = safeSampleRows(resolvedRows || [], resolvedSchema.fields, { maxRows: 30, maxCols: 18 })
    const rowCountFinal = resolvedRowCount ?? resolvedSchema.rowCount ?? (Array.isArray(resolvedRows) ? resolvedRows.length : 0)

    const numeric = resolvedSchema.fields.filter((f) => (f.type || '').toLowerCase() === 'number').map((f) => f.name)
    const dates = resolvedSchema.fields.filter((f) => (f.type || '').toLowerCase() === 'date').map((f) => f.name)
    const categorical = resolvedSchema.fields
      .filter((f) => {
        const t = (f.type || '').toLowerCase()
        return t !== 'number' && t !== 'date'
      })
      .map((f) => f.name)

    const schemaDesc = resolvedSchema.fields
      .filter((f) => f?.name && !isPIIField(f.name))
      .slice(0, 60)
      .map((f) => `${f.name} (${f.type})${f.examples?.length ? ` e.g. ${f.examples.slice(0, 2).join(', ')}` : ''}`)
      .join('\n')

    const system = `You are a helpful data analyst assistant. You are chatting about ONE selected dataset.
You MUST ground your answers in the provided dataset profile and sample rows.
If you need an exact value that requires full-data computation, say what you can infer from the sample and explain what would be needed for an exact answer.
Be concise, structured, and actionable.
You can suggest a good dashboard/report layout when asked.`

    const user = [
      `DatasetId: ${datasetId || '(not provided)'}`,
      `RowCount: ${rowCountFinal}`,
      `Numeric columns (${numeric.length}): ${numeric.join(', ') || 'none'}`,
      `Date columns (${dates.length}): ${dates.join(', ') || 'none'}`,
      `Categorical columns (${categorical.length}): ${categorical.join(', ') || 'none'}`,
      '',
      'Schema:',
      schemaDesc || '(no schema details)',
      '',
      'Sample rows (PII columns removed):',
      JSON.stringify(safeRows, null, 2),
      '',
      `User message: ${message.trim()}`
    ].join('\n')

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      max_tokens: 700,
      temperature: 0.2
    })

    const reply = completion.choices?.[0]?.message?.content?.trim() || ''
    if (!reply) return res.status(502).json({ error: 'AI returned no content' })
    res.json({ reply })
  } catch (err) {
    console.error('POST /api/ai/dataset-chat', err)
    const status = err.status ?? err.response?.status ?? 500
    res.status(status >= 400 ? status : 500).json({
      error: err.message || 'AI dataset chat failed'
    })
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

    const promptTrimmed = userPrompt.trim()
    const wantsThreeTabs = /3\s*[-]?\s*tab|Overview,?\s*Analysis,?\s*Data/i.test(promptTrimmed)
    const wantsMultiTab = wantsThreeTabs || /2\s*[-]?\s*tab|Summary and Charts|multi\s*[-]?\s*tab/i.test(promptTrimmed)
    const multiTabHint = wantsThreeTabs
      ? '\n\nImportant: the user requested a 3-TAB report. You MUST output a "tabs" array with exactly 3 tab objects: first tab label "Overview" (KPIs and/or a chart), second tab label "Analysis" (at least one chart), third tab label "Data" (a table). Each tab: id, label, filters, kpis, charts, layout. Do not put filters/kpis/charts at the top level. Use only field names from the dataset schema above.'
      : wantsMultiTab
        ? '\n\nImportant: the user requested a multi-tab report. You MUST output a "tabs" array with exactly 2 or 3 tab objects (each with id, label, filters, kpis, charts, layout). Do not put filters/kpis/charts at the top level. Every tab must contain at least one widget: e.g. Summary tab with KPIs and/or a table, Charts tab with at least one chart (bar, line, pie), Data tab with a table. Use only field names from the dataset schema above.'
        : ''

    const userContent = `Dataset schema:\n${schemaDesc}\n\nUser request: ${userPrompt}\n${
      existingSpec ? `\nCurrent spec (refine/update this):\n${JSON.stringify(existingSpec)}` : ''
    }${multiTabHint}\n\nOutput only the DashboardSpec JSON:`

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
