const express = require('express')
const cors = require('cors')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
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
const dashboardRoutes = require('./routes/dashboards')
const subscriptionRoutes = require('./routes/subscription')
const webhookRoutes = require('./routes/webhook')
const analyticsRoutes = require('./routes/analytics')
const studioRoutes = require('./routes/studio')
const studioAiSchemaHandler = require('./routes/studioAiSchema')
const aiDashboardSpecRoutes = require('./routes/aiDashboardSpec')
const sharedRoutes = require('./routes/shared')
const datalakeRoutes = require('./routes/datalake')
const ownerSummaryRoutes = require('./routes/ownerSummary')
const accessLogger = require('./middleware/accessLogger')

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
// CORS configuration - allow all origins (can be restricted in production)
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
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}
app.use(cors(corsOptions))
// Webhook route must be before JSON parsing (Stripe needs raw body)
app.use('/api/subscription/webhook', express.raw({ type: 'application/json' }), webhookRoutes)
app.use(express.json({ limit: '500mb' })) // Increase JSON body size limit for large files (supports Enterprise plan up to 500MB)
app.use(express.urlencoded({ extended: true, limit: '500mb' })) // Increase URL-encoded body size limit (supports Enterprise plan up to 500MB)

// Access logging middleware (after body parsing, before routes)
app.use(accessLogger)

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// Routes - register /api/studio/ai-schema FIRST so it always matches
app.post('/api/studio/ai-schema', (req, res, next) => {
  console.log('[server] POST /api/studio/ai-schema hit')
  studioAiSchemaHandler(req, res).catch(next)
})
app.post('/api/studio/ai-schema/', (req, res, next) => {
  console.log('[server] POST /api/studio/ai-schema/ hit')
  studioAiSchemaHandler(req, res).catch(next)
})
app.use('/api/upload', uploadRoutes)
app.use('/api/insights', insightsRoutes)
app.use('/api/example', exampleRoutes)
app.use('/api/dashboards', dashboardRoutes)
app.use('/api/subscription', subscriptionRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/studio', studioRoutes)
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
app.use('/api/ai', aiDashboardSpecRoutes)
if (typeof handleDashboardSpec === 'function') {
  console.log('[server] POST /api/ai/dashboard-spec registered')
}
app.use('/api/shared', sharedRoutes)
app.use('/api/datalake', datalakeRoutes)
app.use('/api/owner-summary', ownerSummaryRoutes)

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
      'POST /api/owner-summary',
      'POST /api/upload',
      'POST /api/insights',
      'GET /api/example/sales',
      'GET /api/example/attendance',
      'GET /api/example/donations',
      'GET /api/example/medical',
      'GET /api/example/banking',
      'GET /api/example/yearly-income'
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

