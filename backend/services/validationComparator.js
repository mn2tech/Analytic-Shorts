const { compareValues, normalizeValue } = require('./validationRulesEngine')
const { compareSchemas } = require('./validationSchemaProfiler')

function toKey(row, keyColumns) {
  return keyColumns.map((col) => {
    const value = row?.[col]
    return value === null || value === undefined ? '__NULL__' : String(value)
  }).join('||')
}

function indexByKey(rows, keyColumns) {
  const map = new Map()
  const duplicates = []
  for (const row of rows) {
    const key = toKey(row, keyColumns)
    if (!map.has(key)) {
      map.set(key, row)
    } else {
      duplicates.push({ key, row })
    }
  }
  return { map, duplicates }
}

function compareDatasets(sourceRows = [], targetRows = [], keyColumns = [], options = {}) {
  if (!Array.isArray(sourceRows) || !Array.isArray(targetRows)) {
    throw new Error('Source and target datasets must be arrays of objects.')
  }
  if (!Array.isArray(keyColumns) || keyColumns.length === 0) {
    throw new Error('At least one business key column is required.')
  }

  const schema = compareSchemas(sourceRows, targetRows)
  const sourceIndex = indexByKey(sourceRows, keyColumns)
  const targetIndex = indexByKey(targetRows, keyColumns)
  const commonColumns = schema.sourceProfile.columns.filter((c) => schema.targetProfile.columns.includes(c))

  let matchedRows = 0
  let mismatchedRows = 0
  const columnMismatches = {}
  const sampleMismatchedRows = []
  const missingInTarget = []
  const missingInSource = []

  for (const [key, sourceRow] of sourceIndex.map.entries()) {
    const targetRow = targetIndex.map.get(key)
    if (!targetRow) {
      missingInTarget.push({ key, row: sourceRow })
      continue
    }

    let rowMismatch = false
    const mismatchDetails = []
    for (const column of commonColumns) {
      if (keyColumns.includes(column)) continue
      const result = compareValues(sourceRow[column], targetRow[column], options)
      if (!result.match) {
        rowMismatch = true
        columnMismatches[column] = (columnMismatches[column] || 0) + 1
        mismatchDetails.push({
          column,
          source: normalizeValue(sourceRow[column], options),
          target: normalizeValue(targetRow[column], options),
          reason: result.reason,
          delta: result.delta,
        })
      }
    }

    if (rowMismatch) {
      mismatchedRows += 1
      if (sampleMismatchedRows.length < 25) {
        sampleMismatchedRows.push({ key, mismatchDetails, sourceRow, targetRow })
      }
    } else {
      matchedRows += 1
    }
  }

  for (const [key, targetRow] of targetIndex.map.entries()) {
    if (!sourceIndex.map.has(key)) {
      missingInSource.push({ key, row: targetRow })
    }
  }

  const comparedRows = matchedRows + mismatchedRows
  const denominator = comparedRows + missingInTarget.length + missingInSource.length
  const matchPercentage = denominator > 0 ? Number(((matchedRows / denominator) * 100).toFixed(2)) : 0

  return {
    rowCountSource: sourceRows.length,
    rowCountTarget: targetRows.length,
    duplicateKeysSource: sourceIndex.duplicates,
    duplicateKeysTarget: targetIndex.duplicates,
    matchedRows,
    mismatchedRows,
    missingInTarget,
    missingInSource,
    schemaIssues: schema.schemaIssues,
    columnMismatches,
    sampleMismatchedRows,
    matchPercentage,
  }
}

module.exports = {
  compareDatasets,
}
