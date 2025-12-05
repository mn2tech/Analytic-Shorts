function detectColumnTypes(data, columns) {
  const numericColumns = []
  const categoricalColumns = []
  const dateColumns = []

  columns.forEach((column) => {
    const sampleSize = Math.min(100, data.length)
    let numericCount = 0
    let dateCount = 0
    let nonEmptyCount = 0

    for (let i = 0; i < sampleSize; i++) {
      const value = data[i][column]
      if (value === null || value === undefined || value === '') continue

      nonEmptyCount++

      // Check if numeric
      const numValue = parseFloat(value)
      if (!isNaN(numValue) && isFinite(numValue)) {
        numericCount++
      }

      // Check if date
      const dateValue = new Date(value)
      if (!isNaN(dateValue.getTime()) && String(value).match(/^\d{4}-\d{2}-\d{2}/) || String(value).match(/\d{1,2}\/\d{1,2}\/\d{4}/)) {
        dateCount++
      }
    }

    if (nonEmptyCount === 0) {
      categoricalColumns.push(column)
      return
    }

    const numericRatio = numericCount / nonEmptyCount
    const dateRatio = dateCount / nonEmptyCount

    if (dateRatio > 0.5) {
      dateColumns.push(column)
    } else if (numericRatio > 0.7) {
      numericColumns.push(column)
    } else {
      categoricalColumns.push(column)
    }
  })

  return { numericColumns, categoricalColumns, dateColumns }
}

function processData(data) {
  return data.map((row) => {
    const processed = {}
    Object.keys(row).forEach((key) => {
      const value = row[key]
      // Clean up values
      if (value === null || value === undefined) {
        processed[key] = ''
      } else {
        processed[key] = String(value).trim()
      }
    })
    return processed
  })
}

module.exports = {
  detectColumnTypes,
  processData,
}





