/**
 * AI Training — module catalog, bundled sample datasets, run analysis (reuse dashboard spec AI), explain results.
 */

const express = require('express')
const fs = require('fs')
const path = require('path')
const OpenAI = require('openai')
const { generateDashboardSpecFromRows, profileSchema } = require('./aiDashboardSpec')

const router = express.Router()
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

const projectRoot = path.join(__dirname, '../..')
const modulesPath = path.join(projectRoot, 'data', 'trainingModules.json')
const datasetsDir = path.join(projectRoot, 'data', 'datasets')

function loadModulesFile() {
  const raw = fs.readFileSync(modulesPath, 'utf8')
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed)) throw new Error('trainingModules.json must be an array')
  return parsed
}

function parseNumberCell(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const n = parseFloat(String(v ?? '').replace(/[$,\s]/g, ''))
  return Number.isFinite(n) ? n : NaN
}

function computeKpis(rows, numericColumnNames, { maxMetrics = 6 } = {}) {
  const cols = (numericColumnNames || []).filter(Boolean).slice(0, maxMetrics)
  const out = []
  for (const col of cols) {
    const vals = []
    for (const row of rows || []) {
      const n = parseNumberCell(row[col])
      if (!Number.isNaN(n)) vals.push(n)
    }
    if (vals.length === 0) {
      out.push({ column: col, count: 0, sum: null, mean: null, min: null, max: null })
      continue
    }
    const sum = vals.reduce((a, b) => a + b, 0)
    out.push({
      column: col,
      count: vals.length,
      sum,
      mean: sum / vals.length,
      min: Math.min(...vals),
      max: Math.max(...vals)
    })
  }
  return out
}

function summarizeChartsFromSpec(spec) {
  if (!spec || typeof spec !== 'object') return []
  const items = []

  const pushWidgets = (widgets, source) => {
    if (!Array.isArray(widgets)) return
    for (const w of widgets) {
      if (!w || typeof w !== 'object') continue
      const t = w.type || w.chartType || 'widget'
      const title = w.title || w.label || w.id || t
      items.push({ type: t, title: String(title), source })
    }
  }

  pushWidgets(spec.charts, 'root')
  pushWidgets(spec.kpis, 'kpi')
  if (Array.isArray(spec.tabs)) {
    spec.tabs.forEach((tab, i) => {
      const label = tab?.label || tab?.id || `tab-${i}`
      pushWidgets(tab.charts, `tab:${label}`)
      pushWidgets(tab.kpis, `tab-kpi:${label}`)
    })
  }
  return items
}

function buildSummaryText({ rowCount, fieldCount, kpis, chartSummaries }) {
  const k = (kpis && kpis[0]) || null
  const parts = [
    `Profiled ${rowCount} rows and ${fieldCount} columns.`,
    k && k.sum != null ? `Example: ${k.column} totals ${Math.round(k.sum * 100) / 100} across loaded rows (mean ${Math.round(k.mean * 100) / 100}).` : null,
    chartSummaries.length ? `Generated ${chartSummaries.length} dashboard widgets (KPIs + charts).` : null
  ].filter(Boolean)
  return parts.join(' ')
}

router.get('/modules', (req, res) => {
  try {
    const modules = loadModulesFile()
    const list = modules.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      difficulty: m.difficulty,
      valueProposition: m.valueProposition || null,
      outcomes: Array.isArray(m.outcomes) ? m.outcomes.slice(0, 3) : [],
      sampleDataset: m.sampleDataset || null
    }))
    res.json({ modules: list })
  } catch (e) {
    console.error('GET /api/training/modules', e)
    res.status(500).json({ error: 'Failed to load training modules', message: e.message })
  }
})

router.get('/modules/:id', (req, res) => {
  try {
    const modules = loadModulesFile()
    const mod = modules.find((m) => m.id === req.params.id)
    if (!mod) return res.status(404).json({ error: 'Module not found' })
    res.json({
      id: mod.id,
      title: mod.title,
      description: mod.description,
      difficulty: mod.difficulty,
      valueProposition: mod.valueProposition || null,
      concepts: Array.isArray(mod.concepts) ? mod.concepts : [],
      outcomes: Array.isArray(mod.outcomes) ? mod.outcomes : [],
      steps: mod.steps || [],
      sampleDataset: mod.sampleDataset || null
    })
  } catch (e) {
    console.error('GET /api/training/modules/:id', e)
    res.status(500).json({ error: 'Failed to load module', message: e.message })
  }
})

/** Bundled sample in the same shape as POST /api/upload (optional fields normalized by client). */
router.get('/dataset/:name', (req, res) => {
  try {
    const base = path.basename(req.params.name || '')
    if (!/^[a-zA-Z0-9._-]+\.json$/i.test(base)) {
      return res.status(400).json({ error: 'Invalid dataset name' })
    }
    const full = path.join(datasetsDir, base)
    const resolved = path.resolve(full)
    if (!resolved.startsWith(path.resolve(datasetsDir))) {
      return res.status(400).json({ error: 'Invalid path' })
    }
    if (!fs.existsSync(resolved)) return res.status(404).json({ error: 'Dataset file not found' })
    const raw = fs.readFileSync(resolved, 'utf8')
    const payload = JSON.parse(raw)
    if (!payload.data || !Array.isArray(payload.data)) {
      return res.status(500).json({ error: 'Invalid dataset file: missing data array' })
    }
    res.json(payload)
  } catch (e) {
    console.error('GET /api/training/dataset/:name', e)
    res.status(500).json({ error: 'Failed to load dataset', message: e.message })
  }
})

router.post('/run', async (req, res) => {
  try {
    const { module_id: moduleId, dataset } = req.body || {}
    if (!moduleId || typeof moduleId !== 'string') {
      return res.status(400).json({ error: 'module_id is required' })
    }
    const rows = dataset && Array.isArray(dataset.data) ? dataset.data : null
    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: 'dataset.data must be a non-empty array' })
    }

    const modules = loadModulesFile()
    const mod = modules.find((m) => m.id === moduleId)
    if (!mod) return res.status(404).json({ error: 'Unknown module_id' })

    const columns = Array.isArray(dataset.columns) && dataset.columns.length
      ? dataset.columns
      : Object.keys(rows[0] || {})

    const numericColumns = Array.isArray(dataset.numericColumns) && dataset.numericColumns.length
      ? dataset.numericColumns.filter((c) => columns.includes(c))
      : profileSchema(rows).fields.filter((f) => f.type === 'number').map((f) => f.name)

    const schemaSummary = profileSchema(rows)
    const kpis = computeKpis(rows, numericColumns)
    const chartSummaries = []
    let spec = null
    let aiError = null

    const userPrompt = (typeof mod.aiPrompt === 'string' && mod.aiPrompt.trim())
      ? mod.aiPrompt.trim()
      : 'Create a compact analytics dashboard with 3-5 KPIs and 2-3 charts using only columns from the schema. Use clear titles suitable for learners.'

    try {
      const gen = await generateDashboardSpecFromRows(rows, userPrompt, null)
      spec = gen.spec
      chartSummaries.push(...summarizeChartsFromSpec(spec))
    } catch (e) {
      if (e.code === 'NO_AI') {
        aiError = 'AI is not configured (missing OPENAI_API_KEY). KPIs and profile are still available.'
      } else {
        aiError = e.message || 'Dashboard generation failed'
        console.error('POST /api/training/run spec', e)
      }
    }

    const summary = buildSummaryText({
      rowCount: rows.length,
      fieldCount: schemaSummary.fields.length,
      kpis,
      chartSummaries
    })

    res.json({
      module_id: mod.id,
      profile: schemaSummary,
      kpis,
      spec,
      charts: chartSummaries,
      summary,
      datasetEcho: {
        rowCount: rows.length,
        columns,
        numericColumns
      },
      ...(aiError ? { aiWarning: aiError } : {})
    })
  } catch (e) {
    console.error('POST /api/training/run', e)
    res.status(500).json({ error: 'Training run failed', message: e.message })
  }
})

router.post('/explain', async (req, res) => {
  try {
    if (!openai) {
      return res.status(503).json({
        error: 'AI not configured',
        message: 'OPENAI_API_KEY is required for explanations.'
      })
    }
    const { results, moduleTitle } = req.body || {}
    if (!results || typeof results !== 'object') {
      return res.status(400).json({ error: 'results object is required' })
    }

    const payload = {
      moduleTitle: moduleTitle || null,
      summary: results.summary,
      kpis: results.kpis,
      charts: results.charts,
      profileRowCount: results.profile?.rowCount,
      profileFields: results.profile?.fields?.map((f) => ({ name: f.name, type: f.type }))
    }

    const system = `You are a friendly analytics instructor for NM2TECH Analytics Shorts. Explain analysis results to a learner.
Output markdown with short sections:
## What happened
## Key insights (bullets)
## Possible next actions (bullets)
Do not invent specific numbers that are not in the provided JSON. If KPIs or charts are missing, say what is missing and what the user could try next.`

    const user = `Context JSON:\n${JSON.stringify(payload, null, 2)}\n\nWrite the explanation.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      max_tokens: 900,
      temperature: 0.35
    })
    const explanation = completion?.choices?.[0]?.message?.content?.trim() || ''
    if (!explanation) return res.status(502).json({ error: 'No explanation returned' })
    res.json({ explanation })
  } catch (e) {
    console.error('POST /api/training/explain', e)
    res.status(500).json({ error: 'Explain failed', message: e.message })
  }
})

module.exports = router
