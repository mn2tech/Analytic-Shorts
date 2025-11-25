const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const Papa = require('papaparse')
const XLSX = require('xlsx')
const { detectColumnTypes, processData } = require('../controllers/dataProcessor')

const router = express.Router()

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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
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

router.post('/', upload.single('file'), async (req, res) => {
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

