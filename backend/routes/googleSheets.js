const express = require('express')
const rateLimit = require('express-rate-limit')
const { detectColumnTypes } = require('../controllers/dataProcessor')
const { validateData } = require('../controllers/dataValidator')
const { inferNumericColumnsAndConvert } = require('../utils/numericInference')
const { parseCsvWithFallback, unpackSingleColumnCsvLines } = require('../utils/uploadParsing')

let fetchImpl = global.fetch
try {
  // node-fetch is optional in newer Node runtimes; global fetch is available in Node 18+.
  // eslint-disable-next-line global-require
  const nodeFetch = require('node-fetch')
  fetchImpl = nodeFetch.default || nodeFetch
} catch (_) {}

const router = express.Router()

const googleSheetsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many Google Sheets imports',
    message: 'Please wait a few minutes before importing another Google Sheet.',
  },
})

const PRIVATE_SHEET_MESSAGE = 'Could not access this sheet. Make sure it is set to Anyone with the link can view in Google Sheets sharing settings.'

function parseGoogleSheetsUrl(rawUrl) {
  let parsed
  try {
    parsed = new URL(String(rawUrl || '').trim())
  } catch (_) {
    const err = new Error('Please paste a Google Sheets link (docs.google.com/spreadsheets/...)')
    err.code = 'INVALID_GOOGLE_SHEETS_URL'
    throw err
  }

  if (parsed.hostname !== 'docs.google.com' || !parsed.pathname.includes('/spreadsheets/d/')) {
    const err = new Error('Please paste a Google Sheets link (docs.google.com/spreadsheets/...)')
    err.code = 'INVALID_GOOGLE_SHEETS_URL'
    throw err
  }

  const match = parsed.pathname.match(/\/spreadsheets\/d\/([^/]+)/)
  const sheetId = match?.[1]
  if (!sheetId) {
    const err = new Error('Please paste a Google Sheets link (docs.google.com/spreadsheets/...)')
    err.code = 'INVALID_GOOGLE_SHEETS_URL'
    throw err
  }

  const hashGid = parsed.hash.match(/gid=(\d+)/)?.[1]
  const gid = parsed.searchParams.get('gid') || hashGid || '0'
  return { sheetId, gid }
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

function hasUsableHeaders(columns) {
  if (!Array.isArray(columns) || columns.length === 0) return false
  return columns.some((column) => {
    const value = String(column || '').trim()
    return value && !/^(__parsed_extra|field_\d+|column\s*\d+)$/i.test(value)
  })
}

function buildUploadShape(rawRows) {
  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    const err = new Error('This sheet appears to be empty.')
    err.code = 'EMPTY_SHEET'
    throw err
  }

  const columns = Object.keys(rawRows[0] || {}).map((column) => String(column || '').trim()).filter(Boolean)
  if (!hasUsableHeaders(columns)) {
    const err = new Error('Your sheet needs column headers in the first row.')
    err.code = 'NO_HEADERS'
    throw err
  }

  const {
    data: processedData,
    numericColumns: inferredNumericColumns,
    numericInference,
  } = inferNumericColumnsAndConvert(rawRows, columns, {
    threshold: 0.7,
    evaluationRowLimit: 5000,
    minNonNullValues: 2,
    allowParensNegative: true,
  })

  const detected = detectColumnTypes(processedData, columns)
  const dateColumns = detected.dateColumns || []
  const numericColumns = numericColumnsFromTypedValues(processedData, columns)
    .filter((column) => !dateColumns.includes(column))
  const categoricalColumns = (columns || []).filter((column) => !numericColumns.includes(column) && !dateColumns.includes(column))
  const validation = validateData(processedData, columns, numericColumns, categoricalColumns, dateColumns)

  if (process.env.NODE_ENV !== 'production') {
    console.log('[google-sheets] inferred numericColumns (threshold-based):', inferredNumericColumns)
    console.log('[google-sheets] numericColumns (post-conversion types):', numericColumns)
  }

  return {
    data: processedData,
    columns,
    numericColumns,
    categoricalColumns,
    dateColumns,
    rowCount: processedData.length,
    numericInference,
    validation,
  }
}

function looksLikePrivateOrHtml(contentType, text) {
  const sample = String(text || '').trim().slice(0, 300).toLowerCase()
  return (
    contentType.includes('text/html') ||
    sample.startsWith('<!doctype html') ||
    sample.startsWith('<html') ||
    sample.includes('<title>google sheets') ||
    sample.includes('accounts.google.com')
  )
}

router.post('/google-sheets', googleSheetsLimiter, async (req, res) => {
  const { url } = req.body || {}

  try {
    const { sheetId, gid } = parseGoogleSheetsUrl(url)
    const exportUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/export?format=csv&gid=${encodeURIComponent(gid)}`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)

    let response
    try {
      response = await fetchImpl(exportUrl, {
        signal: controller.signal,
        headers: {
          Accept: 'text/csv,text/plain,*/*',
        },
      })
    } catch (error) {
      if (error?.name === 'AbortError') {
        const err = new Error('Could not reach Google Sheets. Please try again.')
        err.code = 'GOOGLE_SHEETS_TIMEOUT'
        throw err
      }
      const err = new Error(PRIVATE_SHEET_MESSAGE)
      err.code = 'PRIVATE_SHEET'
      throw err
    } finally {
      clearTimeout(timer)
    }

    const contentType = String(response.headers.get('content-type') || '').toLowerCase()
    const text = await response.text()

    if (!response.ok || looksLikePrivateOrHtml(contentType, text)) {
      const err = new Error(PRIVATE_SHEET_MESSAGE)
      err.code = 'PRIVATE_SHEET'
      throw err
    }

    if (!String(text || '').trim()) {
      const err = new Error('This sheet appears to be empty.')
      err.code = 'EMPTY_SHEET'
      throw err
    }

    const parsed = parseCsvWithFallback(text)
    const rawRows = unpackSingleColumnCsvLines(parsed.data) || parsed.data
    const payload = buildUploadShape(rawRows)
    return res.json(payload)
  } catch (error) {
    const status = error.code === 'INVALID_GOOGLE_SHEETS_URL' ? 400 : error.code === 'GOOGLE_SHEETS_TIMEOUT' ? 504 : 400
    return res.status(status).json({
      error: error.code || 'GOOGLE_SHEETS_IMPORT_FAILED',
      message: error.message || PRIVATE_SHEET_MESSAGE,
    })
  }
})

module.exports = router
