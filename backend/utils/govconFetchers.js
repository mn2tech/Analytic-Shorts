/**
 * Internal fetchers for GovCon/Federal Entry data.
 * Used by federal-entry-report; does NOT call our own HTTP routes.
 */
const axios = require('axios')
const { formatMmDdYyyy } = require('./dateParsing')
const { getSamgovUpdatedDateValue, normalizeSamgovState, shortenSamgovOrganization } = require('./samgovHelpers')
const { resolveAgencyName } = require('./usaspendingAgencyMap')

const AX_TIMEOUT = 25000

function getSamgovApiKey() {
  return (process.env.SAM_GOV_API_KEY || '').toString().trim() || null
}

/**
 * Fetch SAM.gov opportunities (live).
 * @param {Object} opts - { limit, ptype, postedFrom, postedTo, title, ncode, state }
 * @returns {{ data: Array, error?: string, status?: number }}
 */
async function fetchSamgovOpportunities(opts = {}) {
  const apiKey = getSamgovApiKey()
  if (!apiKey) {
    return { data: [], error: 'SAM.gov API key not configured', status: 503 }
  }
  const limit = Math.min(Math.max(parseInt(opts.limit, 10) || 200, 1), 1000)
  const offset = Math.max(parseInt(opts.offset, 10) || 0, 0)
  const ptype = (opts.ptype || 'o').toString().trim() || undefined
  const title = (opts.title || opts.keywords?.[0] || '').toString().trim() || undefined
  const ncode = (opts.ncode || opts.naics?.[0] || '').toString().trim() || undefined
  const state = (opts.state || '').toString().trim() || undefined
  const postedFrom = opts.postedFrom || (() => { const d = new Date(); d.setDate(d.getDate() - 30); return formatMmDdYyyy(d) })()
  const postedTo = opts.postedTo || formatMmDdYyyy(new Date())

  try {
    const params = {
      api_key: apiKey,
      limit,
      offset,
      postedFrom,
      postedTo,
      ...(ptype ? { ptype } : {}),
      ...(title ? { title } : {}),
      ...(ncode ? { ncode } : {}),
      ...(state ? { state } : {}),
    }
    const response = await axios.get('https://api.sam.gov/opportunities/v2/search', {
      params,
      timeout: AX_TIMEOUT,
      validateStatus: () => true,
    })
    if (response.status < 200 || response.status >= 300) {
      return { data: [], error: response.data?.message || response.data?.error || `HTTP ${response.status}`, status: response.status }
    }
    const items = Array.isArray(response.data?.opportunitiesData) ? response.data.opportunitiesData : []
    const transformed = items.map((o) => {
      const rawState = o?.placeOfPerformance?.state ?? o?.officeAddress?.state ?? ''
      const awardAmountRaw = o?.award?.amount
      const award_amount = awardAmountRaw == null || awardAmountRaw === '' ? null : Number(String(awardAmountRaw).replace(/[$,\s]/g, ''))
      const pocs = o?.pointOfContact || o?.point_of_contact || []
      const primary = Array.isArray(pocs) ? (pocs.find((c) => c?.type === 'primary') || pocs[0]) : null
      const poc = primary && (primary.email || primary.phone || primary.fullName)
        ? {
            fullName: primary.fullName || null,
            email: primary.email || null,
            phone: primary.phone || null,
          }
        : null
      const noticeId = o.noticeId || ''
      const uiLinkRaw = o.uiLink || o.additionalInfoLink
      const fromLinks = Array.isArray(o.links) && o.links.find((l) => /view|ui|opp/i.test(l.rel || ''))
      const uiLink = uiLinkRaw || fromLinks?.href || (noticeId ? `https://sam.gov/opp/${noticeId}/view` : null)
      return {
        noticeId,
        title: o.title || '',
        solicitationNumber: o.solicitationNumber || '',
        postedDate: o.postedDate || '',
        updatedDate: getSamgovUpdatedDateValue(o),
        responseDeadLine: o.responseDeadLine || o.response_dead_line || '',
        organization: shortenSamgovOrganization(o.fullParentPathName, o.organizationName),
        naicsCode: o.naicsCode || '',
        setAside: o.setAside || o.typeOfSetAsideDescription || '',
        state: normalizeSamgovState(rawState),
        award_amount: Number.isFinite(award_amount) ? award_amount : null,
        pointOfContact: poc,
        uiLink: uiLink || null,
      }
    })
    return { data: transformed }
  } catch (err) {
    return { data: [], error: err.message || 'SAM.gov fetch failed', status: err.response?.status }
  }
}

/**
 * Fetch SAM.gov agency rollup.
 * @param {Object} opts - same as fetchSamgovOpportunities
 * @returns {{ data: Array, error?: string, status?: number }}
 */
async function fetchSamgovAgencyReport(opts = {}) {
  const apiKey = getSamgovApiKey()
  if (!apiKey) {
    return { data: [], error: 'SAM.gov API key not configured', status: 503 }
  }
  const limit = Math.min(Math.max(parseInt(opts.limit, 10) || 500, 1), 1000)
  const offset = Math.max(parseInt(opts.offset, 10) || 0, 0)
  const ptype = (opts.ptype || 'o').toString().trim() || undefined
  const title = (opts.title || opts.keywords?.[0] || '').toString().trim() || undefined
  const ncode = (opts.ncode || opts.naics?.[0] || '').toString().trim() || undefined
  const postedFrom = opts.postedFrom || (() => { const d = new Date(); d.setDate(d.getDate() - 30); return formatMmDdYyyy(d) })()
  const postedTo = opts.postedTo || formatMmDdYyyy(new Date())

  try {
    const params = { api_key: apiKey, limit, offset, postedFrom, postedTo, ...(ptype ? { ptype } : {}), ...(title ? { title } : {}), ...(ncode ? { ncode } : {}) }
    const response = await axios.get('https://api.sam.gov/opportunities/v2/search', { params, timeout: AX_TIMEOUT, validateStatus: () => true })
    if (response.status < 200 || response.status >= 300) return { data: [], error: `HTTP ${response.status}`, status: response.status }
    const items = Array.isArray(response.data?.opportunitiesData) ? response.data.opportunitiesData : []
    const grouped = new Map()
    for (const o of items) {
      const agency = shortenSamgovOrganization(o?.fullParentPathName, o?.organizationName) || 'Unknown Agency'
      const awardAmount = o?.award?.amount == null || o?.award?.amount === '' ? null : Number(String(o.award.amount).replace(/[$,\s]/g, ''))
      if (!grouped.has(agency)) grouped.set(agency, { agency, opportunity_count: 0, total_award_amount: 0, known_award_count: 0 })
      const rec = grouped.get(agency)
      rec.opportunity_count += 1
      if (Number.isFinite(awardAmount) && awardAmount > 0) { rec.total_award_amount += awardAmount; rec.known_award_count += 1 }
    }
    const reportRows = Array.from(grouped.values())
      .map((r) => ({ agency: r.agency, opportunity_count: r.opportunity_count, total_award_amount: Number(r.total_award_amount.toFixed(2)), avg_award_amount: r.known_award_count > 0 ? Number((r.total_award_amount / r.known_award_count).toFixed(2)) : 0 }))
      .sort((a, b) => (b.opportunity_count - a.opportunity_count) || (b.total_award_amount - a.total_award_amount))
    return { data: reportRows }
  } catch (err) {
    return { data: [], error: err.message || 'SAM.gov agency report fetch failed', status: err.response?.status }
  }
}

/**
 * Fetch USAspending spending-over-time.
 * @param {Object} opts - { agency, fy (array of years), naics }
 * @returns {{ data: Array, error?: string, status?: number }}
 */
async function fetchUsaspendingSpendingOverTime(opts = {}) {
  const agencyInput = (opts.agency || '').toString().trim()
  const agencyFullName = agencyInput ? (resolveAgencyName(agencyInput) || agencyInput) : null
  const fyList = Array.isArray(opts.fy) ? opts.fy : [].concat(opts.fy || '2024').filter(Boolean)
  const timePeriod = fyList.map((fy) => {
    const year = parseInt(String(fy).trim(), 10)
    if (!Number.isFinite(year) || year < 1900 || year > 2100) return null
    return { start_date: `${year - 1}-10-01`, end_date: `${year}-09-30` }
  }).filter(Boolean)
  if (timePeriod.length === 0) return { data: [], error: 'Invalid fiscal years' }

  const filters = {
    time_period: timePeriod,
    award_type_codes: ['A', 'B', 'C', 'D'],
  }
  if (agencyFullName) {
    filters.agencies = [{ type: 'awarding', tier: 'toptier', name: agencyFullName }]
  }
  if (opts.naics && Array.isArray(opts.naics) && opts.naics.length > 0) {
    filters.naics_codes = opts.naics.filter((s) => typeof s === 'string' && s.trim())
  }
  const payload = { group: 'fiscal_year', filters }

  try {
    const response = await axios.post('https://api.usaspending.gov/api/v2/search/spending_over_time/', payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: AX_TIMEOUT,
      validateStatus: () => true,
    })
    if (response.status < 200 || response.status >= 300) {
      const errBody = response.data != null ? (typeof response.data === 'object' ? response.data : { raw: String(response.data) }) : null
      return {
        data: [],
        error: response.data?.message || response.data?.detail || `HTTP ${response.status}`,
        status: response.status,
        _debug: { requestPayload: payload, statusCode: response.status, responseBody: errBody },
      }
    }
    const results = Array.isArray(response.data?.results) ? response.data.results : []
    // Derive fiscal year from end_date (e.g. 2024-09-30 => FY2024) when API omits it
    const flattened = results.map((r, idx) => {
      let fy = r.time_period?.fiscal_year != null ? parseInt(String(r.time_period.fiscal_year), 10) : null
      if ((fy == null || !Number.isFinite(fy)) && r.fiscal_year != null) {
        fy = parseInt(String(r.fiscal_year), 10)
      }
      if (fy == null || !Number.isFinite(fy)) {
        const endDate = r.time_period?.end_date ?? r.time_period?.endDate
        if (endDate) {
          const endYear = parseInt(String(endDate).slice(0, 4), 10)
          if (Number.isFinite(endYear)) fy = endYear
        }
      }
      // Fallback: infer from requested time_period order (FY2024, FY2025, FY2026)
      if ((fy == null || !Number.isFinite(fy)) && timePeriod[idx]) {
        const y = parseInt(String(timePeriod[idx].end_date).slice(0, 4), 10)
        if (Number.isFinite(y)) fy = y
      }
      return {
        fiscal_year: fy,
        obligations: typeof r.aggregated_amount === 'number' ? r.aggregated_amount : 0,
        agency: agencyFullName || 'All Agencies',
      }
    })
    return { data: flattened, _requestPayload: payload }
  } catch (err) {
    const errBody = err.response?.data != null ? (typeof err.response.data === 'object' ? err.response.data : { raw: String(err.response.data) }) : null
    return {
      data: [],
      error: err.message || 'USAspending spending-over-time fetch failed',
      status: err.response?.status || 500,
      _debug: { requestPayload: payload, statusCode: err.response?.status || 500, responseBody: errBody },
    }
  }
}

/**
 * Build time_period array for USAspending from FY list.
 * FY 2024 = 2023-10-01 to 2024-09-30
 */
function buildTimePeriodFromFy(fyList) {
  const list = Array.isArray(fyList) ? fyList : [].concat(fyList || []).filter(Boolean)
  return list.map((fy) => {
    const year = parseInt(String(fy).trim(), 10)
    if (!Number.isFinite(year) || year < 1900 || year > 2100) return null
    return { start_date: `${year - 1}-10-01`, end_date: `${year}-09-30` }
  }).filter(Boolean)
}

/**
 * Fetch USAspending recent awards (spending_by_award).
 * @param {Object} opts - { limit, fy (array), naics, agency }
 * @returns {{ data: Array, error?: string, status?: number, _debug?: { requestPayload, statusCode, responseBody } }}
 */
async function fetchUsaspendingRecentAwards(opts = {}) {
  const limit = Math.min(Math.max(parseInt(opts.limit, 10) || 100, 1), 100)
  const fyList = Array.isArray(opts.fy) ? opts.fy : [].concat(opts.fy || opts.fiscal_year || new Date().getFullYear()).filter(Boolean)
  let timePeriod = buildTimePeriodFromFy(fyList)
  if (timePeriod.length === 0) {
    const fallbackYear = new Date().getFullYear()
    timePeriod = [{ start_date: `${fallbackYear - 1}-10-01`, end_date: `${fallbackYear}-09-30` }]
  }

  const filters = {
    time_period: timePeriod,
    award_type_codes: opts.award_type_codes || ['A', 'B', 'C', 'D'],
  }
  if (opts.naics && Array.isArray(opts.naics) && opts.naics.length > 0) {
    filters.naics_codes = opts.naics.filter((s) => typeof s === 'string' && s.trim())
  }
  const agencyFullName = opts.agency ? (resolveAgencyName(opts.agency) || null) : null
  if (agencyFullName) {
    filters.agencies = [{ type: 'awarding', tier: 'toptier', name: agencyFullName }]
  }

  const requestBody = {
    filters,
    fields: ['Award ID', 'Award Amount', 'Start Date', 'Recipient Name', 'Awarding Agency', 'Contract Award Type', 'recipient_location_state_code', 'naics_code'],
    page: 1,
    limit,
    sort: 'Award Amount',
    order: 'desc',
  }

  try {
    const response = await axios.post('https://api.usaspending.gov/api/v2/search/spending_by_award/', requestBody, {
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      timeout: AX_TIMEOUT,
      validateStatus: () => true,
    })
    if (response.status < 200 || response.status >= 300) {
      const errBody = response.data != null ? (typeof response.data === 'object' ? response.data : { raw: String(response.data) }) : null
      return {
        data: [],
        error: response.data?.message || response.data?.detail || `HTTP ${response.status}`,
        status: response.status,
        _debug: { requestPayload: requestBody, statusCode: response.status, responseBody: errBody },
      }
    }
    const results = response.data?.results || response.data?.data || []
    const transformed = results.map((award) => ({
      awardId: award['Award ID'] || award.Award_ID || '',
      awardDate: award['Start Date'] || award['End Date'] || '',
      awardAmount: parseFloat(award['Award Amount'] || award.Award_Amount || 0),
      recipientName: award['Recipient Name'] || award.Recipient_Name || 'Unknown',
      awardingAgency: award['Awarding Agency'] || award.Awarding_Agency || 'Unknown',
    }))
    return { data: transformed, _requestPayload: requestBody }
  } catch (err) {
    const errBody = err.response?.data != null ? (typeof err.response.data === 'object' ? err.response.data : { raw: String(err.response.data) }) : null
    return {
      data: [],
      error: err.message || 'USAspending awards fetch failed',
      status: err.response?.status || 500,
      _debug: { requestPayload: requestBody, statusCode: err.response?.status || 500, responseBody: errBody },
    }
  }
}

module.exports = {
  fetchSamgovOpportunities,
  fetchSamgovAgencyReport,
  fetchUsaspendingSpendingOverTime,
  fetchUsaspendingRecentAwards,
  getSamgovApiKey,
}
