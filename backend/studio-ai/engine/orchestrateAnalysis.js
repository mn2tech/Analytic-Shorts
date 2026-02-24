function chooseTimeColumn(datasetProfile, template, overrides) {
  const cols = Array.isArray(datasetProfile?.columns) ? datasetProfile.columns : []
  const timeCols = cols.filter((c) => c?.roleCandidate === 'time').map((c) => c.name)
  const overrideTime = overrides?.timeField && String(overrides.timeField).trim()
  if (overrideTime && cols.some((c) => c?.name === overrideTime)) {
    return overrideTime
  }
  if (timeCols.length === 0) return null
  if (template && template.id !== 'general' && Array.isArray(template.timeFieldHints) && template.timeFieldHints.length > 0) {
    const lower = (s) => String(s || '').toLowerCase()
    for (const h of template.timeFieldHints) {
      const hit = timeCols.find((t) => lower(t) === lower(h) || lower(t).includes(lower(h)))
      if (hit) return hit
    }
  }
  return timeCols[0] || null
}

function chooseMeasures(datasetProfile, { limit = 5 } = {}) {
  const cols = Array.isArray(datasetProfile?.columns) ? datasetProfile.columns : []
  const measures = cols
    .filter((c) => (c?.roleCandidate === 'measure' || c?.inferredType === 'number'))
    .filter((c) => c?.roleCandidate !== 'time' && c?.roleCandidate !== 'id' && c?.roleCandidate !== 'geo')
  // Stable: prefer explicit "measure", then lowest nullPct, then name
  measures.sort((a, b) => {
    const am = a.roleCandidate === 'measure' ? 0 : 1
    const bm = b.roleCandidate === 'measure' ? 0 : 1
    if (am !== bm) return am - bm
    if ((a.nullPct || 0) !== (b.nullPct || 0)) return (a.nullPct || 0) - (b.nullPct || 0)
    return String(a.name).localeCompare(String(b.name))
  })
  return measures.slice(0, limit).map((c) => c.name)
}

function dimensionPriorityBoost(name, template, focusDimensions) {
  const lower = (s) => String(s || '').toLowerCase()
  if (Array.isArray(focusDimensions) && focusDimensions.length > 0) {
    const idx = focusDimensions.findIndex((p) => lower(p) === lower(name) || lower(name).includes(lower(p)))
    if (idx >= 0) return focusDimensions.length - idx + 100
  }
  if (!template || template.id === 'general' || !Array.isArray(template.dimensionPriority)) return 0
  const idx = template.dimensionPriority.findIndex((p) => lower(p) === lower(name) || lower(name).includes(lower(p)))
  return idx >= 0 ? template.dimensionPriority.length - idx : 0
}

function chooseDimension(datasetProfile, template, focusDimensions) {
  const cols = Array.isArray(datasetProfile?.columns) ? datasetProfile.columns : []
  const rowCount = datasetProfile?.datasetStats?.profiledRowCount || datasetProfile?.datasetStats?.rowCount || 0
  const candidates = cols.filter((c) => c && (c.roleCandidate === 'dimension' || c.roleCandidate === 'geo') && c.inferredType !== 'object')
  const filtered = candidates
    .filter((c) => c.roleCandidate !== 'id' && c.roleCandidate !== 'text')
    .filter((c) => {
      const d = c.distinctCount || 0
      if (d < 2) return false
      if (rowCount && d > Math.min(200, rowCount * 0.95)) return false
      return true
    })
  filtered.sort((a, b) => {
    const aBoost = dimensionPriorityBoost(a.name, template, focusDimensions)
    const bBoost = dimensionPriorityBoost(b.name, template, focusDimensions)
    if (aBoost !== bBoost) return bBoost - aBoost
    const ag = a.roleCandidate === 'geo' ? 0 : 1
    const bg = b.roleCandidate === 'geo' ? 0 : 1
    if (ag !== bg) return ag - bg
    const ad = a.distinctCount || 0
    const bd = b.distinctCount || 0
    const ap = ad <= 20 ? 0 : 1
    const bp = bd <= 20 ? 0 : 1
    if (ap !== bp) return ap - bp
    if (ad !== bd) return ad - bd
    return String(a.name).localeCompare(String(b.name))
  })
  return filtered[0]?.name || null
}

function chooseTopDimensions(datasetProfile, { limit = 3, template, focusDimensions } = {}) {
  const cols = Array.isArray(datasetProfile?.columns) ? datasetProfile.columns : []
  const rowCount = datasetProfile?.datasetStats?.profiledRowCount || datasetProfile?.datasetStats?.rowCount || 0
  const dims = cols
    .filter((c) => c && (c.roleCandidate === 'dimension' || c.roleCandidate === 'geo') && c.inferredType === 'string')
    .filter((c) => c.roleCandidate !== 'id' && c.roleCandidate !== 'text')
    .filter((c) => {
      const d = c.distinctCount || 0
      if (d < 2) return false
      if (rowCount && d > Math.min(300, rowCount * 0.95)) return false
      return true
    })
  dims.sort((a, b) => {
    const aBoost = dimensionPriorityBoost(a.name, template, focusDimensions)
    const bBoost = dimensionPriorityBoost(b.name, template, focusDimensions)
    if (aBoost !== bBoost) return bBoost - aBoost
    const ap = /(category|region|product)/i.test(String(a.name)) ? 0 : 1
    const bp = /(category|region|product)/i.test(String(b.name)) ? 0 : 1
    if (ap !== bp) return ap - bp
    const ad = a.distinctCount || 0
    const bd = b.distinctCount || 0
    const aok = ad <= 30 ? 0 : 1
    const bok = bd <= 30 ? 0 : 1
    if (aok !== bok) return aok - bok
    if (ad !== bd) return ad - bd
    return String(a.name).localeCompare(String(b.name))
  })
  return dims.slice(0, limit).map((d) => d.name)
}

function chooseGeoConfig(datasetProfile) {
  const cols = Array.isArray(datasetProfile?.columns) ? datasetProfile.columns : []
  const byName = new Map(cols.map((c) => [c.name, c]))
  const lat = cols.find((c) => /(^|__)(lat|latitude)$/i.test(String(c.name)))?.name || null
  const lon = cols.find((c) => /(^|__)(lon|lng|longitude)$/i.test(String(c.name)))?.name || null
  const region = cols.find((c) => /(state|country)$/i.test(String(c.name)) && c.roleCandidate === 'geo')?.name
    || cols.find((c) => /(state|country)$/i.test(String(c.name)))?.name
    || null
  if (lat && lon) return { geoMode: 'points', latColumn: lat, lonColumn: lon }
  if (region) return { geoMode: 'region', regionColumn: region }
  return null
}

function isNullLike(v) {
  return v === null || v === undefined || v === ''
}

function parseDate(v) {
  if (isNullLike(v)) return null
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v
  if (typeof v === 'number') {
    if (Number.isInteger(v) && v >= 1900 && v <= 2100) return new Date(Date.UTC(v, 0, 1))
    if (v > 10_000_000_000) {
      const d = new Date(v)
      return Number.isNaN(d.getTime()) ? null : d
    }
    if (v > 1_000_000_000 && v < 10_000_000_000) {
      const d = new Date(v * 1000)
      return Number.isNaN(d.getTime()) ? null : d
    }
    return null
  }
  const s = String(v).trim()
  if (/^\d{4}$/.test(s)) {
    const y = Number(s)
    if (Number.isInteger(y) && y >= 1900 && y <= 2100) return new Date(Date.UTC(y, 0, 1))
  }
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

function chooseTimeGrain(canonicalDataset, timeColumn, template) {
  const rows = Array.isArray(canonicalDataset?.rows) ? canonicalDataset.rows : []
  if (!timeColumn || !rows.length) return 'day'

  const defaultGrain = template && template.id !== 'general' && template.defaultTimeGrain ? template.defaultTimeGrain : null
  if (defaultGrain && ['day', 'week', 'month'].includes(defaultGrain)) {
    let minT = null
    let maxT = null
    let parsed = 0
    for (const r of rows) {
      const d = parseDate(r?.[timeColumn])
      if (!d) continue
      parsed++
      const t = d.getTime()
      if (minT === null || t < minT) minT = t
      if (maxT === null || t > maxT) maxT = t
      if (parsed >= 5000) break
    }
    if (minT !== null && maxT !== null) return defaultGrain
  }

  let minT = null
  let maxT = null
  const days = new Set()
  let parsed = 0
  for (const r of rows) {
    const d = parseDate(r?.[timeColumn])
    if (!d) continue
    parsed++
    const t = d.getTime()
    if (minT === null || t < minT) minT = t
    if (maxT === null || t > maxT) maxT = t
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
    days.add(key)
    if (parsed >= 5000) break
  }
  if (minT === null || maxT === null) return 'day'
  const spanDays = Math.max(0, Math.round((maxT - minT) / 86400000))
  const dayCount = Math.max(1, days.size)
  const density = parsed / dayCount

  if (spanDays <= 45 && density >= 0.75) return 'day'
  if (spanDays <= 180 && density >= 0.3) return 'week'
  return 'month'
}

function clamp01(v) {
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(1, v))
}

function computeDataQualityPenalty(datasetProfile) {
  const q = datasetProfile?.quality || {}
  const dup = Number.isFinite(q.duplicatesPct) ? q.duplicatesPct : 0
  const missingTop = Array.isArray(q.missingnessSummary) ? q.missingnessSummary : []
  const miss = missingTop.length ? Math.max(...missingTop.map((m) => (Number.isFinite(m?.nullPct) ? m.nullPct : 0))) : 0
  const issues = Array.isArray(q.parseIssues) ? q.parseIssues.length : 0
  // Score is intentionally conservative; used only for trust-badging.
  const penalty = clamp01(dup * 0.6 + miss * 0.9 + Math.min(0.5, issues / 20) * 0.5)
  return penalty
}

function orchestrateAnalysis(datasetProfile, semanticGraph, canonicalDataset, options = {}) {
  const template = options && options.template && options.template.id ? options.template : null
  const overrides = options && options.overrides && typeof options.overrides === 'object' ? options.overrides : {}
  const focusDimensions = Array.isArray(overrides.focusDimensions) ? overrides.focusDimensions : []
  const enabledBlocks = overrides.enabledBlocks && typeof overrides.enabledBlocks === 'object' ? overrides.enabledBlocks : null
  const blockOrder = Array.isArray(overrides.blockOrder) ? overrides.blockOrder : null
  const topNLimit = Number.isFinite(overrides.topNLimit) && overrides.topNLimit >= 1 && overrides.topNLimit <= 100 ? overrides.topNLimit : null
  const breakdownDimensionOverride = overrides.breakdownDimension && String(overrides.breakdownDimension).trim() ? overrides.breakdownDimension.trim() : null
  const compareMode = ['half', 'last30', 'last90'].includes(String(overrides.compareMode || '').toLowerCase()) ? String(overrides.compareMode).toLowerCase() : null

  const isGovcon = template && template.id === 'govcon'
  const timeColumn = chooseTimeColumn(datasetProfile, template, overrides)
  const measures = chooseMeasures(datasetProfile, { limit: 5 })
  const primaryMeasure = semanticGraph?.primaryMeasure || measures[0] || null
  let grain = chooseTimeGrain(canonicalDataset, timeColumn, template)
  if (overrides.timeGrain && ['day', 'week', 'month'].includes(String(overrides.timeGrain).toLowerCase())) {
    grain = String(overrides.timeGrain).toLowerCase()
  }
  if (isGovcon && timeColumn && !overrides.timeGrain) grain = 'week'
  const dataQualityPenalty = computeDataQualityPenalty(datasetProfile)
  const dimension = chooseDimension(datasetProfile, template, focusDimensions)
  const topDims = chooseTopDimensions(datasetProfile, { limit: 5, template, focusDimensions })
  const geo = chooseGeoConfig(datasetProfile)
  const driverDims = isGovcon
    ? (topDims.filter((d) => /agency|naics|set_aside|state/i.test(String(d))) || topDims.slice(0, 3))
    : topDims

  const driverLimit = topNLimit != null ? Math.min(30, Math.max(1, topNLimit)) : 12
  const compareLimit = topNLimit != null ? Math.min(30, Math.max(1, topNLimit)) : 12
  const topNBlockLimit = topNLimit != null ? Math.min(50, Math.max(1, topNLimit)) : 10

  let blocks = []
  blocks.push({ type: 'KPIBlock' })
  if (timeColumn) blocks.push({ type: 'TrendBlock', timeColumn, grain, measure: primaryMeasure || undefined, agg: primaryMeasure ? 'sum' : 'count' })
  if (primaryMeasure && (driverDims.length || topDims.length)) blocks.push({ type: 'DriverBlock', measure: primaryMeasure, dimensions: driverDims.length ? driverDims : topDims, limit: driverLimit })

  const geoLikeDim = topDims.find((d) => /region|zone|area|district|territory/i.test(String(d))) || null
  if (geo) blocks.push({ type: 'GeoBlock', ...geo, measure: primaryMeasure || undefined, agg: primaryMeasure ? 'sum' : 'count' })
  else if (geoLikeDim) blocks.push({ type: 'GeoLikeBlock', dimension: geoLikeDim, measure: primaryMeasure || undefined, agg: primaryMeasure ? 'sum' : 'count', limit: topNBlockLimit })
  else blocks.push({ type: 'GeoBlock' })

  blocks.push({ type: 'DetailsTableBlock', previewRows: 50 })

  if (timeColumn && primaryMeasure && topDims.length) {
    const compareDims = topDims.filter((d) => /(category|region)/i.test(String(d))).slice(0, 2)
    const compareBlock = { type: 'ComparePeriodsBlock', timeColumn, measure: primaryMeasure, dimensions: compareDims, limit: compareLimit }
    if (compareMode) compareBlock.compareMode = compareMode
    blocks.push(compareBlock)
  }
  if (semanticGraph?.enableAnomaly) {
    blocks.push({ type: 'AnomalyBlock', enabled: true })
  }

  blocks.push({ type: 'DataQualityBlock' })

  if (enabledBlocks && Object.keys(enabledBlocks).length > 0) {
    blocks = blocks.filter((b) => {
      const enabled = enabledBlocks[b.type]
      if (enabled === false) return false
      if (enabled === true) return true
      return true
    })
  }

  if (blockOrder && blockOrder.length > 0) {
    const orderMap = new Map(blockOrder.map((t, i) => [t, i]))
    blocks.sort((a, b) => {
      const ai = orderMap.has(a.type) ? orderMap.get(a.type) : 9999
      const bi = orderMap.has(b.type) ? orderMap.get(b.type) : 9999
      if (ai !== bi) return ai - bi
      return 0
    })
  }

  if (breakdownDimensionOverride) {
    blocks = blocks.map((b) => {
      if (b.type === 'TopNBlock' || b.type === 'BreakdownBlock') {
        return { ...b, dimension: breakdownDimensionOverride }
      }
      return b
    })
  }

  return {
    version: '1.0',
    builtAt: new Date().toISOString(),
    blocks,
    selections: { timeColumn, grain, measures, primaryMeasure, dimension, topDims, geo, dataQualityPenalty },
  }
}

module.exports = { orchestrateAnalysis }

