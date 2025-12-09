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

      // Check if numeric (handle currency symbols, commas, etc.)
      const cleanedValue = String(value).replace(/[$,\s]/g, '') // Remove $, commas, spaces
      const numValue = parseFloat(cleanedValue)
      if (!isNaN(numValue) && isFinite(numValue)) {
        numericCount++
      }

      // Check if date
      const valueStr = String(value).trim()
      // Check for standard date formats: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY
      const isStandardDate = valueStr.match(/^\d{4}-\d{2}-\d{2}/) || 
                            valueStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}/) ||
                            valueStr.match(/^\d{4}\/\d{1,2}\/\d{1,2}/)
      
      // Check for year-only format (4-digit number between 1900-2100)
      const isYearOnly = /^\d{4}$/.test(valueStr) && 
                        parseInt(valueStr) >= 1900 && 
                        parseInt(valueStr) <= 2100
      
      if (isStandardDate || isYearOnly) {
        const dateValue = new Date(value)
        if (!isNaN(dateValue.getTime())) {
          dateCount++
        }
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





