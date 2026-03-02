/**
 * USAspending routes: sample data, proxy spending-over-time, live API, subawards.
 */
const express = require('express')
const axios = require('axios')
const { detectColumnTypes, processDataPreservingNumbers } = require('../../controllers/dataProcessor')
const { fyToTimePeriod } = require('../../utils/fiscalYear')
const { exampleDatasets } = require('../../data/exampleDatasets')
const { AXIOS_TIMEOUT_MS } = require('./constants')

const router = express.Router()

const AX_TIMEOUT = AXIOS_TIMEOUT_MS
const DEFAULT_LIMIT = 100
const MAX_LIMIT = 100

// GET /usaspending - sample data
router.get('/usaspending', (req, res) => {
  const dataset = exampleDatasets.usaspending
  const columns = Object.keys(dataset.data[0] || {})
  const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(dataset.data, columns)
  const processedData = processDataPreservingNumbers(dataset.data, numericColumns)
  res.json({ data: processedData, columns, numericColumns, categoricalColumns, dateColumns, rowCount: processedData.length })
})

// GET /usaspending/live - real API with correct fiscal year boundaries
router.get('/usaspending/live', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || DEFAULT_LIMIT, MAX_LIMIT)
    const fiscalYear = parseInt(req.query.fiscal_year, 10) || new Date().getFullYear()
    const awardType = req.query.award_type || null
    const state = req.query.state || null

    const fyRange = fyToTimePeriod(fiscalYear)
    const start_date = fyRange ? fyRange.start_date : `${fiscalYear - 1}-10-01`
    const end_date = fyRange ? fyRange.end_date : `${fiscalYear}-09-30`

    const filters = {
      time_period: [{ start_date, end_date }],
      award_type_codes: awardType ? [awardType.toUpperCase()] : ['A', 'C'],
    }
    if (state) filters.recipient_locations = [{ country: 'USA', state: state.toUpperCase() }]

    const requestBody = {
      filters,
      fields: ['Award ID', 'generated_internal_id', 'Award Amount', 'Start Date', 'Recipient Name', 'Awarding Agency', 'Contract Award Type', 'recipient_location_state_code', 'naics_code', 'Description'],
      page: 1,
      limit,
      sort: 'Award Amount',
      order: 'desc',
    }

    const response = await axios.post('https://api.usaspending.gov/api/v2/search/spending_by_award/', requestBody, {
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      timeout: AX_TIMEOUT,
      validateStatus: () => true,
    })

    if (response.status < 200 || response.status >= 300) {
      return res.status(response.status).json({
        error: 'Failed to fetch USASpending data',
        message: response.data?.message || response.data?.detail || 'API error',
        hint: 'Try the sample dataset at /api/example/usaspending instead.',
        documentation: 'https://api.usaspending.gov/docs/',
      })
    }

    const apiData = response.data
    const results = apiData.results || apiData.data || apiData.awards || []

    const transformedData = results.map((award) => {
      const awardId = award['Award ID'] || award.Award_ID || award.award_id || award.id || ''
      const internalId = award['generated_internal_id'] ?? award.generated_internal_id ?? ''
      const awardDate = award['Start Date'] || award['End Date'] || award.Start_Date || award.End_Date || ''
      const awardAmount = parseFloat(award['Award Amount'] || award.Award_Amount || 0)
      const recipientName = award['Recipient Name'] || award.Recipient_Name || 'Unknown'
      const awardingAgency = award['Awarding Agency'] || award.Awarding_Agency || 'Unknown'
      const awardTypeValue = award['Contract Award Type'] || award.Contract_Award_Type || 'Unknown'
      const recipientState = award['recipient_location_state_code'] || award.recipient_location_state_code || ''
      const naicsCode = award['naics_code'] ?? award.naics_code ?? ''
      const description = award['Description'] || award.Description || ''
      return {
        'Award ID': awardId,
        'generated_internal_id': internalId,
        'Award Date': awardDate,
        'Award Amount': awardAmount,
        'Recipient Name': recipientName,
        'Awarding Agency': awardingAgency,
        'Award Type': awardTypeValue,
        State: recipientState,
        'NAICS Code': naicsCode,
        Description: description,
      }
    })

    if (transformedData.length === 0) {
      return res.status(404).json({
        error: 'No data found for the specified filters',
        message: 'Try adjusting the fiscal_year, award_type, or state parameters',
        hint: 'Use ?fiscal_year=2023&limit=50&award_type=C for contracts or award_type=A for grants',
      })
    }

    const columns = Object.keys(transformedData[0])
    const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(transformedData, columns)
    const processedData = processDataPreservingNumbers(transformedData, numericColumns)

    res.json({
      data: processedData,
      columns,
      numericColumns,
      categoricalColumns,
      dateColumns,
      rowCount: processedData.length,
      source: 'USASpending.gov API (Real-time)',
      filters: { fiscal_year: fiscalYear, award_type: awardType, state: state, limit },
      apiResponse: { totalRecords: apiData.page_metadata?.total || apiData.count || processedData.length, page: apiData.page_metadata?.page || 1 },
    })
  } catch (error) {
    console.error('Error fetching USASpending data:', error.message)
    const hint = 'Try the sample dataset at /api/example/usaspending instead.'
    if (error.response) {
      return res.status(500).json({
        error: 'Failed to fetch USASpending data',
        message: error.message,
        hint,
        documentation: 'https://api.usaspending.gov/docs/',
      })
    }
    if (error.request) {
      return res.status(500).json({ error: 'Failed to fetch USASpending data', message: 'No response from USASpending API', hint })
    }
    return res.status(500).json({ error: 'Failed to fetch USASpending data', message: error.message, hint })
  }
})

// GET /usaspending/subawards - subawards for given prime award IDs (PIID/FAIN/URI format)
router.get('/usaspending/subawards', async (req, res) => {
  try {
    const awardIdsRaw = (req.query.award_ids || '').toString().trim()
    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 500)
    const fiscalYear = parseInt(req.query.fiscal_year, 10) || new Date().getFullYear()

    if (!awardIdsRaw) {
      return res.status(400).json({ error: 'Missing award_ids', message: 'Provide award_ids as a comma-separated list of Prime Award IDs (PIID/FAIN/URI, e.g. 1605SS17F00018).' })
    }

    const awardIds = awardIdsRaw.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 10)
    const apiUrl = 'https://api.usaspending.gov/api/v2/search/spending_by_award/'
    const fyRange = fyToTimePeriod(fiscalYear)
    const start_date = fyRange ? fyRange.start_date : `${fiscalYear - 1}-10-01`
    const end_date = fyRange ? fyRange.end_date : `${fiscalYear}-09-30`

    const allResults = []

    const body = {
      subawards: true,
      spending_level: 'subawards',
      filters: {
        award_ids: awardIds,
        award_type_codes: ['A', 'C'],
        time_period: [{ start_date, end_date }],
      },
      fields: ['Prime Award ID', 'Sub-Awardee Name', 'Sub-Award Amount', 'Sub-Award Date', 'Sub-Award Description'],
      page: 1,
      limit: Math.min(limit, 500),
      sort: 'Sub-Award Amount',
      order: 'desc',
    }

    try {
      const resp = await axios.post(apiUrl, body, {
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        timeout: AX_TIMEOUT,
        validateStatus: () => true,
      })
      const results = resp.data?.results || resp.data?.data || []
      allResults.push(...results)
    } catch (err) {
      console.error('USASpending subawards API error:', err?.message || err)
    }

    const transformed = allResults.map((r) => ({
      'Prime Award ID': r['Prime Award ID'] || r.prime_award_id || '',
      'Subcontractor Name': r['Sub-Awardee Name'] || r['Recipient Name'] || r.recipient_name || 'Unknown',
      'Subaward Amount': parseFloat(r['Sub-Award Amount'] || r['Award Amount'] || r.award_amount || 0),
      'Subaward Date': r['Sub-Award Date'] || r['Start Date'] || r.start_date || r.action_date || '',
      Description: r['Sub-Award Description'] || r.Description || r.description || '',
    }))

    const columns = ['Prime Award ID', 'Subcontractor Name', 'Subaward Amount', 'Subaward Date', 'Description']
    const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(transformed, columns)

    return res.json({
      data: transformed,
      columns,
      numericColumns,
      categoricalColumns,
      dateColumns,
      rowCount: transformed.length,
      source: 'USASpending.gov API (Subawards)',
      note: transformed.length === 0
        ? 'No subawards found for the given award IDs. Use real Award IDs from /api/example/usaspending/live (e.g. PIID for contracts, FAIN for grants).'
        : 'Subaward coverage varies by award; some primes may have no reported subawards.',
    })
  } catch (err) {
    console.error('Subawards route error:', err?.message || err)
    return res.status(500).json({ error: 'Failed to fetch subawards', message: err?.message || 'Unknown error' })
  }
})

module.exports = router
