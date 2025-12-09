const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const Papa = require('papaparse')
const XLSX = require('xlsx')
const { detectColumnTypes, processData } = require('../controllers/dataProcessor')
const { createClient } = require('@supabase/supabase-js')
const { checkUploadLimit } = require('../middleware/usageLimits')

const router = express.Router()

// Initialize Supabase for authentication (optional - upload can work without auth)
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Validate URL before creating client
let supabase = null
if (supabaseUrl && supabaseServiceKey) {
  try {
    // Basic URL validation
    if (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://')) {
      supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          persistSession: false
        }
      })
    } else {
      console.warn('Invalid Supabase URL format. Upload tracking will not work.')
    }
  } catch (error) {
    console.warn('Error initializing Supabase client:', error.message)
  }
}

if (!supabase) {
  console.warn('Supabase not configured. Upload tracking will not work.')
}

// Middleware to get user from JWT token (optional - allows anonymous uploads)
const getUserFromToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No auth - allow but don't track usage
      req.user = null
      return next()
    }

    const token = authHeader.split(' ')[1]

    if (!supabase || !token) {
      req.user = null
      return next()
    }

    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data || !data.user) {
      req.user = null
      return next()
    }

    req.user = data.user
    next()
  } catch (error) {
    req.user = null
    next() // Continue without auth
  }
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '../uploads')
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  },
})

const upload = multer({
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit (supports Enterprise plan, actual limit enforced by usageLimits middleware based on user's plan)
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]
    const ext = path.extname(file.originalname).toLowerCase()
    
    if (allowedTypes.includes(file.mimetype) || ext === '.csv' || ext === '.xlsx' || ext === '.xls') {
      cb(null, true)
    } else {
      cb(new Error('Only CSV and Excel files are allowed'))
    }
  },
})

// Wrapper middleware to add timeout to checkUploadLimit
const checkUploadLimitWithTimeout = (req, res, next) => {
  if (!req.user || !req.user.id) {
    // No auth - skip limit check
    return next()
  }
  
  // Set timeout for the limit check
  let timeoutFired = false
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      timeoutFired = true
      console.error('Upload limit check timeout')
      return res.status(500).json({ 
        error: 'Failed to check upload limits',
        message: 'Upload limit check is taking too long. Please try again in a moment.'
      })
    }
  }, 10000) // 10 second timeout
  
  // Create a wrapped next function that clears timeout
  const wrappedNext = () => {
    if (!timeoutFired) {
      clearTimeout(timeout)
      next()
    }
  }
  
  // Call checkUploadLimit as middleware - it will call wrappedNext() when done
  // Since checkUploadLimit is async, we need to handle it properly
  // Make sure wrappedNext is actually a function
  if (typeof wrappedNext !== 'function') {
    clearTimeout(timeout)
    console.error('wrappedNext is not a function:', typeof wrappedNext)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'Upload limit check failed'
    })
  }
  
  // Call the async middleware and handle errors
  Promise.resolve(checkUploadLimit(req, res, wrappedNext)).catch((err) => {
    if (!timeoutFired) {
      clearTimeout(timeout)
      console.error('Upload limit check error:', err)
      if (!res.headersSent) {
        return res.status(500).json({ 
          error: 'Failed to check upload limits',
          message: 'Please try again in a moment'
        })
      }
    }
  })
}

// Upload route with optional auth and usage limits
router.post('/', getUserFromToken, upload.single('file'), checkUploadLimitWithTimeout, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const filePath = req.file.path
    const fileExt = path.extname(req.file.originalname).toLowerCase()
    let rawData = []

    // Parse file based on extension
    if (fileExt === '.csv') {
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      const parsed = Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
      })
      rawData = parsed.data.filter((row) => Object.keys(row).length > 0)
    } else if (fileExt === '.xlsx' || fileExt === '.xls') {
      const workbook = XLSX.readFile(filePath)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
    } else {
      fs.unlinkSync(filePath) // Clean up
      return res.status(400).json({ error: 'Unsupported file format' })
    }

    if (rawData.length === 0) {
      fs.unlinkSync(filePath) // Clean up
      return res.status(400).json({ error: 'File is empty or could not be parsed' })
    }

    // Process and analyze data
    const columns = Object.keys(rawData[0])
    const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(rawData, columns)
    const processedData = processData(rawData)

    // Clean up uploaded file
    fs.unlinkSync(filePath)

    res.json({
      data: processedData,
      columns: columns,
      numericColumns,
      categoricalColumns,
      dateColumns,
      rowCount: processedData.length,
    })
  } catch (error) {
    console.error('Upload error:', error)
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path) // Clean up on error
    }
    res.status(500).json({ error: error.message || 'Failed to process file' })
  }
})

module.exports = router


