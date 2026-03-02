/**
 * Backend forecasting module.
 * Port of src/utils/forecasting.js for use in executePlan ForecastBlock.
 */

function calculateLinearRegression(data) {
  if (!data || data.length < 2) return null

  const n = data.length
  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumXX = 0
  let sumYY = 0

  data.forEach((point, index) => {
    const x = index
    const y = typeof point.value === 'number' ? point.value : (point.sum ?? point.count ?? 0)
    sumX += x
    sumY += y
    sumXY += x * y
    sumXX += x * x
    sumYY += y * y
  })

  const denom = n * sumXX - sumX * sumX
  if (denom === 0) return null

  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n

  const yMean = sumY / n
  let ssRes = 0
  let ssTot = 0
  data.forEach((point, index) => {
    const y = typeof point.value === 'number' ? point.value : (point.sum ?? point.count ?? 0)
    const predicted = slope * index + intercept
    ssRes += Math.pow(y - predicted, 2)
    ssTot += Math.pow(y - yMean, 2)
  })
  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0

  return { slope, intercept, rSquared }
}

/**
 * Generate forecast from time series data.
 * @param {Array<{t: string, sum?: number, count?: number, value?: number}>} series - Time series (t = period key)
 * @param {number} periods - Number of future periods
 * @returns {{ forecast: Array, trend: { direction: string, slope: number, confidence: number } }}
 */
function generateForecastFromSeries(series, periods = 6) {
  if (!Array.isArray(series) || series.length < 2) {
    return { forecast: [], trend: { direction: 'neutral', slope: 0, confidence: 0 } }
  }

  const data = series.map((s) => ({
    value: Number(s.sum ?? s.count ?? s.value ?? 0),
    date: s.t,
  }))

  const regression = calculateLinearRegression(data)
  if (!regression) {
    return { forecast: [], trend: { direction: 'neutral', slope: 0, confidence: 0 } }
  }

  const lastIndex = data.length - 1
  const lastValue = data[lastIndex].value
  const lastDateStr = data[lastIndex].date

  // Parse last date for incrementing
  let lastDate
  try {
    lastDate = new Date(lastDateStr)
    if (Number.isNaN(lastDate.getTime())) lastDate = new Date()
  } catch {
    lastDate = new Date()
  }

  // Average time diff (days)
  let avgDaysDiff = 1
  if (data.length > 1) {
    const diffs = []
    for (let i = 1; i < data.length; i++) {
      let prev, curr
      try {
        prev = new Date(data[i - 1].date)
        curr = new Date(data[i].date)
      } catch {
        continue
      }
      if (!Number.isNaN(prev.getTime()) && !Number.isNaN(curr.getTime())) {
        diffs.push((curr - prev) / 86400000)
      }
    }
    if (diffs.length > 0) {
      avgDaysDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length
    }
  }

  const forecast = []
  const residuals = data.map((point, idx) => {
    const predicted = regression.slope * idx + regression.intercept
    return Math.pow((point.value || 0) - predicted, 2)
  })
  const mse = residuals.reduce((a, b) => a + b, 0) / Math.max(1, residuals.length)
  const standardError = Math.sqrt(mse)

  for (let i = 1; i <= periods; i++) {
    const futureIndex = lastIndex + i
    const predictedValue = regression.slope * futureIndex + regression.intercept
    const ci = 1.96 * standardError * Math.sqrt(1 + 1 / data.length + Math.pow(futureIndex - (data.length - 1) / 2, 2) / data.length)

    const futureDate = new Date(lastDate)
    futureDate.setDate(futureDate.getDate() + avgDaysDiff * i)
    const dateStr = futureDate.toISOString().slice(0, 10)

    forecast.push({
      t: dateStr,
      sum: Math.max(0, predictedValue),
      upperBound: Math.max(0, predictedValue + ci),
      lowerBound: Math.max(0, predictedValue - ci),
      isForecast: true,
    })
  }

  const direction = regression.slope > 0 ? 'upward' : regression.slope < 0 ? 'downward' : 'neutral'

  return {
    forecast,
    trend: {
      direction,
      slope: regression.slope,
      confidence: Math.max(0, Math.min(1, regression.rSquared)),
      rSquared: regression.rSquared,
    },
  }
}

module.exports = {
  calculateLinearRegression,
  generateForecastFromSeries,
}
