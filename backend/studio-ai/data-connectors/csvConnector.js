const ExcelJS = require('exceljs')
const { parseCsvWithFallback, unpackSingleColumnCsvLines } = require('../../utils/uploadParsing')
const { inferSchema, normalizeRows, createCacheKey } = require('./normalizer')
const { getCached, setCached, recordSchema } = require('./cache')

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

async function parseXlsxBuffer(buffer) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const ws = workbook.worksheets?.[0]
  if (!ws) return []

  const headerRow = ws.getRow(1)
  const rawHeaders = []
  const maxCol = Math.max(ws.columnCount || 0, headerRow?.cellCount || 0)
  for (let c = 1; c <= maxCol; c++) {
    rawHeaders.push(normalizeExcelCellValue(headerRow.getCell(c).value))
  }
  const headers = dedupeHeaders(rawHeaders)

  const out = []
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
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

function resolveDataLakeDataset(datasetId) {
  try {
    const { getDatasetById } = require('../../routes/datalake')
    const id = String(datasetId || '').trim().replace(/^datalake:/, '')
    if (!id) return null
    return getDatasetById(id)
  } catch {
    return null
  }
}

/**
 * CSV/Excel connector.
 * Accepts:
 * - { buffer: Buffer, filename?: string }
 * - { datasetId: string } (expects a datalake dataset id; supports "datalake:<id>")
 */
async function csvConnector(input, opts = {}) {
  const cfg = input || {}

  const datasetId = cfg.datasetId ? String(cfg.datasetId).trim() : null
  const filename = cfg.filename ? String(cfg.filename) : ''
  const buffer = cfg.buffer

  const cacheKey = createCacheKey({ sourceType: 'csv', datasetId, filename, bufferLen: buffer?.length || 0 })
  const cached = getCached(cacheKey)
  if (cached) return cached

  let rawRows = null
  let sourceName = 'upload'

  if (datasetId) {
    const payload = resolveDataLakeDataset(datasetId)
    if (!payload || !Array.isArray(payload.data)) {
      throw new Error(`csvConnector: datasetId not found in datalake: ${datasetId}`)
    }
    rawRows = payload.data
    sourceName = `datalake:${String(datasetId).replace(/^datalake:/, '')}`
  } else {
    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new Error('csvConnector: buffer is required when datasetId is not provided')
    }
    const ext = filename.toLowerCase().endsWith('.xlsx')
      ? '.xlsx'
      : filename.toLowerCase().endsWith('.csv')
        ? '.csv'
        : null

    if (ext === '.xlsx') {
      rawRows = await parseXlsxBuffer(buffer)
      rawRows = unpackSingleColumnCsvLines(rawRows) || rawRows
      sourceName = filename || 'xlsx-upload'
    } else {
      // Default to CSV parsing (works for .csv and for plaintext buffers)
      const text = buffer.toString('utf-8')
      const parsed = parseCsvWithFallback(text)
      rawRows = unpackSingleColumnCsvLines(parsed.data) || parsed.data
      sourceName = filename || 'csv-upload'
    }
  }

  const rows = normalizeRows(rawRows, { rowLimit: opts.rowLimit || null })
  const schema = inferSchema(rows, { sampleRowLimit: opts.sampleRowLimit || 2000 })

  const drift = recordSchema(cacheKey, schema.map((c) => c.name))
  if (drift.changed) {
    console.warn('[studio-ai] schema drift detected (csv):', {
      sourceName,
      added: drift.added,
      removed: drift.removed,
    })
  }

  const canonical = {
    schema,
    rows,
    metadata: {
      sourceType: 'csv',
      sourceName,
      fetchedAt: new Date().toISOString(),
      rowCount: rows.length,
    },
  }

  setCached(cacheKey, canonical, { ttlMs: opts.cacheTtlMs })
  return canonical
}

module.exports = { csvConnector }

