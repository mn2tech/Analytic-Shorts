/**
 * Forecasting utilities for time series prediction
 * Uses linear regression and moving averages for predictions
 */

/**
 * Calculate linear regression coefficients
 * Returns { slope, intercept, rSquared }
 */
export const calculateLinearRegression = (data) => {
  if (!data || data.length < 2) return null

  const n = data.length
  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumXX = 0
  let sumYY = 0

  data.forEach((point, index) => {
    const x = index
    const y = point.value
    sumX += x
    sumY += y
    sumXY += x * y
    sumXX += x * x
    sumYY += y * y
  })

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  // Calculate R-squared (coefficient of determination)
  const yMean = sumY / n
  let ssRes = 0
  let ssTot = 0

  data.forEach((point, index) => {
    const y = point.value
    const predicted = slope * index + intercept
    ssRes += Math.pow(y - predicted, 2)
    ssTot += Math.pow(y - yMean, 2)
  })

  const rSquared = 1 - (ssRes / ssTot)

  return { slope, intercept, rSquared }
}

/**
 * Calculate moving average
 */
export const calculateMovingAverage = (data, windowSize = 3) => {
  if (!data || data.length === 0) return []

  const result = []
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - windowSize + 1)
    const end = i + 1
    const window = data.slice(start, end)
    const avg = window.reduce((sum, p) => sum + p.value, 0) / window.length
    result.push({ ...data[i], value: avg })
  }
  return result
}

/**
 * Generate forecasted values using linear regression
 * @param {Array} historicalData - Array of { date, value } objects
 * @param {number} periods - Number of future periods to forecast
 * @returns {Array} Forecasted data points
 */
export const generateForecast = (historicalData, periods = 6) => {
  if (!historicalData || historicalData.length < 2) return []

  const regression = calculateLinearRegression(historicalData)
  if (!regression) return []

  const forecast = []
  const lastIndex = historicalData.length - 1
  const lastValue = historicalData[lastIndex].value
  const lastDate = new Date(historicalData[lastIndex].date)

  // Calculate average time difference for date increment
  let avgDaysDiff = 1
  if (historicalData.length > 1) {
    const diffs = []
    for (let i = 1; i < historicalData.length; i++) {
      const diff = new Date(historicalData[i].date) - new Date(historicalData[i - 1].date)
      diffs.push(diff / (1000 * 60 * 60 * 24)) // Convert to days
    }
    avgDaysDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length
  }

  for (let i = 1; i <= periods; i++) {
    const futureIndex = lastIndex + i
    const predictedValue = regression.slope * futureIndex + regression.intercept

    // Calculate confidence interval (simplified - uses standard error)
    const residuals = historicalData.map((point, idx) => {
      const predicted = regression.slope * idx + regression.intercept
      return Math.pow(point.value - predicted, 2)
    })
    const mse = residuals.reduce((a, b) => a + b, 0) / residuals.length
    const standardError = Math.sqrt(mse)
    const confidenceInterval = 1.96 * standardError * Math.sqrt(1 + 1 / historicalData.length + Math.pow(futureIndex - (historicalData.length - 1) / 2, 2) / historicalData.length)

    // Calculate future date
    const futureDate = new Date(lastDate)
    futureDate.setDate(futureDate.getDate() + avgDaysDiff * i)

    forecast.push({
      date: futureDate.toISOString().split('T')[0],
      value: Math.max(0, predictedValue), // Don't allow negative values
      upperBound: Math.max(0, predictedValue + confidenceInterval),
      lowerBound: Math.max(0, predictedValue - confidenceInterval),
      isForecast: true
    })
  }

  return forecast
}

/**
 * Combine historical and forecasted data
 */
export const combineHistoricalAndForecast = (historicalData, forecastData) => {
  return [
    ...historicalData.map(point => ({ ...point, isForecast: false })),
    ...forecastData
  ]
}

/**
 * Calculate trend direction and strength
 */
export const analyzeTrend = (data) => {
  if (!data || data.length < 2) return { direction: 'neutral', strength: 0 }

  const regression = calculateLinearRegression(data)
  if (!regression) return { direction: 'neutral', strength: 0 }

  const direction = regression.slope > 0 ? 'upward' : regression.slope < 0 ? 'downward' : 'neutral'
  const strength = Math.abs(regression.slope) * 100 // Simplified strength metric
  const confidence = regression.rSquared

  return { direction, strength, confidence, slope: regression.slope }
}

/**
 * Detect seasonality (simplified - checks for repeating patterns)
 */
export const detectSeasonality = (data, period = 7) => {
  if (!data || data.length < period * 2) return null

  // Simple seasonality detection - compare values at same position in different periods
  const seasonalStrength = []
  for (let i = 0; i < period; i++) {
    const values = []
    for (let j = i; j < data.length; j += period) {
      values.push(data[j].value)
    }
    if (values.length > 1) {
      const variance = calculateVariance(values)
      seasonalStrength.push(variance)
    }
  }

  const avgVariance = seasonalStrength.reduce((a, b) => a + b, 0) / seasonalStrength.length
  return avgVariance
}

const calculateVariance = (values) => {
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  return variance
}




