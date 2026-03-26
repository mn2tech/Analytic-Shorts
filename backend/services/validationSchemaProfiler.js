function inferDataType(value) {
  if (value === null || value === undefined || value === '') return 'null'
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'float'
  if (typeof value === 'boolean') return 'boolean'
  if (value instanceof Date) return 'date'
  if (typeof value === 'string') {
    const n = Number(value)
    if (value.trim() !== '' && Number.isFinite(n)) return Number.isInteger(n) ? 'integer_like_string' : 'float_like_string'
    if (!Number.isNaN(Date.parse(value))) return 'date_like_string'
    return 'string'
  }
  return typeof value
}

function profileDataset(rows = []) {
  const data = Array.isArray(rows) ? rows : []
  const columns = data.length ? Object.keys(data[0]) : []
  const columnProfiles = columns.map((column) => {
    const typeCount = {}
    let nullCount = 0
    for (const row of data) {
      const t = inferDataType(row[column])
      typeCount[t] = (typeCount[t] || 0) + 1
      if (t === 'null') nullCount += 1
    }
    const dominantType = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown'
    return {
      column,
      dominantType,
      typeCount,
      nullCount,
      nonNullCount: data.length - nullCount,
    }
  })
  return { rowCount: data.length, columns, columnProfiles }
}

function compareSchemas(sourceRows = [], targetRows = []) {
  const sourceProfile = profileDataset(sourceRows)
  const targetProfile = profileDataset(targetRows)
  const sourceColumns = new Set(sourceProfile.columns)
  const targetColumns = new Set(targetProfile.columns)

  const missingInTarget = [...sourceColumns].filter((col) => !targetColumns.has(col))
  const missingInSource = [...targetColumns].filter((col) => !sourceColumns.has(col))

  const datatypeDifferences = []
  for (const sourceCol of sourceProfile.columnProfiles) {
    const targetCol = targetProfile.columnProfiles.find((c) => c.column === sourceCol.column)
    if (!targetCol) continue
    if (sourceCol.dominantType !== targetCol.dominantType) {
      datatypeDifferences.push({
        column: sourceCol.column,
        sourceType: sourceCol.dominantType,
        targetType: targetCol.dominantType,
      })
    }
  }

  return {
    sourceProfile,
    targetProfile,
    schemaIssues: [
      ...missingInTarget.map((column) => ({ type: 'missing_in_target', column })),
      ...missingInSource.map((column) => ({ type: 'missing_in_source', column })),
      ...datatypeDifferences.map((issue) => ({ type: 'datatype_mismatch', ...issue })),
    ],
    missingColumnsInTarget: missingInTarget,
    missingColumnsInSource: missingInSource,
    datatypeDifferences,
  }
}

module.exports = {
  profileDataset,
  compareSchemas,
}
