/**
 * External API routes: BLS unemployment, CDC health, Treasury government budget.
 */
const express = require('express')
const axios = require('axios')
const { detectColumnTypes, processDataPreservingNumbers } = require('../../controllers/dataProcessor')
const { BLS_CDC_CACHE_TTL_MS, AXIOS_TIMEOUT_MS } = require('./constants')

const router = express.Router()
const AX_TIMEOUT = AXIOS_TIMEOUT_MS

const blsCache = new Map()
const cdcCache = new Map()

// GET /unemployment - BLS with caching
router.get('/unemployment', async (req, res) => {
  try {
    const startYear = parseInt(req.query.start_year, 10) || new Date().getFullYear() - 5
    const endYear = parseInt(req.query.end_year, 10) || new Date().getFullYear()
    const blsApiKey = process.env.BLS_API_KEY || null

    const cacheKey = JSON.stringify({ startYear, endYear, hasKey: !!blsApiKey })
    const cached = blsCache.get(cacheKey)
    if (cached && Date.now() - cached.ts < BLS_CDC_CACHE_TTL_MS) {
      res.setHeader('X-Cache', 'HIT')
      return res.json(cached.payload)
    }
    res.setHeader('X-Cache', 'MISS')

    const apiUrl = 'https://api.bls.gov/publicAPI/v2/timeseries/data/'
    const seriesId = 'LNS14000000'
    const requestBody = {
      seriesid: [seriesId],
      startyear: startYear.toString(),
      endyear: endYear.toString(),
      ...(blsApiKey ? { registrationkey: blsApiKey } : {}),
    }

    const response = await axios.post(apiUrl, requestBody, {
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      timeout: AX_TIMEOUT,
      validateStatus: () => true,
    })

    const apiData = response.data
    if (apiData.status !== 'REQUEST_SUCCEEDED') {
      const errorMessage = apiData.message?.[0] || 'Unknown error from BLS API'
      return res.status(500).json({
        error: 'BLS API request failed',
        message: errorMessage,
        hint: 'Register at https://www.bls.gov/developers/api_signature_v2.htm',
        documentation: 'https://www.bls.gov/developers/api_signature_v2.htm',
      })
    }

    const results = apiData.Results?.series?.[0]?.data || []
    if (results.length === 0) {
      return res.status(404).json({
        error: 'No unemployment data found',
        message: `No data available for the period ${startYear}-${endYear}`,
        hint: 'Try adjusting the start_year and end_year parameters',
      })
    }

    const transformedData = results
      .reverse()
      .map((item) => {
        const year = item.year
        const period = item.period
        const month = period.replace('M', '')
        const monthName = new Date(year, parseInt(month, 10) - 1).toLocaleString('default', { month: 'long' })
        const date = `${year}-${month.padStart(2, '0')}-01`
        const unemploymentRate = parseFloat(item.value)
        return { Date: date, Year: year.toString(), Month: monthName, 'Unemployment Rate (%)': unemploymentRate, Period: period }
      })

    const columns = Object.keys(transformedData[0])
    const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(transformedData, columns)
    const processedData = processDataPreservingNumbers(transformedData, numericColumns)

    const payload = {
      data: processedData,
      columns,
      numericColumns,
      categoricalColumns,
      dateColumns,
      rowCount: processedData.length,
      source: 'Bureau of Labor Statistics (BLS) API',
      series: 'LNS14000000 (U.S. Unemployment Rate, Seasonally Adjusted)',
      filters: { start_year: startYear, end_year: endYear },
      note: blsApiKey ? 'Using BLS API v2.0 with registration key' : 'Using BLS API v1.0 (no registration required).',
    }
    blsCache.set(cacheKey, { ts: Date.now(), payload })
    return res.json(payload)
  } catch (error) {
    console.error('Error fetching BLS unemployment data:', error.message)
    return res.status(500).json({
      error: 'Failed to fetch unemployment data',
      message: error.message,
      hint: 'The BLS API may be temporarily unavailable.',
      documentation: 'https://www.bls.gov/developers/api_signature_v2.htm',
    })
  }
})

// GET /cdc-health - with caching (uses generated/sample data)
router.get('/cdc-health', async (req, res) => {
  try {
    const startYear = parseInt(req.query.start_year, 10) || new Date().getFullYear() - 5
    const endYear = parseInt(req.query.end_year, 10) || new Date().getFullYear()
    const metric = req.query.metric || 'mortality'

    const cacheKey = JSON.stringify({ startYear, endYear, metric })
    const cached = cdcCache.get(cacheKey)
    if (cached && Date.now() - cached.ts < BLS_CDC_CACHE_TTL_MS) {
      res.setHeader('X-Cache', 'HIT')
      return res.json(cached.payload)
    }
    res.setHeader('X-Cache', 'MISS')

    const transformedData = []
    const currentYear = new Date().getFullYear()
    const metricsToInclude = metric === 'all' ? ['mortality', 'birth_rate', 'life_expectancy'] : [metric]

    for (let year = startYear; year <= endYear; year++) {
      for (let month = 1; month <= 12; month++) {
        if (year === currentYear && month > new Date().getMonth() + 1) break
        const date = `${year}-${String(month).padStart(2, '0')}-01`
        const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' })
        for (const currentMetric of metricsToInclude) {
          let healthMetric = 0
          let metricName = ''
          if (currentMetric === 'mortality') {
            healthMetric = 750 + Math.random() * 50 - (year - startYear) * 2
            metricName = 'Death Rate (per 100,000)'
          } else if (currentMetric === 'birth_rate') {
            healthMetric = 12 + Math.random() * 1
            metricName = 'Birth Rate (per 1,000)'
          } else if (currentMetric === 'life_expectancy') {
            healthMetric = 78 + (year - startYear) * 0.1 + Math.random() * 0.5
            metricName = 'Life Expectancy (years)'
          }
          transformedData.push({
            Date: date,
            Year: year.toString(),
            Month: monthName,
            'Health Metric': parseFloat(healthMetric.toFixed(2)),
            Metric: metricName,
            Period: `M${String(month).padStart(2, '0')}`,
          })
        }
      }
    }

    if (transformedData.length === 0) {
      return res.status(404).json({ error: 'No health data found', message: `No data for ${startYear}-${endYear}`, hint: 'Try adjusting start_year and end_year.' })
    }

    const columns = Object.keys(transformedData[0])
    const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(transformedData, columns)
    if (!categoricalColumns.includes('Metric') && columns.includes('Metric')) categoricalColumns.push('Metric')
    const processedData = processDataPreservingNumbers(transformedData, numericColumns)

    const payload = {
      data: processedData,
      columns,
      numericColumns,
      categoricalColumns,
      dateColumns,
      rowCount: processedData.length,
      source: 'Centers for Disease Control and Prevention (CDC)',
      metric,
      filters: { start_year: startYear, end_year: endYear, metric },
      note: 'Demonstration endpoint. For production, integrate with CDC Wonder API.',
    }
    cdcCache.set(cacheKey, { ts: Date.now(), payload })
    return res.json(payload)
  } catch (error) {
    console.error('Error fetching CDC health data:', error.message)
    return res.status(500).json({ error: 'Failed to fetch health data', message: error.message, documentation: 'https://wonder.cdc.gov/' })
  }
})

// GET /government-budget - Treasury Fiscal Data API
router.get('/government-budget', async (req, res) => {
  try {
    const startYear = parseInt(req.query.start_year, 10) || new Date().getFullYear() - 5
    const endYear = parseInt(req.query.end_year, 10) || new Date().getFullYear()
    const category = req.query.category || 'all'

    const transformedData = []
    const currentYear = new Date().getFullYear()

    try {
      const treasuryApiUrl = 'https://api.fiscaldata.treasury.gov/services/api/v1/accounting/od/rcpt_outlays'
      const treasuryParams = {
        filter: `record_date:gte:${startYear}-01-01,record_date:lte:${endYear}-12-31`,
        sort: 'record_date',
        'page[size]': 1000,
      }
      const treasuryResponse = await axios.get(treasuryApiUrl, {
        params: treasuryParams,
        headers: { Accept: 'application/json' },
        timeout: AX_TIMEOUT,
        validateStatus: () => true,
      })

      if (treasuryResponse.data?.data?.length > 0) {
        treasuryResponse.data.data.forEach((item) => {
          const recordDate = item.record_date
          const year = new Date(recordDate).getFullYear()
          const month = new Date(recordDate).getMonth() + 1
          const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' })
          if (item.receipts) transformedData.push({ 'Fiscal Year': year.toString(), Year: year.toString(), Month: monthName, 'Budget Category': 'Receipts', 'Budget Amount (Billions $)': parseFloat((parseFloat(item.receipts) / 1000).toFixed(2)), Date: recordDate })
          if (item.outlays) transformedData.push({ 'Fiscal Year': year.toString(), Year: year.toString(), Month: monthName, 'Budget Category': 'Outlays', 'Budget Amount (Billions $)': parseFloat((parseFloat(item.outlays) / 1000).toFixed(2)), Date: recordDate })
          if (item.surplus_or_deficit) transformedData.push({ 'Fiscal Year': year.toString(), Year: year.toString(), Month: monthName, 'Budget Category': 'Surplus/Deficit', 'Budget Amount (Billions $)': parseFloat((parseFloat(item.surplus_or_deficit) / 1000).toFixed(2)), Date: recordDate })
        })
      }
    } catch (apiError) {
      console.warn('Failed to fetch from Treasury API, using fallback:', apiError.message)
      const budgetCategories = category === 'all' ? ['Defense', 'Healthcare', 'Education', 'Infrastructure', 'Social Security', 'Interest on Debt'] : [category]
      const baseAmounts = { Defense: 700, Healthcare: 1200, Education: 80, Infrastructure: 100, 'Social Security': 1100, 'Interest on Debt': 300 }
      for (let year = startYear; year <= endYear; year++) {
        if (year > currentYear) break
        for (let month = 1; month <= 12; month++) {
          if (year === currentYear && month > new Date().getMonth() + 1) break
          const date = `${year}-${String(month).padStart(2, '0')}-01`
          const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' })
          for (const budgetCategory of budgetCategories) {
            const base = baseAmounts[budgetCategory] || 100
            const growthFactor = 1 + (year - startYear) * 0.02
            const monthlyBase = (base * growthFactor) / 12
            const variation = (Math.random() - 0.5) * 0.1
            transformedData.push({
              'Fiscal Year': year.toString(),
              Year: year.toString(),
              Month: monthName,
              'Budget Category': budgetCategory,
              'Budget Amount (Billions $)': parseFloat((monthlyBase * (1 + variation)).toFixed(2)),
              Date: date,
            })
          }
        }
      }
    }

    if (transformedData.length === 0) {
      return res.status(404).json({ error: 'No budget data found', message: `No data for ${startYear}-${endYear}`, hint: 'Try adjusting start_year and end_year.' })
    }

    const columns = Object.keys(transformedData[0])
    const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(transformedData, columns)
    if (!categoricalColumns.includes('Budget Category') && columns.includes('Budget Category')) categoricalColumns.push('Budget Category')
    const processedData = processDataPreservingNumbers(transformedData, numericColumns)

    const isRealData = transformedData[0]?.['Budget Category'] === 'Receipts'
    return res.json({
      data: processedData,
      columns,
      numericColumns,
      categoricalColumns,
      dateColumns,
      rowCount: processedData.length,
      source: 'U.S. Treasury Fiscal Data',
      category,
      filters: { start_year: startYear, end_year: endYear, category },
      note: isRealData ? 'Real data from U.S. Treasury Fiscal Data API' : 'Using demonstration data.',
    })
  } catch (error) {
    console.error('Error fetching government budget data:', error.message)
    return res.status(500).json({ error: 'Failed to fetch budget data', message: error.message, documentation: 'https://fiscaldata.treasury.gov/' })
  }
})

module.exports = router
