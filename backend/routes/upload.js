const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const Papa = require('papaparse')
const ExcelJS = require('exceljs')
const { detectColumnTypes, processData } = require('../controllers/dataProcessor')
const { inferNumericColumnsAndConvert } = require('../utils/numericInference')
const { validateData } = require('../controllers/dataValidator')
const { parseCsvWithFallback, unpackSingleColumnCsvLines } = require('../utils/uploadParsing')
const { createClient } = require('@supabase/supabase-js')
const pdfParseModule = require('pdf-parse')
const pdfParse = typeof pdfParseModule === 'function' ? pdfParseModule : (pdfParseModule.default || pdfParseModule)
const { checkUploadLimit } = require('../middleware/usageLimits')

const router = express.Router()

/**
 * Excel edge case: the sheet contains CSV lines in a single column.
 * `sheet_to_json` then yields one key like "date,rooms_available,..." and each row value is a full CSV line.
 * Detect and re-parse those lines as CSV.
 */
/**
 * Convert PDF extracted text to array of row objects.
 * Tries CSV-style (comma-separated) first, then tab/space-separated with first line as header.
 */
function pdfTextToRows(text) {
  if (!text || !String(text).trim()) return []
  const trimmed = String(text).trim()
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const firstLine = lines[0]
  if (firstLine.includes(',') && firstLine.split(',').length >= 2) {
    const asCsv = lines.join('\n')
    const parsed = parseCsvWithFallback(asCsv)
    const data = unpackSingleColumnCsvLines(parsed.data) || parsed.data
    return data
  }

  const sep = firstLine.includes('\t') ? /\t+/ : /\s{2,}/
  const headers = firstLine.split(sep).map((h, j) => String(h || '').trim() || `Col${j + 1}`)
  const out = []
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(sep).map((c) => String(c || '').trim())
    const row = {}
    headers.forEach((h, j) => {
      row[h] = cells[j] !== undefined ? cells[j] : ''
    })
    out.push(row)
  }
  return out
}

function maybeReparseSingleColumnCsvFromXlsx(rawData) {
  if (!Array.isArray(rawData) || rawData.length === 0) return rawData
  const cols = Object.keys(rawData[0] || {})
  if (cols.length !== 1) return rawData
  const onlyHeader = cols[0] || ''
  if (!onlyHeader.includes(',')) return rawData

  const lines = [onlyHeader]
  for (const row of rawData) {
    const v = row?.[onlyHeader]
    if (v === null || v === undefined) continue
    const s = String(v).trim()
    if (s) lines.push(s)
  }
  if (lines.length <= 1) return rawData

  const reconstructed = lines.join('\n')
  const reparsed = parseCsvWithFallback(reconstructed)
  return reparsed.data && reparsed.data.length ? reparsed.data : rawData
}

function numericColumnsFromTypedValues(data, columns) {
  const out = []
  for (const col of columns || []) {
    let foundNumber = false
    for (let i = 0; i < (data?.length || 0); i++) {
      const v = data[i]?.[col]
      if (typeof v === 'number' && Number.isFinite(v)) {
        foundNumber = true
        break
      }
    }
    if (foundNumber) out.push(col)
  }
  return out
}

function dedupeHeaders(headers) {
  const seen = new Map()
  return headers.map((h, idx) => {
    const base = String(h || '').trim() || `Column ${idx + 1}`
    const count = (seen.get(base) || 0) + 1
    seen.set(base, count)
    return count === 1 ? base : `${base} (${count})`
  })
}

function normalizeExcelCellValue(v) {
  if (v === null || v === undefined) return ''
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'object') {
    // ExcelJS may return rich objects: { text, hyperlink }, { formula, result }, { richText: [...] }
    if (typeof v.text === 'string') return v.text
    if (typeof v.hyperlink === 'string') return v.text || v.hyperlink
    if (Object.prototype.hasOwnProperty.call(v, 'result')) return normalizeExcelCellValue(v.result)
    if (Array.isArray(v.richText)) return v.richText.map((r) => r?.text || '').join('')
    try {
      return JSON.stringify(v)
    } catch (_) {
      return String(v)
    }
  }
  return String(v)
}

async function parseXlsxWithExcelJS(filePath) {
  const workbook = new ExcelJS.Workbook()
  // ExcelJS supports .xlsx. (We intentionally do not support legacy .xls here.)
  await workbook.xlsx.readFile(filePath)
  const worksheet = workbook.worksheets?.[0]
  if (!worksheet) return []

  // Read headers from first row
  const headerRow = worksheet.getRow(1)
  const rawHeaders = []
  const maxCol = Math.max(worksheet.columnCount || 0, (headerRow?.cellCount || 0))
  for (let c = 1; c <= maxCol; c++) {
    rawHeaders.push(normalizeExcelCellValue(headerRow.getCell(c).value))
  }
  const headers = dedupeHeaders(rawHeaders)

  const out = []
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return
    const obj = {}
    for (let c = 1; c <= headers.length; c++) {
      const key = headers[c - 1]
      const cell = row.getCell(c)
      obj[key] = normalizeExcelCellValue(cell?.value)
    }
    out.push(obj)
  })
  return out
}

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

const FILE_SIZE_LIMIT_MB = 500
const upload = multer({
  storage: storage,
  limits: { fileSize: FILE_SIZE_LIMIT_MB * 1024 * 1024 }, // 500MB (actual limit may be enforced by usageLimits per plan)
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json',
      'application/pdf',
      'application/octet-stream', // browser may send this for .json/.pdf
    ]
    const ext = (path.extname(file.originalname) || '').toLowerCase()
    const allowedExt = ['.csv', '.xlsx', '.xls', '.json', '.pdf']
    const mimeOk = allowedMimes.includes(file.mimetype)
    const extOk = allowedExt.includes(ext)
    if (mimeOk || extOk) {
      cb(null, true)
    } else {
      cb(new Error('Allowed: CSV, Excel (.xlsx), JSON, or PDF'))
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
  // Use async/await pattern to properly handle the async middleware
  ;(async () => {
    try {
      await checkUploadLimit(req, res, wrappedNext)
    } catch (err) {
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
    }
  })()
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

    // Parse file based on extension (engine accepts any tabular data)
    if (fileExt === '.csv') {
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      const parsed = parseCsvWithFallback(fileContent)
      rawData = unpackSingleColumnCsvLines(parsed.data) || parsed.data
    } else if (fileExt === '.xlsx') {
      rawData = await parseXlsxWithExcelJS(filePath)
      rawData = maybeReparseSingleColumnCsvFromXlsx(rawData)
      rawData = unpackSingleColumnCsvLines(rawData) || rawData
    } else if (fileExt === '.json') {
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      let parsed
      try {
        parsed = JSON.parse(fileContent)
      } catch (err) {
        fs.unlinkSync(filePath)
        return res.status(400).json({ error: 'Invalid JSON', message: err.message })
      }
      if (Array.isArray(parsed)) {
        rawData = parsed
      } else if (parsed && Array.isArray(parsed.data)) {
        rawData = parsed.data
      } else if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        rawData = [parsed]
      } else {
        fs.unlinkSync(filePath)
        return res.status(400).json({ error: 'JSON must be an array of objects or { data: [...] }' })
      }
      rawData = rawData.filter((row) => row && typeof row === 'object' && !Array.isArray(row))
    } else if (fileExt === '.pdf') {
      try {
        const dataBuffer = fs.readFileSync(filePath)
        if (typeof pdfParse !== 'function') {
          fs.unlinkSync(filePath)
          return res.status(500).json({
            error: 'PDF parsing not available',
            message: 'Server configuration error: pdf-parse is not loaded. Please contact support.'
          })
        }
        const pdfData = await pdfParse(dataBuffer)
        const text = (pdfData && pdfData.text) ? String(pdfData.text) : ''
        rawData = pdfTextToRows(text)
        if (rawData.length === 0) {
          fs.unlinkSync(filePath)
          return res.status(400).json({
            error: 'No tabular data in PDF',
            message: 'Could not find a table in the PDF. PDFs with text tables (e.g. exported from Excel as PDF) work best.'
          })
        }
      } catch (pdfErr) {
        if (req.file && fs.existsSync(filePath)) fs.unlinkSync(filePath)
        const msg = pdfErr && (pdfErr.message || String(pdfErr))
        console.error('PDF upload error:', msg)
        return res.status(400).json({
          error: 'PDF could not be read',
          message: msg && msg.length < 200 ? msg : 'The PDF may be encrypted, image-only, or corrupted. Try a PDF that contains selectable text (e.g. exported from Excel).'
        })
      }
    } else if (fileExt === '.xls') {
      fs.unlinkSync(filePath) // Clean up
      return res.status(400).json({
        error: 'Unsupported Excel format',
        message: 'Legacy .xls files are not supported. Please re-save as .xlsx and try again.'
      })
    } else {
      fs.unlinkSync(filePath) // Clean up
      return res.status(400).json({ error: 'Unsupported file format. Use CSV, Excel (.xlsx), JSON, or PDF.' })
    }

    if (rawData.length === 0) {
      fs.unlinkSync(filePath) // Clean up
      return res.status(400).json({ error: 'File is empty or could not be parsed' })
    }

    const columns = Object.keys(rawData[0])
 
    // 1) Normalize + infer numeric columns, then convert cells to actual numbers.
    const {
      data: processedData,
      numericColumns: inferredNumericColumns,
      numericInference,
    } = inferNumericColumnsAndConvert(rawData, columns, {
      // Default threshold: 70% of non-null-like values must parse as numbers
      threshold: 0.7,
      evaluationRowLimit: 5000,
      minNonNullValues: 2,
      allowParensNegative: true,
    })
 
    // 2) Detect date/categorical types AFTER numeric conversion.
    //    We reuse the existing heuristic detector (it handles date columns and year-like columns).
    const detected = detectColumnTypes(processedData, columns)
    const dateColumns = detected.dateColumns || []

    // 3) Numeric detection AFTER conversion (JS equivalent of pandas select_dtypes(include=["number"])).
    //    Then exclude date columns (e.g. Year) from numeric measures.
    const numericColumnsAfter = numericColumnsFromTypedValues(processedData, columns)
      .filter((c) => !dateColumns.includes(c))

    // Keep the inference list for debug/explanations, but use post-conversion numeric columns for the app.
    const numericColumns = numericColumnsAfter
    const categoricalColumns = (columns || []).filter((c) => !numericColumns.includes(c) && !dateColumns.includes(c))
 
    // 4) Validation payload for the UI (helps explain "no charts" failures).
    const validation = validateData(processedData, columns, numericColumns, categoricalColumns, dateColumns)

    // Clean up uploaded file
    fs.unlinkSync(filePath)
 
    // Debug: log numeric detection (helpful for sample fixtures + troubleshooting)
    if (process.env.NODE_ENV !== 'production') {
      console.log('[upload] inferred numericColumns (threshold-based):', inferredNumericColumns)
      console.log('[upload] numericColumns (post-conversion types):', numericColumns)
    }

    res.json({
      data: processedData,
      columns: columns,
      numericColumns,
      categoricalColumns,
      dateColumns,
      rowCount: processedData.length,
      numericInference,
      validation,
    })
  } catch (error) {
    console.error('Upload error:', error)
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path) // Clean up on error
    }
    res.status(500).json({ error: error.message || 'Failed to process file' })
  }
})

// Handle multer file size limit (multer calls next(err) before route handler runs)
router.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: `File size limit exceeded (max ${FILE_SIZE_LIMIT_MB} MB)` })
  }
  next(err)
})

module.exports = router


