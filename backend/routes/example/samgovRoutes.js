/**
 * SAM.gov routes: expand-intent, live, agency-report, agency-opportunities, databank.
 */
const express = require('express')
const axios = require('axios')
const OpenAI = require('openai')
const { detectColumnTypes, processDataPreservingNumbers } = require('../../controllers/dataProcessor')
const { formatMmDdYyyy, parseFlexibleDateToMs } = require('../../utils/dateParsing')
const { getSamgovUpdatedDateValue, normalizeSamgovState, shortenSamgovOrganization } = require('../../utils/samgovHelpers')
const { SAMGOV_CACHE_TTL_MS, AXIOS_TIMEOUT_MS, FORCE_CATEGORICAL_SAMGOV, FORCE_CATEGORICAL_SAMGOV_ENTITY } = require('./constants')

const router = express.Router()
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

const AX_TIMEOUT = AXIOS_TIMEOUT_MS
const samgovCache = new Map()
const samgovEntityCache = new Map()

function getSamgovApiKey(req) {
  const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production'
  const envKey = (process.env.SAM_GOV_API_KEY || '').toString().trim()
  const queryKey = (req.query.api_key || '').toString().trim()
  if (isProd) return envKey || null
  return envKey || queryKey || null
}

function requireSamgovKey(req, res, next) {
  const apiKey = getSamgovApiKey(req)
  if (!apiKey) {
    return res.status(503).json({
      error: 'SAM.gov API key not configured',
      message: 'Set SAM_GOV_API_KEY in backend environment (.env) to use this dataset.',
      docs: 'https://open.gsa.gov/api/get-opportunities-public-api/',
    })
  }
  req.samgovApiKey = apiKey
  next()
}

// GET /samgov/expand-intent
router.get('/samgov/expand-intent', async (req, res) => {
  try {
    const q = (req.query.q || req.query.query || '').toString().trim()
    if (!q) return res.status(400).json({ error: 'Missing q (query) parameter' })
    if (!openai) {
      return res.status(503).json({
        error: 'Intent expansion not configured',
        message: 'Set OPENAI_API_KEY in backend .env to use intent-based search.',
        fallback: [q],
      })
    }
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a search assistant for SAM.gov (US federal contract opportunities). Given a user\'s natural-language intent or goal, output 4 to 8 short search keywords or phrases that would find relevant contract opportunities. Output only a JSON array of strings, no other text. Example: ["cloud migration", "infrastructure modernization", "AWS", "data analytics"]' },
        { role: 'user', content: q },
      ],
      temperature: 0.3,
      max_tokens: 256,
    })
    const text = completion?.choices?.[0]?.message?.content?.trim() || '[]'
    let keywords = [q]
    try {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed) && parsed.length > 0) {
        keywords = parsed.filter((k) => typeof k === 'string' && k.trim().length > 0).map((k) => k.trim()).slice(0, 8)
        if (keywords.length === 0) keywords = [q]
      }
    } catch {
      keywords = [q]
    }
    return res.json({ keywords, query: q })
  } catch (err) {
    console.error('[samgov/expand-intent]', err?.message || err)
    const q = (req.query.q || req.query.query || '').toString().trim()
    return res.status(500).json({ error: 'Intent expansion failed', message: err?.message || 'Try using a keyword instead.', fallback: q ? [q] : [] })
  }
})

function buildSamgovPayload(items, wantsUpdatedFilter, updatedWithinDays, updatedFromRaw, updatedToRaw) {
  const transform = (o) => {
    const rawState = o?.placeOfPerformance?.state ?? o?.officeAddress?.state ?? ''
    const popState = normalizeSamgovState(rawState)
    const awardAmountRaw = o?.award?.amount
    const award_amount = awardAmountRaw == null || awardAmountRaw === '' ? null : Number(String(awardAmountRaw).replace(/[$,\s]/g, ''))
    return {
      noticeId: o.noticeId || '',
      title: o.title || '',
      solicitationNumber: o.solicitationNumber || '',
      postedDate: o.postedDate || '',
      updatedDate: getSamgovUpdatedDateValue(o),
      responseDeadLine: o.responseDeadLine || '',
      type: o.type || '',
      baseType: o.baseType || '',
      active: o.active || '',
      organization: shortenSamgovOrganization(o.fullParentPathName, o.organizationName),
      naicsCode: o.naicsCode || '',
      classificationCode: o.classificationCode || '',
      setAside: o.setAside || o.typeOfSetAsideDescription || '',
      state: popState,
      uiLink: o.uiLink || '',
      award_amount: Number.isFinite(award_amount) ? award_amount : null,
      opportunity_count: 1,
    }
  }

  let transformedData = items.map(transform)
  if (wantsUpdatedFilter) {
    const nowMs = Date.now()
    const fromMs = Number.isFinite(updatedWithinDays) && updatedWithinDays > 0
      ? nowMs - updatedWithinDays * 24 * 60 * 60 * 1000
      : parseFlexibleDateToMs(updatedFromRaw, { endOfDay: false })
    const toMs = Number.isFinite(updatedWithinDays) && updatedWithinDays > 0 ? nowMs : parseFlexibleDateToMs(updatedToRaw, { endOfDay: true })
    transformedData = transformedData.filter((row) => {
      const uMs = parseFlexibleDateToMs(row?.updatedDate)
      if (uMs == null) return false
      if (fromMs != null && uMs < fromMs) return false
      if (toMs != null && uMs > toMs) return false
      return true
    })
  }
  return transformedData
}

function applySamgovColumnTypes(transformedData) {
  const columns = Object.keys(transformedData[0] || {})
  const { numericColumns: detectedNumericColumns, categoricalColumns: detectedCategoricalColumns, dateColumns } = detectColumnTypes(transformedData, columns)
  const numericColumns = detectedNumericColumns.filter((c) => !FORCE_CATEGORICAL_SAMGOV.has(c))
  if (columns.includes('opportunity_count') && !numericColumns.includes('opportunity_count')) numericColumns.push('opportunity_count')
  if (columns.includes('award_amount') && !numericColumns.includes('award_amount')) numericColumns.push('award_amount')
  const categoricalColumns = Array.from(new Set([...detectedCategoricalColumns, ...FORCE_CATEGORICAL_SAMGOV]))
  const processedData = processDataPreservingNumbers(transformedData, numericColumns)
  return { columns, numericColumns, categoricalColumns, dateColumns, processedData }
}

// GET /samgov/live
router.get('/samgov/live', requireSamgovKey, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 1000)
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0)
    const ptype = (req.query.ptype || '').toString().trim() || undefined
    const title = (req.query.title || req.query.q || '').toString().trim() || undefined
    const state = (req.query.state || '').toString().trim() || undefined
    const ncode = (req.query.ncode || '').toString().trim() || undefined
    const rdlfrom = (req.query.rdlfrom || req.query.responseFrom || req.query.response_from || '').toString().trim() || undefined
    const rdlto = (req.query.rdlto || req.query.responseTo || req.query.response_to || '').toString().trim() || undefined
    const updatedWithinDaysRaw = (req.query.updatedWithinDays || req.query.updated_within_days || req.query.updatedDays || '').toString().trim()
    const updatedWithinDays = updatedWithinDaysRaw ? parseInt(updatedWithinDaysRaw, 10) : NaN
    const updatedFromRaw = (req.query.updatedFrom || req.query.updated_from || '').toString().trim()
    const updatedToRaw = (req.query.updatedTo || req.query.updated_to || '').toString().trim()
    const wantsUpdatedFilter = (Number.isFinite(updatedWithinDays) && updatedWithinDays > 0) || Boolean(updatedFromRaw) || Boolean(updatedToRaw)

    const now = new Date()
    const postedTo = (req.query.postedTo || req.query.posted_to || '').toString().trim() || formatMmDdYyyy(now)
    const from = new Date(now)
    from.setDate(from.getDate() - (wantsUpdatedFilter ? 364 : 30))
    const postedFrom = (req.query.postedFrom || req.query.posted_from || '').toString().trim() || formatMmDdYyyy(from)

    const cacheKey = JSON.stringify({ limit, offset, ptype, title, state, ncode, postedFrom, postedTo, updatedWithinDays: Number.isFinite(updatedWithinDays) ? updatedWithinDays : null, updatedFrom: updatedFromRaw || null, updatedTo: updatedToRaw || null })
    const cached = samgovCache.get(cacheKey)
    if (cached && Date.now() - cached.ts < SAMGOV_CACHE_TTL_MS) {
      res.setHeader('X-Cache', 'HIT')
      return res.json(cached.payload)
    }
    res.setHeader('X-Cache', 'MISS')

    const apiUrl = 'https://api.sam.gov/opportunities/v2/search'
    const params = {
      api_key: req.samgovApiKey,
      limit, offset, postedFrom, postedTo, rdlfrom, rdlto,
      ...(ptype ? { ptype } : {}),
      ...(title ? { title } : {}),
      ...(state ? { state } : {}),
      ...(ncode ? { ncode } : {}),
    }

    const response = await axios.get(apiUrl, { params, timeout: AX_TIMEOUT, validateStatus: () => true })
    const raw = response.data
    const items = Array.isArray(raw?.opportunitiesData) ? raw.opportunitiesData : (Array.isArray(raw) ? raw : [])

    if (!items.length) {
      return res.status(404).json({
        error: 'No opportunities found',
        message: 'Try adjusting postedFrom/postedTo, title, state, ncode, or ptype.',
        hint: 'Example: /api/example/samgov/live?postedFrom=01/01/2026&postedTo=02/09/2026&ptype=o&limit=50',
      })
    }

    const transformedData = buildSamgovPayload(items, wantsUpdatedFilter, updatedWithinDays, updatedFromRaw, updatedToRaw)
    if (!transformedData.length) {
      return res.status(404).json({
        error: 'No opportunities found',
        message: wantsUpdatedFilter ? 'No opportunities matched the updated date filter.' : 'No opportunities returned.',
        hint: wantsUpdatedFilter ? 'Example: /api/example/samgov/live?updatedWithinDays=30&ptype=o&limit=200' : undefined,
      })
    }

    const { columns, numericColumns, categoricalColumns, dateColumns, processedData } = applySamgovColumnTypes(transformedData)
    const payload = {
      data: processedData,
      columns,
      numericColumns,
      categoricalColumns,
      dateColumns,
      rowCount: processedData.length,
      source: 'SAM.gov Opportunities API (Real-time)',
      filters: { postedFrom, postedTo, rdlfrom, rdlto, limit, offset, ptype, title, state, ncode, updatedWithinDays, updatedFrom: updatedFromRaw, updatedTo: updatedToRaw },
      notes: wantsUpdatedFilter ? ['SAM.gov Get Opportunities Public API v2 does not expose an explicit "Updated Date" field; "updatedDate" is best-effort and may fall back to postedDate.'] : undefined,
    }
    samgovCache.set(cacheKey, { ts: Date.now(), payload })
    return res.json(payload)
  } catch (error) {
    console.error('Error fetching SAM.gov opportunities:', error.message)
    const status = error.response?.status
    const data = error.response?.data
    if (status) {
      return res.status(502).json({
        error: 'SAM.gov API error',
        status,
        message: data?.message || data?.error || error.message,
        hint: status === 400 ? 'Check date format (MM/dd/yyyy) and required postedFrom/postedTo parameters.' : undefined,
        docs: 'https://open.gsa.gov/api/get-opportunities-public-api/',
      })
    }
    return res.status(500).json({ error: 'Failed to fetch SAM.gov opportunities', message: error.message, docs: 'https://open.gsa.gov/api/get-opportunities-public-api/' })
  }
})

// GET /samgov/agency-report
router.get('/samgov/agency-report', requireSamgovKey, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 500, 1), 1000)
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0)
    const ptype = (req.query.ptype || '').toString().trim() || undefined
    const title = (req.query.title || req.query.q || '').toString().trim() || undefined
    const state = (req.query.state || '').toString().trim() || undefined
    const ncode = (req.query.ncode || '').toString().trim() || undefined
    const rdlfrom = (req.query.rdlfrom || req.query.responseFrom || req.query.response_from || '').toString().trim() || undefined
    const rdlto = (req.query.rdlto || req.query.responseTo || req.query.response_to || '').toString().trim() || undefined
    const now = new Date()
    const postedTo = (req.query.postedTo || req.query.posted_to || '').toString().trim() || formatMmDdYyyy(now)
    const from = new Date(now)
    from.setDate(from.getDate() - 30)
    const postedFrom = (req.query.postedFrom || req.query.posted_from || '').toString().trim() || formatMmDdYyyy(from)

    const apiUrl = 'https://api.sam.gov/opportunities/v2/search'
    const params = {
      api_key: req.samgovApiKey,
      limit, offset, postedFrom, postedTo,
      ...(rdlfrom ? { rdlfrom } : {}),
      ...(rdlto ? { rdlto } : {}),
      ...(ptype ? { ptype } : {}),
      ...(title ? { title } : {}),
      ...(state ? { state } : {}),
      ...(ncode ? { ncode } : {}),
    }

    const response = await axios.get(apiUrl, { params, timeout: AX_TIMEOUT, validateStatus: () => true })
    const raw = response.data
    const items = Array.isArray(raw?.opportunitiesData) ? raw.opportunitiesData : (Array.isArray(raw) ? raw : [])

    if (!items.length) {
      return res.status(404).json({
        error: 'No opportunities found',
        message: 'Try adjusting postedFrom/postedTo, title, state, ncode, or ptype.',
        hint: 'Example: /api/example/samgov/agency-report?postedFrom=01/01/2026&postedTo=02/09/2026&ptype=o&limit=500',
      })
    }

    const grouped = new Map()
    for (const o of items) {
      const agency = shortenSamgovOrganization(o?.fullParentPathName, o?.organizationName) || 'Unknown Agency'
      const awardAmountRaw = o?.award?.amount
      const awardAmount = awardAmountRaw == null || awardAmountRaw === '' ? null : Number(String(awardAmountRaw).replace(/[$,\s]/g, ''))
      if (!grouped.has(agency)) grouped.set(agency, { agency, opportunity_count: 0, known_award_count: 0, total_award_amount: 0, states: new Set(), setAsideTypes: new Set() })
      const rec = grouped.get(agency)
      rec.opportunity_count += 1
      if (Number.isFinite(awardAmount) && awardAmount > 0) { rec.total_award_amount += awardAmount; rec.known_award_count += 1 }
      const popState = o?.placeOfPerformance?.state?.code || o?.placeOfPerformance?.state || o?.officeAddress?.state || ''
      if (popState) rec.states.add(String(popState))
      const sa = o?.setAside || o?.typeOfSetAsideDescription || ''
      if (sa) rec.setAsideTypes.add(String(sa))
    }

    const reportRows = Array.from(grouped.values())
      .map((r) => ({
        agency: r.agency,
        opportunity_count: r.opportunity_count,
        total_award_amount: Number(r.total_award_amount.toFixed(2)),
        avg_award_amount: r.known_award_count > 0 ? Number((r.total_award_amount / r.known_award_count).toFixed(2)) : 0,
        known_award_count: r.known_award_count,
        states_covered: Array.from(r.states).sort().join(', '),
        set_aside_types: Array.from(r.setAsideTypes).sort().join(' | '),
      }))
      .sort((a, b) => (b.opportunity_count - a.opportunity_count) || (b.total_award_amount - a.total_award_amount))

    const columns = Object.keys(reportRows[0] || {})
    const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(reportRows, columns)
    const processedData = processDataPreservingNumbers(reportRows, numericColumns)

    return res.json({
      data: processedData,
      columns,
      numericColumns,
      categoricalColumns,
      dateColumns,
      rowCount: processedData.length,
      source: 'SAM.gov Opportunities API (Agency Report)',
      filters: { postedFrom, postedTo, rdlfrom, rdlto, limit, offset, ptype, title, state, ncode },
    })
  } catch (error) {
    console.error('Error fetching SAM.gov agency report:', error.message)
    const status = error.response?.status
    const data = error.response?.data
    if (status) return res.status(502).json({ error: 'SAM.gov API error', status, message: data?.message || data?.error || error.message, docs: 'https://open.gsa.gov/api/get-opportunities-public-api/' })
    return res.status(500).json({ error: 'Failed to fetch SAM.gov agency report', message: error.message, docs: 'https://open.gsa.gov/api/get-opportunities-public-api/' })
  }
})

// GET /samgov/agency-opportunities
router.get('/samgov/agency-opportunities', requireSamgovKey, async (req, res) => {
  try {
    const agency = (req.query.agency || '').toString().trim()
    if (!agency) return res.status(400).json({ error: 'Missing agency parameter', message: 'Provide agency name via ?agency=...' })

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 500, 1), 1000)
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0)
    const ptype = (req.query.ptype || '').toString().trim() || undefined
    const rdlfrom = (req.query.rdlfrom || req.query.responseFrom || req.query.response_from || '').toString().trim() || undefined
    const rdlto = (req.query.rdlto || req.query.responseTo || req.query.response_to || '').toString().trim() || undefined
    const updatedWithinDaysRaw = (req.query.updatedWithinDays || req.query.updated_within_days || req.query.updatedDays || '').toString().trim()
    const updatedWithinDays = updatedWithinDaysRaw ? parseInt(updatedWithinDaysRaw, 10) : NaN
    const updatedFromRaw = (req.query.updatedFrom || req.query.updated_from || '').toString().trim()
    const updatedToRaw = (req.query.updatedTo || req.query.updated_to || '').toString().trim()
    const wantsUpdatedFilter = (Number.isFinite(updatedWithinDays) && updatedWithinDays > 0) || Boolean(updatedFromRaw) || Boolean(updatedToRaw)
    const now = new Date()
    const postedTo = (req.query.postedTo || req.query.posted_to || '').toString().trim() || formatMmDdYyyy(now)
    const from = new Date(now)
    from.setDate(from.getDate() - (wantsUpdatedFilter ? 364 : 30))
    const postedFrom = (req.query.postedFrom || req.query.posted_from || '').toString().trim() || formatMmDdYyyy(from)

    const apiUrl = 'https://api.sam.gov/opportunities/v2/search'
    const params = { api_key: req.samgovApiKey, limit, offset, postedFrom, postedTo, ...(rdlfrom ? { rdlfrom } : {}), ...(rdlto ? { rdlto } : {}), ...(ptype ? { ptype } : {}) }
    const response = await axios.get(apiUrl, { params, timeout: AX_TIMEOUT, validateStatus: () => true })
    const raw = response.data
    const items = Array.isArray(raw?.opportunitiesData) ? raw.opportunitiesData : (Array.isArray(raw) ? raw : [])
    const agencyLower = agency.toLowerCase()
    const filteredItems = items.filter((o) => (o?.fullParentPathName || o?.organizationName || '').toString().toLowerCase().includes(agencyLower))

    if (!filteredItems.length) {
      return res.status(404).json({ error: 'No opportunities found for agency', message: `No opportunities matched agency: ${agency}`, hint: 'Try a broader agency term or a wider date range.' })
    }

    const transformedData = buildSamgovPayload(filteredItems, wantsUpdatedFilter, updatedWithinDays, updatedFromRaw, updatedToRaw)
    if (!transformedData.length) {
      return res.status(404).json({
        error: 'No opportunities found for agency',
        message: wantsUpdatedFilter ? `No opportunities for agency matched the updated date filter: ${agency}` : `No opportunities matched agency: ${agency}`,
        hint: wantsUpdatedFilter ? 'Try widening updatedWithinDays.' : 'Try a broader agency term or a wider date range.',
      })
    }

    const { columns, numericColumns, categoricalColumns, dateColumns, processedData } = applySamgovColumnTypes(transformedData)
    return res.json({
      data: processedData,
      columns,
      numericColumns,
      categoricalColumns,
      dateColumns,
      rowCount: processedData.length,
      source: 'SAM.gov Opportunities API (Agency Drill-down)',
      filters: { agency, postedFrom, postedTo, rdlfrom, rdlto, limit, offset, ptype, updatedWithinDays, updatedFrom: updatedFromRaw, updatedTo: updatedToRaw },
      notes: wantsUpdatedFilter ? ['SAM.gov Get Opportunities Public API v2 does not expose an explicit "Updated Date" field.'] : undefined,
    })
  } catch (error) {
    console.error('Error fetching SAM.gov agency opportunities:', error.message)
    const status = error.response?.status
    const data = error.response?.data
    if (status) return res.status(502).json({ error: 'SAM.gov API error', status, message: data?.message || data?.error || error.message, docs: 'https://open.gsa.gov/api/get-opportunities-public-api/' })
    return res.status(500).json({ error: 'Failed to fetch SAM.gov agency opportunities', message: error.message, docs: 'https://open.gsa.gov/api/get-opportunities-public-api/' })
  }
})

// GET /samgov/databank
router.get('/samgov/databank', requireSamgovKey, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
    const size = Math.min(Math.max(parseInt(req.query.size, 10) || 10, 1), 10)
    const q = (req.query.q || req.query.keyword || req.query.name || '').toString().trim() || undefined
    const ueiSAM = (req.query.uei || req.query.ueiSAM || '').toString().trim() || undefined
    const legalBusinessName = (req.query.legalBusinessName || '').toString().trim() || undefined
    const naicsCode = (req.query.naicsCode || req.query.naics || '').toString().trim() || undefined
    const registrationStatus = (req.query.registrationStatus || '').toString().trim() || undefined

    const cacheKey = JSON.stringify({ page, size, q, ueiSAM, legalBusinessName, naicsCode, registrationStatus })
    const cached = samgovEntityCache.get(cacheKey)
    if (cached && Date.now() - cached.ts < SAMGOV_CACHE_TTL_MS) {
      res.setHeader('X-Cache', 'HIT')
      return res.json(cached.payload)
    }
    res.setHeader('X-Cache', 'MISS')

    const apiUrl = 'https://api.sam.gov/entity-information/v4/entities'
    const params = { api_key: req.samgovApiKey, page, size, ...(q ? { q } : {}), ...(ueiSAM ? { ueiSAM } : {}), ...(legalBusinessName ? { legalBusinessName } : {}), ...(naicsCode ? { naicsCode } : {}), ...(registrationStatus ? { registrationStatus } : {}) }
    const response = await axios.get(apiUrl, { params, timeout: 20000, validateStatus: () => true })
    const raw = response.data
    const items = Array.isArray(raw?.entityData) ? raw.entityData : Array.isArray(raw?.entities) ? raw.entities : Array.isArray(raw?.results) ? raw.results : Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : []

    if (!items.length) {
      return res.status(404).json({
        error: 'No entities found',
        message: 'Try adjusting q/name/ueiSAM/naicsCode/registrationStatus filters.',
        hint: 'Example: /api/example/samgov/databank?q=information%20technology&size=10',
        docs: 'https://open.gsa.gov/api/entity-api/',
      })
    }

    const transformedData = items.map((e) => {
      const core = e?.entityRegistration || e?.coreData || e || {}
      const addr = core?.physicalAddress || e?.physicalAddress || {}
      const naicsList = e?.naicsList || core?.naicsList || e?.naicsCodes || []
      const businessTypes = e?.businessTypes || core?.businessTypes || []
      const uei = core?.ueiSAM || e?.ueiSAM || e?.uei || ''
      const entityName = core?.legalBusinessName || e?.legalBusinessName || e?.entityName || ''
      const naicsPrimary = e?.naicsCode || core?.naicsCode || (Array.isArray(naicsList) && naicsList[0]?.naicsCode) || ''
      return {
        ueiSAM: uei,
        legalBusinessName: entityName,
        registrationStatus: core?.registrationStatus || e?.registrationStatus || '',
        registrationDate: core?.registrationDate || e?.registrationDate || '',
        expirationDate: core?.expirationDate || e?.expirationDate || '',
        cageCode: core?.cageCode || e?.cageCode || '',
        naicsCode: naicsPrimary,
        state: addr?.stateOrProvinceCode || addr?.state || e?.state || '',
        country: addr?.countryCode || addr?.country || e?.country || '',
        businessTypes: Array.isArray(businessTypes) ? businessTypes.map((b) => b?.businessTypeDesc || b?.businessTypeCode || b).filter(Boolean).join('; ') : String(businessTypes || ''),
        samEntityLink: uei ? `https://sam.gov/entity/${uei}` : '',
      }
    })

    const columns = Object.keys(transformedData[0] || {})
    const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(transformedData, columns)
    const safeNumericColumns = numericColumns.filter((c) => !FORCE_CATEGORICAL_SAMGOV_ENTITY.has(c))
    const safeCategoricalColumns = Array.from(new Set([...categoricalColumns, ...FORCE_CATEGORICAL_SAMGOV_ENTITY]))
    const processedData = processDataPreservingNumbers(transformedData, safeNumericColumns)

    const payload = {
      data: processedData,
      columns,
      numericColumns: safeNumericColumns,
      categoricalColumns: safeCategoricalColumns,
      dateColumns,
      rowCount: processedData.length,
      source: 'SAM.gov Entity Information API (Data Bank)',
      filters: { page, size, q, ueiSAM, legalBusinessName, naicsCode, registrationStatus },
    }
    samgovEntityCache.set(cacheKey, { ts: Date.now(), payload })
    return res.json(payload)
  } catch (error) {
    console.error('Error fetching SAM.gov entity data bank:', error.message)
    const status = error.response?.status
    const data = error.response?.data
    if (status) return res.status(502).json({ error: 'SAM.gov API error', status, message: data?.message || data?.error || error.message, hint: status === 400 ? 'Entity API may reject page size > 10. Try size=10.' : undefined, docs: 'https://open.gsa.gov/api/entity-api/' })
    return res.status(500).json({ error: 'Failed to fetch SAM.gov data bank', message: error.message, docs: 'https://open.gsa.gov/api/entity-api/' })
  }
})

module.exports = router
