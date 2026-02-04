/**
 * Data Validation and Recommendation System
 * Analyzes uploaded data and provides recommendations for improvement
 */

function validateData(data, columns, numericColumns, categoricalColumns, dateColumns) {
  const recommendations = []
  const warnings = []
  const errors = []
  
  // Check if data is empty
  if (!data || data.length === 0) {
    errors.push({
      type: 'empty',
      message: 'Your file is empty or contains no data rows.',
      suggestion: 'Please ensure your file has at least one row of data (excluding headers).'
    })
    return { isValid: false, errors, warnings, recommendations }
  }
  
  // Check if we have columns
  if (!columns || columns.length === 0) {
    errors.push({
      type: 'no_columns',
      message: 'No columns detected in your file.',
      suggestion: 'Please ensure your file has a header row with column names.'
    })
    return { isValid: false, errors, warnings, recommendations }
  }
  
  // Check for numeric columns (critical for charts)
  if (numericColumns.length === 0) {
    warnings.push({
      type: 'no_numeric',
      severity: 'high',
      message: 'No numeric columns detected. Charts require at least one numeric column.',
      suggestion: 'Add a column with numbers (e.g., Sales, Amount, Quantity, Price, Count).',
      examples: [
        { before: 'Sales: "$1,200"', after: 'Sales: 1200' },
        { before: 'Amount: "€500"', after: 'Amount: 500' },
        { before: 'Price: "$99.99"', after: 'Price: 99.99' }
      ],
      fixSteps: [
        'Remove currency symbols ($, €, £) from numbers',
        'Remove commas from numbers (1,200 → 1200)',
        'Ensure numbers are actual numbers, not text',
        'Add a column with counts or quantities if you have categories'
      ]
    })
  }
  
  // Check for date columns (optional but recommended for time-based analysis)
  if (dateColumns.length === 0) {
    recommendations.push({
      type: 'no_date',
      severity: 'low',
      message: 'No date columns detected. Adding dates enables time-based analysis and trends.',
      suggestion: 'Add a date column (e.g., Date, Created At, Transaction Date).',
      examples: [
        { format: 'YYYY-MM-DD', example: '2024-01-15' },
        { format: 'MM/DD/YYYY', example: '01/15/2024' },
        { format: 'Year only', example: '2024' }
      ]
    })
  }
  
  // Check for categorical columns (optional but useful for grouping)
  if (categoricalColumns.length === 0 && numericColumns.length > 0) {
    recommendations.push({
      type: 'no_categorical',
      severity: 'low',
      message: 'No categorical columns detected. Categories help group and compare data.',
      suggestion: 'Add a category column (e.g., Product, Region, Department, Status).'
    })
  }
  
  // Check for columns that might be numeric but are detected as categorical
  columns.forEach(column => {
    if (!numericColumns.includes(column) && !dateColumns.includes(column)) {
      // Sample values to check if they might be numeric
      const sampleValues = data.slice(0, 20).map(row => row[column]).filter(v => v !== null && v !== undefined && v !== '')
      
      if (sampleValues.length > 0) {
        const numericLikeCount = sampleValues.filter(val => {
          const str = String(val).trim()
          // Check if it looks like a number with currency or formatting
          const cleaned = str.replace(/[$,\s€£¥]/g, '')
          return !isNaN(parseFloat(cleaned)) && isFinite(parseFloat(cleaned))
        }).length
        
        const numericRatio = numericLikeCount / sampleValues.length
        
        if (numericRatio > 0.5 && numericRatio < 0.7) {
          warnings.push({
            type: 'potential_numeric',
            severity: 'medium',
            column: column,
            message: `Column "${column}" might contain numbers but is detected as text.`,
            suggestion: `Remove currency symbols, commas, or spaces from "${column}" to enable numeric analysis.`,
            examples: sampleValues.slice(0, 3).map(v => ({
              before: String(v),
              after: String(v).replace(/[$,\s€£¥]/g, '')
            }))
          })
        }
      }
    }
  })
  
  // Check for columns that might be dates but are detected as categorical
  columns.forEach(column => {
    if (!dateColumns.includes(column)) {
      const columnLower = String(column).toLowerCase()
      const isLikelyDateColumn = columnLower.includes('date') || 
                                 columnLower.includes('time') ||
                                 columnLower.includes('created') ||
                                 columnLower.includes('updated')
      
      if (isLikelyDateColumn) {
        const sampleValues = data.slice(0, 10).map(row => row[column]).filter(v => v !== null && v !== undefined && v !== '')
        
        if (sampleValues.length > 0) {
          const dateLikeCount = sampleValues.filter(val => {
            const str = String(val).trim()
            return str.match(/^\d{4}-\d{2}-\d{2}/) || 
                   str.match(/^\d{1,2}\/\d{1,2}\/\d{4}/) ||
                   (/^\d{4}$/.test(str) && parseInt(str) >= 1900 && parseInt(str) <= 2100)
          }).length
          
          if (dateLikeCount < sampleValues.length * 0.5) {
            recommendations.push({
              type: 'potential_date',
              severity: 'medium',
              column: column,
              message: `Column "${column}" might contain dates but format is not recognized.`,
              suggestion: `Format dates as YYYY-MM-DD (e.g., 2024-01-15) or MM/DD/YYYY (e.g., 01/15/2024).`,
              examples: [
                { format: 'YYYY-MM-DD', example: '2024-01-15' },
                { format: 'MM/DD/YYYY', example: '01/15/2024' }
              ]
            })
          }
        }
      }
    }
  })
  
  // Check data quality
  if (data.length < 5) {
    warnings.push({
      type: 'small_dataset',
      severity: 'low',
      message: 'Your dataset has fewer than 5 rows. More data provides better insights.',
      suggestion: 'Consider adding more rows for more meaningful analysis.'
    })
  }
  
  // Check for empty columns
  columns.forEach(column => {
    const emptyCount = data.filter(row => !row[column] || row[column] === '' || row[column] === null).length
    const emptyRatio = emptyCount / data.length
    
    if (emptyRatio > 0.8) {
      warnings.push({
        type: 'mostly_empty_column',
        severity: 'medium',
        column: column,
        message: `Column "${column}" is mostly empty (${Math.round(emptyRatio * 100)}% empty).`,
        suggestion: 'Consider removing this column or filling in missing values.'
      })
    }
  })
  
  // Determine overall validity
  const isValid = errors.length === 0 && (numericColumns.length > 0 || warnings.length === 0)
  
  return {
    isValid,
    errors,
    warnings,
    recommendations,
    summary: {
      totalRows: data.length,
      totalColumns: columns.length,
      numericColumns: numericColumns.length,
      categoricalColumns: categoricalColumns.length,
      dateColumns: dateColumns.length
    }
  }
}

module.exports = {
  validateData
}

