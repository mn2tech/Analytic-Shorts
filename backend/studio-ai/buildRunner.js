/**
 * Studio build runner - core pipeline from canonical dataset to build response.
 * Used by POST /api/studio/build and POST /api/upload/analyze.
 */

const { stableRowSample } = require('./data-connectors/normalizer')
const { profileDataset } = require('./engine/profileDataset')
const { buildSemanticGraph } = require('./engine/buildSemanticGraph')
const { orchestrateAnalysis } = require('./engine/orchestrateAnalysis')
const { executePlan } = require('./engine/executePlan')
const { buildSceneGraph } = require('./engine/buildSceneGraph')
const { persistStudioRun } = require('./persistence/runs')
const { getTemplate } = require('./templates/templates')
const { detectDatasetIntent, deriveFields, selectPrimaryMetric, assembleEvidence } = require('./evidence')

function applyFilters(rows, f) {
  if (!f || typeof f !== 'object') return rows
  let out = Array.isArray(rows) ? rows : []
  if (f.timeRange && typeof f.timeRange === 'object') {
    const col = String(f.timeRange.column || '').trim()
    const start = f.timeRange.start ? new Date(f.timeRange.start) : null
    const end = f.timeRange.end ? new Date(f.timeRange.end) : null
    if (col && (start || end)) {
      out = out.filter((r) => {
        const v = r?.[col]
        if (v == null || v === '') return false
        const d = new Date(v)
        if (Number.isNaN(d.getTime())) return false
        if (start && d < start) return false
        if (end && d > end) return false
        return true
      })
    }
  }
  if (f.eq && typeof f.eq === 'object') {
    for (const [k, v] of Object.entries(f.eq)) {
      const col = String(k || '').trim()
      if (!col) continue
      out = out.filter((r) => String(r?.[col] ?? '') === String(v ?? ''))
    }
  }
  const searchTerm = typeof f.search === 'string' ? f.search.trim() : ''
  if (searchTerm) {
    const lower = searchTerm.toLowerCase()
    const searchCols = out.length ? Object.keys(out[0] || {}).filter((k) => typeof (out[0]?.[k]) === 'string') : []
    if (searchCols.length) {
      out = out.filter((r) =>
        searchCols.some((col) => String(r?.[col] ?? '').toLowerCase().includes(lower))
      )
    }
  }
  return out
}

/**
 * Run Studio build from canonical dataset (connector output).
 * @param {Object} canonical - { schema, rows, metadata } from connectorFactory
 * @param {Object} options - { filters, overrides, templateId, sourceConfig }
 * @returns {Promise<Object>} Build response { runId, evidence, datasetProfile, insightBlocks, sceneGraph, template }
 */
async function runStudioBuildFromCanonical(canonical, options = {}) {
  const filters = options.filters || null
  const overrides = options.overrides || {}
  const templateId = (overrides.templateId != null && overrides.templateId !== '') ? overrides.templateId : (options.templateId || 'general')
  const sourceConfig = options.sourceConfig || null
  const template = getTemplate(templateId)

  const filteredRows = applyFilters(canonical.rows || [], filters)
  let canonicalForRun = {
    schema: canonical.schema || [],
    rows: filteredRows,
    metadata: { ...(canonical.metadata || {}), rowCount: filteredRows.length },
  }

  const initialProfile = profileDataset(canonicalForRun, { maxProfileRows: 5000, sampleValuesLimit: 8 })
  let { rows: derivedRows, addedColumns } = deriveFields(canonicalForRun.rows, initialProfile)
  const hasRevenueFromDerive = addedColumns.some((c) => String(c.name).toLowerCase() === 'revenue')
  if (!hasRevenueFromDerive && derivedRows.length > 0) {
    const norm = (s) => String(s || '').toLowerCase().trim().replace(/\s+/g, '_')
    const priceKeys = ['unit_price', 'price', 'unit_price_amount', 'unit_cost', 'selling_price', 'list_price', 'amount', 'total', 'amt']
    let priceKey = null
    let discountKey = null
    const sample = derivedRows.slice(0, 100)
    const first = derivedRows[0]
    if (first && typeof first === 'object') {
      for (const k of Object.keys(first)) {
        const nk = norm(k)
        if (priceKeys.some((pk) => nk === pk || nk.includes(pk))) {
          const hasNumeric = sample.some((r) => {
            const v = r[k]
            return v !== null && v !== undefined && v !== '' && !Number.isNaN(Number(String(v).replace(/[$,\s]/g, '')))
          })
          if (hasNumeric) {
            priceKey = k
            break
          }
        }
        if (discountKey == null && (nk === 'discount' || nk === 'discount_amount')) discountKey = k
      }
    }
    if (priceKey) {
      for (const r of derivedRows) {
        const p = r[priceKey]
        const pNum = p !== null && p !== undefined && p !== '' ? Number(String(p).replace(/[$,\s]/g, '')) : NaN
        if (Number.isFinite(pNum)) {
          let rev = pNum
          if (discountKey != null) {
            const d = r[discountKey]
            const dNum = d !== null && d !== undefined && d !== '' ? Number(String(d).replace(/[$,\s]/g, '')) : NaN
            if (Number.isFinite(dNum)) rev -= dNum
          }
          r.revenue = rev
        }
      }
      addedColumns = [...addedColumns, { name: 'revenue', inferredType: 'number' }]
    }
  }
  if (addedColumns.length > 0) {
    canonicalForRun = {
      ...canonicalForRun,
      rows: derivedRows,
      schema: [...(canonicalForRun.schema || []), ...addedColumns],
    }
  }

  const datasetProfile = profileDataset(canonicalForRun, { maxProfileRows: 5000, sampleValuesLimit: 8 })
  const intent = detectDatasetIntent(datasetProfile)
  let primaryMetric = selectPrimaryMetric(datasetProfile, intent, canonicalForRun.rows)
  const derivedRevenue = addedColumns.some((c) => String(c.name).toLowerCase() === 'revenue')
  const profileHasRevenue = (datasetProfile?.columns || []).some((c) => String(c.name).toLowerCase() === 'revenue')
  if (derivedRevenue || profileHasRevenue) {
    const revenueCol = (datasetProfile?.columns || []).find((c) => String(c.name).toLowerCase() === 'revenue')
    primaryMetric = revenueCol ? revenueCol.name : 'revenue'
  }

  const buildOptions = {
    template,
    overrides: { ...overrides, primaryMeasure: primaryMetric || overrides.primaryMeasure },
  }
  const semanticGraph = buildSemanticGraph(datasetProfile, canonicalForRun, buildOptions)
  const analysisPlan = orchestrateAnalysis(datasetProfile, semanticGraph, canonicalForRun, buildOptions)
  let insightBlocks = executePlan(canonicalForRun, semanticGraph, analysisPlan, { maxComputeRows: 20000, templateId })
  const useRevenue = (derivedRevenue || profileHasRevenue) && primaryMetric && String(primaryMetric).toLowerCase() === 'revenue'
  if (useRevenue) {
    insightBlocks = insightBlocks.map((b) => {
      if (!b || !b.payload) return b
      const payload = { ...b.payload }
      if (b.type === 'KPIBlock') payload.primaryMeasure = primaryMetric
      if (b.type === 'TrendBlock' || b.type === 'DriverBlock' || b.type === 'GeoLikeBlock') payload.measure = primaryMetric
      if (payload.executiveKpis) payload.executiveKpis = { ...payload.executiveKpis, measure: primaryMetric }
      return { ...b, payload }
    })
  }

  const sceneGraph = buildSceneGraph({ insightBlocks, datasetProfile, templateId, overrides })
  const evidence = assembleEvidence({ profile: datasetProfile, intent, primaryMetric, blocks: insightBlocks })

  const persisted = await persistStudioRun({
    sourceConfig,
    canonicalDataset: canonicalForRun,
    datasetProfile,
    semanticGraph,
    analysisPlan,
    insightBlocks,
    sceneGraph,
  })

  return {
    runId: persisted.runId,
    persisted: persisted.persisted,
    evidence,
    datasetProfile,
    semanticGraph,
    insightBlocks,
    sceneGraph,
    template: { id: template.id, name: template.name },
  }
}

module.exports = { runStudioBuildFromCanonical }
