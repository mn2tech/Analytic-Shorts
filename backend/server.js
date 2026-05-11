const express = require('express')
const axios = require('axios')
const cors = require('cors')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const rateLimit = require('express-rate-limit')
// Load .env from backend directory so it works when started from project root or backend/
const envPath = path.join(__dirname, '.env')
require('dotenv').config({ path: envPath })
if (!process.env.OPENAI_API_KEY && !process.env.LAMBDA_TASK_ROOT) {
  console.warn('[server] OPENAI_API_KEY not set. AI Visual Builder (POST /api/ai/dashboard-spec) will return 503.')
  console.warn('[server] Add OPENAI_API_KEY=sk-... to', envPath)
}

const uploadRoutes = require('./routes/upload')
const insightsRoutes = require('./routes/insights')
const exampleRoutes = require('./routes/examples')
const googleSheetsRoutes = require('./routes/googleSheets')
const dashboardRoutes = require('./routes/dashboards')
const subscriptionRoutes = require('./routes/subscription')
const webhookRoutes = require('./routes/webhook')
const analyticsRoutes = require('./routes/analytics')
const profilesRoutes = require('./routes/profiles')
const studioRoutes = require('./routes/studio')
const studioAiSchemaHandler = require('./routes/studioAiSchema')
const aiDashboardSpecRoutes = require('./routes/aiDashboardSpec')
const aiRiskAnalysisRoutes = require('./routes/aiRiskAnalysis')
const aiResponsibleCopilotRoutes = require('./routes/aiResponsibleCopilot')
const askClaudeRoutes = require('./routes/askClaude')
const { postRiskAnalysis } = require('./controllers/aiRiskAnalysisController')
const sharedRoutes = require('./routes/shared')
const datalakeRoutes = require('./routes/datalake')
const ownerSummaryRoutes = require('./routes/ownerSummary')
const youtubeRoutes = require('./routes/youtube')
const datasetsRoutes = require('./routes/datasets')
const postsRoutes = require('./routes/posts')
const messagesRoutes = require('./routes/messages')
const careersRoutes = require('./routes/careers')
const followRoutes = require('./routes/follow')
const liveRoutes = require('./routes/live')
const reportsRoutes = require('./routes/reports')
const hospitalRoutes = require('./routes/hospital')
const innsoftRoutes = require('./routes/innsoft')
// Optional route: aiHealthChat may not be deployed in some environments.
let aiHealthChatRoutes = null
try {
  // eslint-disable-next-line global-require
  aiHealthChatRoutes = require('./routes/aiHealthChat')
} catch (e) {
  aiHealthChatRoutes = null
  console.warn('[server] aiHealthChatRoutes not available; skipping /api/* ai health chat endpoints.')
}
const validationRoutes = require('./routes/validation')
const migrationRoutes = require('./routes/migration')
const v1Routes = require('./routes/v1')
const trainingRoutes = require('./routes/training')
const mlRoutes = require('./routes/ml')
const crackitRoutes = require('./routes/crackit.routes')
const contractorPortalRoutes = require('./routes/contractorPortal')
const { postContractorAiChat } = require('./routes/aiChat')
const accessLogger = require('./middleware/accessLogger')

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
// CORS configuration - allow all origins (can be restricted in production)
if (String(process.env.NODE_ENV || '').toLowerCase() === 'production') {
  // Trust reverse proxy (ALB/nginx) so req.ip and rate limiting work correctly.
  app.set('trust proxy', 1)
}

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true)
    
    const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production'

    // In non-production, allow localhost + common private LAN origins so Vite can change ports freely.
    // This avoids confusing 500s like "Not allowed by CORS" during development.
    if (!isProd) {
      const o = String(origin)
      const isLocalhost =
        /^https?:\/\/localhost:\d+$/i.test(o) ||
        /^https?:\/\/127\.0\.0\.1:\d+$/i.test(o)
      const isPrivateLan =
        /^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d+$/i.test(o) ||
        /^https?:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/i.test(o) ||
        /^https?:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}:\d+$/i.test(o)
      if (isLocalhost || isPrivateLan) return callback(null, true)
    }

    // In production, restrict to specific origins (or '*' to allow all).
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
      : ['*']

    if (allowedOrigins.includes('*') || allowedOrigins.includes(String(origin))) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}
app.use(cors(corsOptions))
// Webhook route must be before JSON parsing (Stripe needs raw body)
app.use('/api/subscription/webhook', express.raw({ type: 'application/json' }), webhookRoutes)

// Rate limiting (protect against abuse and runaway clients)
const jsonRateLimit = ({ windowMs, limit, message }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Rate limit exceeded', message },
    handler: (req, res, next, options) => {
      res.status(options.statusCode).json(options.message)
    },
  })

// General traffic limiter (high ceiling)
app.use(
  jsonRateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 2000,
    message: 'Too many requests. Please slow down and try again shortly.',
  })
)

// Stricter limiters for expensive endpoints
app.use(
  '/api/upload',
  jsonRateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 30,
    message: 'Too many uploads. Please wait and try again.',
  })
)
app.use(
  '/api/ai',
  jsonRateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 120,
    message: 'Too many AI requests. Please wait a bit and try again.',
  })
)
app.use(
  '/api/contractor-portal',
  jsonRateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 80,
    message: 'Too many contractor portal requests. Please wait and try again.',
  })
)
app.use(
  '/api/example/samgov',
  jsonRateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 600,
    message: 'Too many SAM.gov requests. Please wait and try again.',
  })
)

app.use(express.json({ limit: '500mb' })) // Increase JSON body size limit for large files (supports Enterprise plan up to 500MB)
app.use(express.urlencoded({ extended: true, limit: '500mb' })) // Increase URL-encoded body size limit (supports Enterprise plan up to 500MB)

// Access logging middleware (after body parsing, before routes)
app.use(accessLogger)

// Social Analytics: POST /api/posts first so it always matches (before any /api mount)
const { requireAuth } = require('./middleware/requireAuth')
const postsController = require('./controllers/postsController')
app.post('/api/posts', requireAuth, (req, res) => postsController.createPost(req, res))

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const thumbnailRoutes = require('./routes/thumbnail')
// Serve uploaded files (thumbnails, etc.) under /api/uploads
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')))
app.use('/api/thumbnail-upload', thumbnailRoutes)

// Routes - register /api/studio/ai-schema and /api/studio/pdf FIRST so they always match
app.post('/api/studio/ai-schema', (req, res, next) => {
  console.log('[server] POST /api/studio/ai-schema hit')
  studioAiSchemaHandler(req, res).catch(next)
})
app.post('/api/studio/ai-schema/', (req, res, next) => {
  console.log('[server] POST /api/studio/ai-schema/ hit')
  studioAiSchemaHandler(req, res).catch(next)
})
const { handlePdfExport } = require('./routes/studio')
app.post('/api/studio/pdf', (req, res, next) => {
  console.log('[server] POST /api/studio/pdf hit')
  handlePdfExport(req, res).catch(next)
})
app.post('/api/studio/pdf/', (req, res, next) => {
  console.log('[server] POST /api/studio/pdf/ hit')
  handlePdfExport(req, res).catch(next)
})
app.use('/api/upload', uploadRoutes)
app.use('/api/import', googleSheetsRoutes)
app.use('/api/insights', insightsRoutes)
// USAspending proxy: spending-over-time with correct federal FY boundaries and agency names
const { resolveAgencyName } = require('./utils/usaspendingAgencyMap')
app.get('/api/example/proxy/usaspending/spending-over-time', async (req, res) => {
  const agencyInput = (req.query.agency || 'TREASURY').trim()
  const agencyFullName = resolveAgencyName(agencyInput) || 'Department of the Treasury'
  const fyParam = (req.query.fy || '2024,2025').trim()
  const fyList = fyParam.split(',').map((s) => s.trim()).filter(Boolean)
  const rawResponse = req.query.raw === '1' || req.query.raw === 'true'

  // Federal FY: FY2024 = 2023-10-01 to 2024-09-30, FY2025 = 2024-10-01 to 2025-09-30
  const timePeriod = fyList.map((fy) => {
    const year = parseInt(String(fy).trim(), 10)
    if (!Number.isFinite(year) || year < 1900 || year > 2100) return null
    return { start_date: `${year - 1}-10-01`, end_date: `${year}-09-30` }
  }).filter(Boolean)

  if (timePeriod.length === 0) {
    return res.status(400).json({ error: 'USAspending error', details: `Invalid fy. Must be comma-separated years (e.g. 2024,2025). Got: ${fyParam}` })
  }

  const filters = {
    time_period: timePeriod,
    agencies: [{ type: 'awarding', tier: 'toptier', name: agencyFullName }],
    award_type_codes: ['A', 'B', 'C', 'D'],
  }

  const naicsParam = (req.query.naics || req.query.naics_codes || '').toString().trim()
  if (naicsParam) {
    const naicsList = naicsParam.split(',').map((s) => s.trim()).filter(Boolean)
    if (naicsList.length > 0) {
      filters.naics_codes = naicsList
    }
  }

  const payload = { group: 'fiscal_year', filters }

  // Debug: log outbound payload before axios (remove in production if desired)
  console.log('[usaspending/proxy] outbound payload:', JSON.stringify(payload, null, 2))

  try {
    const response = await axios.post('https://api.usaspending.gov/api/v2/search/spending_over_time/', payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
      validateStatus: () => true,
    })

    if (rawResponse) {
      return res.json({
        _raw: true,
        status: response.status,
        data: response.data,
        _payload_sent: payload,
      })
    }

    if (response.status < 200 || response.status >= 300) {
      return res.status(response.status).json({
        error: 'USAspending error',
        details: response.data?.message || response.data?.detail || JSON.stringify(response.data || '').slice(0, 500),
      })
    }

    const results = Array.isArray(response.data?.results) ? response.data.results : []
    const flattened = results.map((r) => ({
      fiscal_year: r.time_period?.fiscal_year != null ? parseInt(String(r.time_period.fiscal_year), 10) : null,
      obligations: typeof r.aggregated_amount === 'number' ? r.aggregated_amount : 0,
      agency: agencyFullName,
    }))
    res.json(flattened)
  } catch (err) {
    return res.status(500).json({ error: 'Proxy failed', details: err?.message || String(err) })
  }
})
app.use('/api/example', exampleRoutes)
app.use('/api/datasets', datasetsRoutes)
app.use('/api/dashboards', dashboardRoutes)
app.use('/api/subscription', subscriptionRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/profiles', profilesRoutes)
app.use('/api/studio', studioRoutes)
app.use('/api/reports', reportsRoutes)
app.use('/api/hospital', hospitalRoutes)
app.use('/api/innsoft', innsoftRoutes)
if (aiHealthChatRoutes) app.use('/api', aiHealthChatRoutes)
app.use('/api', askClaudeRoutes)
app.use('/api/validation', validationRoutes)
app.use('/api/migration', migrationRoutes)
app.use('/api/v1', v1Routes)
app.use('/api/training', trainingRoutes)
app.use('/api/ml', mlRoutes)
app.use('/api/crackit', crackitRoutes)
// POST /api/ai/dashboard-spec — register first so it always matches (avoids 404)
const handleDashboardSpec = aiDashboardSpecRoutes.handleDashboardSpec
if (typeof handleDashboardSpec !== 'function') {
  console.error('[server] aiDashboardSpec.handleDashboardSpec missing; POST /api/ai/dashboard-spec will return 503')
}
const dashboardSpecHandler = (req, res, next) => {
  console.log('[server] POST /api/ai/dashboard-spec hit')
  if (typeof handleDashboardSpec !== 'function') {
    return res.status(503).json({ error: 'AI dashboard-spec handler not loaded' })
  }
  handleDashboardSpec(req, res).catch(next)
}
app.post('/api/ai/dashboard-spec', dashboardSpecHandler)
app.post('/api/ai/dashboard-spec/', dashboardSpecHandler)
app.get('/api/ai/dashboard-spec', (req, res) => {
  res.status(405).json({ error: 'Method not allowed', hint: 'Use POST to generate a dashboard spec' })
})
// POST /api/ai/risk-analysis — register explicitly (same pattern as dashboard-spec) so proxies/stacks always see the route.
const riskAnalysisHandler = (req, res, next) => {
  postRiskAnalysis(req, res).catch(next)
}
app.post('/api/ai/risk-analysis', riskAnalysisHandler)
app.post('/api/ai/risk-analysis/', riskAnalysisHandler)
// Contractor portal HR chat (Anthropic + requireAuth). Wrapped so async rejections always return JSON.
app.post('/api/ai/chat', requireAuth, (req, res) => {
  Promise.resolve(postContractorAiChat(req, res)).catch((err) => {
    if (res.headersSent) return
    console.error('[api/ai/chat] unhandled', err)
    res.status(500).json({
      error: String(err?.message || err || 'Unexpected server error'),
      code: 'AI_CHAT_UNHANDLED',
    })
  })
})
app.post('/api/ai/chat/', requireAuth, (req, res) => {
  Promise.resolve(postContractorAiChat(req, res)).catch((err) => {
    if (res.headersSent) return
    console.error('[api/ai/chat] unhandled', err)
    res.status(500).json({
      error: String(err?.message || err || 'Unexpected server error'),
      code: 'AI_CHAT_UNHANDLED',
    })
  })
})
app.use('/api/ai', aiRiskAnalysisRoutes)
app.use('/api/ai', aiDashboardSpecRoutes)
app.use('/api/ai', aiResponsibleCopilotRoutes)
if (typeof handleDashboardSpec === 'function') {
  console.log('[server] POST /api/ai/dashboard-spec registered')
}
console.log('[server] POST /api/ai/risk-analysis registered')
app.use('/api/shared', sharedRoutes)
app.use('/api/datalake', datalakeRoutes)
app.use('/api/owner-summary', ownerSummaryRoutes)
app.use('/api/youtube', youtubeRoutes)
app.use('/api', messagesRoutes)
app.use('/api', careersRoutes)
app.use('/api', followRoutes)
app.use('/api', postsRoutes)
app.use('/api/live', liveRoutes)
app.use('/api/contractor-portal', contractorPortalRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'NM2TECH Analytics Shorts API is running' })
})

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'NM2TECH Analytics Shorts API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      upload: 'POST /api/upload',
      insights: 'POST /api/insights',
      examples: {
        sales: 'GET /api/example/sales',
        attendance: 'GET /api/example/attendance',
        donations: 'GET /api/example/donations',
        medical: 'GET /api/example/medical',
        banking: 'GET /api/example/banking',
        yearlyIncome: 'GET /api/example/yearly-income'
      }
    }
  })
})

// Catch-all route for undefined endpoints
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.path}`,
    availableEndpoints: [
      'GET /api/health',
      'GET /api/ai (list AI routes)',
      'GET /api/ai/dataset-schema',
      'GET /api/ai/dataset-data',
      'POST /api/ai/dashboard-spec',
      'POST /api/ai/risk-analysis',
      'POST /api/ai/chat',
      'GET /api/training/modules',
      'GET /api/training/modules/:id',
      'GET /api/training/dataset/:name',
      'POST /api/training/run',
      'POST /api/training/explain',
      'POST /api/owner-summary',
      'POST /api/upload',
      'POST /api/insights',
      'GET /api/example/sales',
      'GET /api/example/attendance',
      'GET /api/example/donations',
      'GET /api/example/medical',
      'GET /api/example/banking',
      'GET /api/example/yearly-income',
      'GET /api/example/samgov/expand-intent',
      'GET /api/example/samgov/live',
      'GET /api/example/proxy/usaspending/spending-over-time',
      'GET /api/datasets/maritime-ais',
      'GET /api/feed',
      'GET /api/analytics/community',
      'GET /api/analytics/admin-check',
      'GET /api/analytics/new-members',
      'POST /api/analytics/broadcast-email',
      'POST /api/analytics/reminder-no-dashboards',
      'POST /api/posts',
      'GET /api/posts/:id',
      'POST /api/posts/:id/like',
      'POST /api/posts/:id/save',
      'GET /api/posts/:id/comments',
      'POST /api/posts/:id/comments',
      'POST /api/posts/:id/live-sessions',
      'GET /api/live/:sessionId',
      'POST /api/live/:sessionId/end',
      'POST /api/v1/jobs',
      'GET /api/v1/jobs/:id',
      'POST /api/v1/models',
      'POST /api/v1/models/upload',
      'POST /api/v1/models/:id/confirm',
      'GET /api/v1/models',
      'POST /api/v1/score',
      'POST /api/v1/run'
    ]
  })
})

// Only start server if not running in Lambda
if (!process.env.LAMBDA_TASK_ROOT) {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`)
  })
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${PORT} is already in use. Another process (often a previous Node server) is using it.`)
      console.error('   On Linux/macOS, find and stop the process:')
      console.error('     lsof -i :' + PORT + '   # then: kill <PID>')
      console.error('   On Windows:')
      console.error('     netstat -ano | findstr :' + PORT)
      console.error('     taskkill /PID <PID> /F')
      console.error('   Or close the other app using port ' + PORT + ' and restart.\n')
    }
    throw err
  })
}

// Export for Lambda
module.exports = app

