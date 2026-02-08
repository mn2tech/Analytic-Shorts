import { parseNumericValue } from '../../utils/numberUtils'

/**
 * Detect column types from sample data for starter dashboard generation
 * @param {Array<Object>} data - Array of row objects
 * @returns {{ numeric: string[], categorical: string[], date: string[] }}
 */
export function detectColumnTypes(data) {
  if (!data || data.length === 0) return { numeric: [], categorical: [], date: [] }

  const columns = Object.keys(data[0] || {})
  const numeric = []
  const categorical = []
  const date = []

  columns.forEach((col) => {
    const values = data
      .slice(0, Math.min(100, data.length))
      .map((row) => row[col])
      .filter((v) => v !== null && v !== undefined && v !== '')

    if (values.length === 0) return

    const datePattern = /^\d{4}-\d{2}-\d{2}|^\d{2}\/\d{2}\/\d{4}/
    const isDate = values.some((v) => {
      const str = String(v)
      return datePattern.test(str) || !isNaN(Date.parse(str))
    })

    if (isDate) {
      date.push(col)
      return
    }

    const numericCount = values.filter((v) => {
      const num = parseNumericValue(v)
      return !isNaN(num) && isFinite(num)
    }).length

    if (numericCount / values.length > 0.8) {
      numeric.push(col)
    } else {
      categorical.push(col)
    }
  })

  return { numeric, categorical, date }
}
