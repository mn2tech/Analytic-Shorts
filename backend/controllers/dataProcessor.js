function detectColumnTypes(data, columns) {
  const numericColumns = []
  const categoricalColumns = []
  const dateColumns = []

  columns.forEach((column) => {
    const sampleSize = Math.min(100, data.length)
    let numericCount = 0
    let dateCount = 0
    let nonEmptyCount = 0
    
    // Check if column name suggests it's a date/year column
    const columnLower = String(column).toLowerCase()
    const isLikelyDateColumn = columnLower.includes('year') || 
                               columnLower.includes('date') || 
                               columnLower.includes('time') ||
                               columnLower.includes('month') ||
                               columnLower.includes('day')

    for (let i = 0; i < sampleSize; i++) {
      const value = data[i][column]
      if (value === null || value === undefined || value === '') continue

      nonEmptyCount++

      // Check if date FIRST (prioritize date detection)
      const valueStr = String(value).trim()
      
      // Check for standard date formats: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY
      const isStandardDate = valueStr.match(/^\d{4}-\d{2}-\d{2}/) || 
                            valueStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}/) ||
                            valueStr.match(/^\d{4}\/\d{1,2}\/\d{1,2}/)
      
      // Check for year-only format (4-digit number between 1900-2100)
      // Also check if it's a numeric value that looks like a year
      const numValue = parseFloat(valueStr)
      const isYearOnly = /^\d{4}$/.test(valueStr) && 
                        !isNaN(numValue) &&
                        numValue >= 1900 && 
                        numValue <= 2100
      
      // If column name suggests date/year, be more lenient with year detection
      const isYearLike = isLikelyDateColumn && 
                        !isNaN(numValue) && 
                        numValue >= 1900 && 
                        numValue <= 2100 &&
                        String(numValue).length === 4
      
      if (isStandardDate || isYearOnly || isYearLike) {
        // Try to create a date - for years, use January 1st
        let dateValue
        if (isYearOnly || isYearLike) {
          dateValue = new Date(parseInt(valueStr), 0, 1) // January 1st of that year
        } else {
          dateValue = new Date(value)
        }
        if (!isNaN(dateValue.getTime())) {
          dateCount++
        }
      }

      // Check if numeric (handle currency symbols, commas, etc.)
      // Only count as numeric if it's NOT a year
      if (!isYearOnly && !isYearLike) {
        const cleanedValue = valueStr.replace(/[$,\s]/g, '') // Remove $, commas, spaces
        const cleanedNumValue = parseFloat(cleanedValue)
        if (!isNaN(cleanedNumValue) && isFinite(cleanedNumValue)) {
          numericCount++
        }
      }
    }

    if (nonEmptyCount === 0) {
      categoricalColumns.push(column)
      return
    }

    const numericRatio = numericCount / nonEmptyCount
    const dateRatio = dateCount / nonEmptyCount

    // Prioritize date detection - if it looks like a date column by name or content, classify as date
    if (isLikelyDateColumn && dateRatio > 0.3) {
      // If column name suggests date and at least 30% are valid dates, treat as date
      dateColumns.push(column)
    } else if (dateRatio > 0.5) {
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





