const express = require('express')
const cors = require('cors')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
require('dotenv').config()

const uploadRoutes = require('./routes/upload')
const insightsRoutes = require('./routes/insights')
const exampleRoutes = require('./routes/examples')

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
// CORS configuration - allow all origins in development, restrict in production
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',')
    : '*', // Allow all in development, set ALLOWED_ORIGINS in production
  credentials: true,
  optionsSuccessStatus: 200
}
app.use(cors(corsOptions))
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'NM2TECH Analytics Shorts API is running' })
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
})

