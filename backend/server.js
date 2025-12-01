const express = require('express')
const cors = require('cors')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
require('dotenv').config()

const uploadRoutes = require('./routes/upload')
const insightsRoutes = require('./routes/insights')
const exampleRoutes = require('./routes/examples')
const dashboardRoutes = require('./routes/dashboards')
const subscriptionRoutes = require('./routes/subscription')
const webhookRoutes = require('./routes/webhook')

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
// CORS configuration - allow all origins (can be restricted in production)
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true)
    
    // In production, you can restrict to specific origins
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['*'] // Allow all in development
    
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
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
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// Routes
app.use('/api/upload', uploadRoutes)
app.use('/api/insights', insightsRoutes)
app.use('/api/example', exampleRoutes)
app.use('/api/dashboards', dashboardRoutes)
app.use('/api/subscription', subscriptionRoutes)

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
        medical: 'GET /api/example/medical'
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
      'POST /api/upload',
      'POST /api/insights',
      'GET /api/example/sales',
      'GET /api/example/attendance',
      'GET /api/example/donations',
      'GET /api/example/medical'
    ]
  })
})

// Only start server if not running in Lambda
if (!process.env.LAMBDA_TASK_ROOT) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`)
  })
}

// Export for Lambda
module.exports = app

