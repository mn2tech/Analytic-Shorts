const Papa = require('papaparse')

function parseCsvContent(fileContent, { delimiter } = {}) {
  const parsed = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => String(header || '').trim(),
    ...(delimiter ? { delimiter } : {}),
  })
  const data = (parsed.data || []).filter((row) => row && Object.keys(row).length > 0)
  return { data, meta: parsed.meta, errors: parsed.errors || [] }
}

/**
 * If delimiter auto-detection fails, Papa can return a single "column" whose name contains separators.
 * Retry with better delimiter guesses.
 */
function parseCsvWithFallback(fileContent) {
  const first = parseCsvContent(fileContent)
  if (!first.data.length) return first

  const firstRow = first.data[0]
  const cols = Object.keys(firstRow || {})
  if (cols.length !== 1) return first

  const onlyHeader = cols[0] || ''
  // If we only got one column but the header itself contains separators,
  // delimiter detection or quoting likely went wrong. Force common delimiters.
  if (onlyHeader.includes(',')) {
    const forced = parseCsvContent(fileContent, { delimiter: ',' })
    if (forced.data.length && Object.keys(forced.data[0] || {}).length > 1) return forced
  }
  if (onlyHeader.includes(';')) {
    const forced = parseCsvContent(fileContent, { delimiter: ';' })
    if (forced.data.length && Object.keys(forced.data[0] || {}).length > 1) return forced
  }
  if (onlyHeader.includes('\t')) {
    const forced = parseCsvContent(fileContent, { delimiter: '\t' })
    if (forced.data.length && Object.keys(forced.data[0] || {}).length > 1) return forced
  }

  return first
}

/**
 * Some "CSV" exports put the entire header line into one cell and each row into one cell.
 * That produces data like:
 *   [{ "a,b,c": "1,2,3" }, { "a,b,c": "4,5,6" }]
 * Detect and unpack into:
 *   [{ a:"1", b:"2", c:"3" }, ...]
 */
function unpackSingleColumnCsvLines(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return null
  const cols = Object.keys(rows[0] || {})
  if (cols.length !== 1) return null
  const key = cols[0] || ''
  if (!key.includes(',')) return null

  const headers = key.split(',').map((h) => String(h || '').trim()).filter(Boolean)
  if (headers.length < 2) return null

  // Ensure row values look like CSV lines (contain commas).
  const sampleVals = rows.slice(0, 5).map((r) => r?.[key]).filter((v) => v !== null && v !== undefined && String(v).trim() !== '')
  if (sampleVals.length === 0) return null
  const looksLikeLines = sampleVals.some((v) => String(v).includes(','))
  if (!looksLikeLines) return null

  const out = []
  for (const r of rows) {
    const lineVal = r?.[key]
    const lineStr = lineVal === null || lineVal === undefined ? '' : String(lineVal).trim()
    const parsedLine = Papa.parse(lineStr, { delimiter: ',', skipEmptyLines: true })
    const cells = (parsedLine.data && parsedLine.data[0]) ? parsedLine.data[0] : []
    const obj = {}
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = cells[i] !== undefined ? cells[i] : ''
    }
    out.push(obj)
  }
  return out
}

module.exports = {
  parseCsvWithFallback,
  unpackSingleColumnCsvLines,
}

