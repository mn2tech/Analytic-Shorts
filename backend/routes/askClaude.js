const express = require('express')
const axios = require('axios')
const { optionalAuth } = require('../middleware/requireAuth')
const { getSupabaseAdmin } = require('../utils/supabaseAdmin')
const { getExampleDatasetData } = require('./examples')
const { generateDashboardSpecFromRows } = require('./aiDashboardSpec')
const { detectColumnTypes, processDataPreservingNumbers } = require('../controllers/dataProcessor')
const { getUserSubscription } = require('../middleware/usageLimits')

let Anthropic = null
try {
  // eslint-disable-next-line global-require
  Anthropic = require('@anthropic-ai/sdk')
} catch (_) {
  Anthropic = null
}

const router = express.Router()
const AnthropicClient = Anthropic?.default || Anthropic
const anthropic = process.env.ANTHROPIC_API_KEY && AnthropicClient
  ? new AnthropicClient({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

const FREE_PREVIEW_LIMIT = 3
const previewCounts = new Map()

const SYSTEM_PROMPT = `You are an AI data analyst assistant embedded in Analytics Shorts, 
a data visualization platform. You have access to the user's current 
dataset and can:
- Answer questions about their data in plain English
- Create instant dashboards from natural language descriptions
- Find federal government contracting opportunities
- Generate AI-powered insights

Current dataset context will be provided with each message.
When creating dashboards, always call the create_dashboard tool.
When users ask to add/remove/replace chart widgets, include concise chart control intent in your answer so the UI can apply layout changes.
When asked about government contracts, always call run_federal_report.
Keep responses concise and actionable. Lead with the answer, 
then explain. Never say you cannot access the data - it is provided 
to you in the context.`

const tools = [
  {
    name: 'answer_data_question',
    description: 'Analyze the provided dataset and return a concise plain-English answer.',
    input_schema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'The user question about the current dataset.' },
      },
      required: ['question'],
    },
  },
  {
    name: 'create_dashboard',
    description: 'Create or update an Analytics Shorts DashboardSpec from the current dataset.',
    input_schema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Natural language dashboard request.' },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'get_example_dataset',
    description: 'Fetch a built-in example dataset by id, such as sales, attendance, donations, medical, banking, or yearly-income.',
    input_schema: {
      type: 'object',
      properties: {
        datasetId: { type: 'string', description: 'Example dataset id.' },
      },
      required: ['datasetId'],
    },
  },
  {
    name: 'run_federal_report',
    description: 'Start a federal entry intelligence report for government contracting opportunities.',
    input_schema: {
      type: 'object',
      properties: {
        industryKey: { type: 'string', description: 'Industry key. Prefer IT_FIRMS for IT services.' },
        keywords: { type: 'array', items: { type: 'string' } },
        agency: { type: 'string' },
        naics: { type: 'array', items: { type: 'string' } },
        limit: { type: 'number' },
      },
    },
  },
  {
    name: 'get_insights',
    description: 'Generate AI insights for the current dataset using the existing insights endpoint.',
    input_schema: {
      type: 'object',
      properties: {
        focus: { type: 'string', description: 'Optional focus area for the insights.' },
      },
    },
  },
]

function getClientKey(req) {
  return req.user?.id || req.ip || req.headers['x-forwarded-for'] || 'anonymous'
}

async function getSubscriptionPlan(user) {
  if (!user?.id) return 'free'
  try {
    const subscription = await getUserSubscription(user.id, user.email)
    return subscription?.plan || 'free'
  } catch (error) {
    console.warn('[ask-claude] subscription lookup failed:', error?.message || error)
    return 'free'
  }
}

async function getPreviewUsage(req) {
  const key = getClientKey(req)
  const supabase = getSupabaseAdmin()
  if (req.user?.id && supabase) {
    try {
      const { count, error } = await supabase
        .from('shorts_usage_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', req.user.id)
        .eq('action', 'ask_claude_preview')
      if (!error) return count || 0
    } catch (_) {}
  }
  return previewCounts.get(key) || 0
}

async function recordPreviewUsage(req) {
  const key = getClientKey(req)
  previewCounts.set(key, (previewCounts.get(key) || 0) + 1)
  const supabase = getSupabaseAdmin()
  if (!req.user?.id || !supabase) return
  try {
    await supabase.from('shorts_usage_logs').insert({
      user_id: req.user.id,
      action: 'ask_claude_preview',
      metadata: { source: 'ask_claude' },
    })
  } catch (_) {}
}

function isPaidPlan(plan) {
  return ['pro', 'enterprise', 'admin', 'demo'].includes(String(plan || '').toLowerCase())
}

function getRows(dataContext) {
  const rows = Array.isArray(dataContext?.data) ? dataContext.data : []
  return rows.slice(0, 10000)
}

function getColumns(dataContext, rows) {
  return Array.isArray(dataContext?.columns) && dataContext.columns.length
    ? dataContext.columns
    : Object.keys(rows[0] || {})
}

function numericValue(value) {
  if (value == null || value === '') return NaN
  const n = Number(String(value).replace(/[$,%\s,]/g, ''))
  return Number.isFinite(n) ? n : NaN
}

function answerDataQuestion(question, dataContext) {
  const rows = getRows(dataContext)
  const columns = getColumns(dataContext, rows)
  if (!rows.length) return 'No rows are currently loaded.'

  const q = String(question || '').toLowerCase()
  const numericColumns = columns.filter((col) => rows.some((row) => Number.isFinite(numericValue(row[col]))))
  const categoricalColumns = columns.filter((col) => !numericColumns.includes(col))

  const targetMetric = numericColumns.find((col) => q.includes(String(col).toLowerCase())) ||
    numericColumns.find((col) => /revenue|sales|amount|total|value|cost|price/i.test(col)) ||
    numericColumns[0]
  const groupColumn = categoricalColumns.find((col) => q.includes(String(col).toLowerCase())) ||
    categoricalColumns.find((col) => /product|category|region|customer|agency|organization|type/i.test(col))

  if (/(highest|top|most|largest|max)/i.test(question) && targetMetric && groupColumn) {
    const totals = new Map()
    rows.forEach((row) => {
      const key = String(row[groupColumn] ?? 'Unknown')
      const value = numericValue(row[targetMetric])
      if (Number.isFinite(value)) totals.set(key, (totals.get(key) || 0) + value)
    })
    const [name, total] = [...totals.entries()].sort((a, b) => b[1] - a[1])[0] || []
    if (name) return `${name} had the highest ${targetMetric}, totaling ${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}.`
  }

  if (targetMetric) {
    const values = rows.map((row) => numericValue(row[targetMetric])).filter(Number.isFinite)
    const sum = values.reduce((acc, n) => acc + n, 0)
    const avg = values.length ? sum / values.length : 0
    return `${targetMetric} totals ${sum.toLocaleString(undefined, { maximumFractionDigits: 2 })} across ${rows.length.toLocaleString()} rows, with an average of ${avg.toLocaleString(undefined, { maximumFractionDigits: 2 })}.`
  }

  return `This dataset has ${rows.length.toLocaleString()} rows and ${columns.length} columns: ${columns.slice(0, 8).join(', ')}${columns.length > 8 ? ', and more' : ''}.`
}

async function callInsights(req, dataContext, args) {
  const port = process.env.PORT || 5000
  const rows = getRows(dataContext)
  const columns = getColumns(dataContext, rows)
  const response = await axios.post(`http://localhost:${port}/api/insights`, {
    data: rows,
    columns,
    analyzedRows: rows.length,
    filteredRows: rows.length,
    totalRows: rows.length,
    chartContext: args?.focus ? `Focus: ${args.focus}. ` : '',
  }, {
    timeout: 60000,
    headers: req.headers.authorization ? { Authorization: req.headers.authorization } : undefined,
  })
  return response.data
}

async function createDashboard(dataContext, args) {
  const rows = getRows(dataContext)
  const { spec } = await generateDashboardSpecFromRows(rows, args?.prompt || 'Create a useful dashboard for this dataset')
  return spec
}

function getExampleDataset(args) {
  const datasetId = String(args?.datasetId || 'sales').trim()
  const data = getExampleDatasetData(datasetId)
  if (!Array.isArray(data) || data.length === 0) {
    return { error: `Example dataset "${datasetId}" was not found.` }
  }
  const columns = Object.keys(data[0] || {})
  const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(data, columns)
  return {
    datasetId,
    data: processDataPreservingNumbers(data, numericColumns),
    columns,
    numericColumns,
    categoricalColumns,
    dateColumns,
    rowCount: data.length,
  }
}

async function runFederalReport(req, args) {
  const port = process.env.PORT || 5000
  const response = await axios.post(`http://localhost:${port}/api/reports/federal-entry/run`, {
    industryKey: args?.industryKey || 'IT_FIRMS',
    keywords: Array.isArray(args?.keywords) ? args.keywords : [],
    agency: args?.agency || '',
    naics: Array.isArray(args?.naics) ? args.naics : [],
    fy: ['2024', '2025', '2026'],
    limit: Math.min(Number(args?.limit) || 50, 100),
  }, {
    timeout: 30000,
    headers: req.headers.authorization ? { Authorization: req.headers.authorization } : undefined,
  })
  return response.data
}

async function executeTool(req, name, args, dataContext) {
  switch (name) {
    case 'answer_data_question':
      return { text: answerDataQuestion(args?.question, dataContext) }
    case 'create_dashboard':
      return { dashboardSpec: await createDashboard(dataContext, args) }
    case 'get_example_dataset':
      return { exampleDataset: getExampleDataset(args) }
    case 'run_federal_report':
      return { federalReport: await runFederalReport(req, args) }
    case 'get_insights':
      return { insights: await callInsights(req, dataContext, args) }
    default:
      return { error: `Unknown tool: ${name}` }
  }
}

function textFromToolResult(toolName, result) {
  if (!result || typeof result !== 'object') return ''
  if (typeof result.text === 'string' && result.text.trim()) return result.text.trim()

  if (toolName === 'get_insights' && Array.isArray(result.insights?.insights)) {
    return result.insights.insights
      .filter(Boolean)
      .map((insight) => `- ${insight}`)
      .join('\n')
  }

  if (toolName === 'run_federal_report' && result.federalReport?.reportRunId) {
    return `I started the federal entry intelligence report. Report run ID: ${result.federalReport.reportRunId}.`
  }

  if (toolName === 'get_example_dataset' && result.exampleDataset?.rowCount != null) {
    return `I fetched the ${result.exampleDataset.datasetId} example dataset with ${result.exampleDataset.rowCount} rows.`
  }

  if (toolName === 'create_dashboard' && result.dashboardSpec) {
    return 'I created a dashboard spec and rendered it below.'
  }

  return ''
}

function extractTextFromContent(content) {
  if (!Array.isArray(content)) return ''
  return content
    .flatMap((block) => {
      if (block?.type === 'text' && typeof block.text === 'string') return [block.text]
      if (typeof block?.text === 'string') return [block.text]
      return []
    })
    .join('\n')
    .trim()
}

function buildUserContent(message, dataContext) {
  const rows = getRows(dataContext)
  const columns = getColumns(dataContext, rows)
  return [
    `User request: ${message}`,
    '',
    'Current dataset context:',
    JSON.stringify({
      filename: dataContext?.filename || '',
      dashboardId: dataContext?.dashboardId || null,
      rowCount: rows.length,
      columns,
      numericColumns: dataContext?.numericColumns || [],
      categoricalColumns: dataContext?.categoricalColumns || [],
      dateColumns: dataContext?.dateColumns || [],
      selectedNumeric: dataContext?.selectedNumeric || '',
      selectedCategorical: dataContext?.selectedCategorical || '',
      selectedDate: dataContext?.selectedDate || '',
      sampleRows: rows.slice(0, 25),
    }, null, 2),
  ].join('\n')
}

function normalizeHistory(history) {
  return Array.isArray(history)
    ? history
      .filter((item) => item && (item.role === 'user' || item.role === 'assistant') && item.content)
      .slice(-10)
      .map((item) => ({ role: item.role, content: String(item.content).slice(0, 4000) }))
    : []
}

function deriveChartOperationsFromMessage(message) {
  const text = String(message || '').toLowerCase()
  if (!text.trim()) return null

  const ops = {}

  const wantsEverything = /\b(show|add|bring)\s+(everything|all charts|all widgets)\b/.test(text)
  if (wantsEverything) {
    ops.showMap = true
    ops.showLineChart = true
    ops.showBarChart = true
    ops.showPieChart = true
    ops.showKPIs = true
    ops.showTable = true
  }

  if (/\b(remove|hide)\b.*\b(geo ?map|map)\b/.test(text)) ops.showMap = false
  if (/\b(add|show|restore)\b.*\b(geo ?map|map)\b/.test(text)) ops.showMap = true

  if (/\b(remove|hide)\b.*\bline\b/.test(text)) ops.showLineChart = false
  if (/\b(add|show|restore|replace).*?\bline\b/.test(text)) ops.showLineChart = true

  if (/\b(remove|hide)\b.*\bbar\b/.test(text)) ops.showBarChart = false
  if (/\b(add|show|restore|replace).*?\bbar\b/.test(text)) ops.showBarChart = true

  if (/\b(remove|hide)\b.*\bpie\b/.test(text)) ops.showPieChart = false
  if (/\b(add|show|restore|replace).*?\bpie\b/.test(text)) ops.showPieChart = true

  if (/\b(remove|hide)\b.*\b(kpi|kpis|metric|metrics)\b/.test(text)) ops.showKPIs = false
  if (/\b(add|show|restore)\b.*\b(kpi|kpis|metric|metrics)\b/.test(text)) ops.showKPIs = true

  if (/\b(remove|hide)\b.*\btable\b/.test(text)) ops.showTable = false
  if (/\b(add|show|restore)\b.*\btable\b/.test(text)) ops.showTable = true

  if (/\bshow only\b/.test(text)) {
    ops.showMap = false
    ops.showLineChart = false
    ops.showBarChart = false
    ops.showPieChart = false
    ops.showKPIs = false
    ops.showTable = false
    if (/\bbar\b/.test(text)) ops.showBarChart = true
    if (/\bline\b/.test(text)) ops.showLineChart = true
    if (/\bpie\b/.test(text)) ops.showPieChart = true
    if (/\bmap\b/.test(text)) ops.showMap = true
    if (/\bkpi|kpis|metric|metrics\b/.test(text)) ops.showKPIs = true
    if (/\btable\b/.test(text)) ops.showTable = true
  }

  if (/\breplace\b.*\bmap\b.*\bline\b/.test(text)) {
    ops.showMap = false
    ops.showLineChart = true
    ops.replaceMap = 'line'
  } else if (/\breplace\b.*\bmap\b.*\bbar\b/.test(text)) {
    ops.showMap = false
    ops.showBarChart = true
    ops.replaceMap = 'bar'
  } else if (/\breplace\b.*\bmap\b.*\bpie\b/.test(text)) {
    ops.showMap = false
    ops.showPieChart = true
    ops.replaceMap = 'pie'
  }

  return Object.keys(ops).length ? ops : null
}

router.post('/ask-claude', optionalAuth, async (req, res) => {
  try {
    const { message, dataContext = {}, conversationHistory = [] } = req.body || {}
    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'message is required' })
    }

    const plan = await getSubscriptionPlan(req.user)
    if (!isPaidPlan(plan)) {
      const used = await getPreviewUsage(req)
      if (used >= FREE_PREVIEW_LIMIT) {
        return res.status(403).json({
          error: 'Upgrade to Pro to use Ask Claude',
          message: 'Upgrade to Pro to use Ask Claude. Free preview includes 3 questions total.',
          upgradeRequired: true,
          previewLimit: FREE_PREVIEW_LIMIT,
          previewUsed: used,
        })
      }
    }

    if (!anthropic) {
      return res.status(503).json({
        error: 'Ask Claude is not configured',
        message: 'Add ANTHROPIC_API_KEY to backend/.env and install @anthropic-ai/sdk.',
      })
    }

    const messages = [
      ...normalizeHistory(conversationHistory),
      { role: 'user', content: buildUserContent(message.trim(), dataContext) },
    ]

    let finalText = ''
    let toolUsed = null
    let dashboardSpec = null
    let exampleDataset = null
    let federalReport = null
    let lastToolText = ''

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const completion = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        system: SYSTEM_PROMPT,
        tools,
        messages,
      })

      if (process.env.NODE_ENV !== 'production') {
        console.log('[ask-claude] Anthropic response:', JSON.stringify({
          id: completion.id,
          model: completion.model,
          role: completion.role,
          stop_reason: completion.stop_reason,
          content: completion.content,
        }, null, 2))
      }

      const content = completion.content || []
      const text = extractTextFromContent(content)
      const toolUses = content.filter((block) => block.type === 'tool_use')

      if (toolUses.length === 0) {
        finalText = text
        break
      }

      messages.push({ role: 'assistant', content })
      const toolResults = []
      for (const toolUse of toolUses) {
        toolUsed = toolUse.name
        const result = await executeTool(req, toolUse.name, toolUse.input || {}, dataContext)
        const resultText = textFromToolResult(toolUse.name, result)
        if (resultText) lastToolText = resultText
        if (result.dashboardSpec) dashboardSpec = result.dashboardSpec
        if (result.exampleDataset) exampleDataset = result.exampleDataset
        if (result.federalReport) federalReport = result.federalReport
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result).slice(0, 12000),
        })
      }
      messages.push({ role: 'user', content: toolResults })
    }

    if (!finalText) {
      if (lastToolText) finalText = lastToolText
      else if (dashboardSpec) finalText = 'I created a dashboard spec and rendered it below.'
      else if (federalReport?.reportRunId) finalText = 'I started the federal entry intelligence report. The report run ID is shown below.'
      else if (exampleDataset) finalText = `I fetched the ${exampleDataset.datasetId} example dataset with ${exampleDataset.rowCount} rows.`
      else finalText = 'I analyzed the request and returned the result below.'
    }

    if (!isPaidPlan(plan)) await recordPreviewUsage(req)

    const chartOperations = deriveChartOperationsFromMessage(message)

    const responsePayload = {
      response: finalText,
      toolUsed,
      dashboardSpec,
      chartOperations,
      exampleDataset,
      federalReport,
    }
    return res.json(responsePayload)
  } catch (error) {
    console.error('[ask-claude] error:', error)
    return res.status(500).json({
      error: 'Ask Claude failed',
      message: 'Claude could not complete that request. Please try again.',
      details: process.env.NODE_ENV === 'production' ? undefined : error?.message,
    })
  }
})

module.exports = router
