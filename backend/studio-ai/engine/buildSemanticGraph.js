function safeNumber(v) {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const s = String(v).trim()
  if (!s) return null
  const cleaned = s.replace(/[$,\s]/g, '')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function pickPrimaryMeasureName(candidates) {
  const prefs = ['sales', 'revenue', 'amount', 'cost', 'spend', 'income']
  const lower = (s) => String(s || '').toLowerCase()
  for (const p of prefs) {
    const hit = candidates.find((c) => lower(c).includes(p))
    if (hit) return hit
  }
  return null
}

function matchFromHints(candidates, hints) {
  if (!Array.isArray(hints) || hints.length === 0) return null
  const lower = (s) => String(s || '').toLowerCase().trim()
  const norm = (s) => lower(s).replace(/\s+/g, '_')
  const candSet = new Set(candidates.map(lower))
  const candNorm = new Map(candidates.map((c) => [norm(c), c]))
  for (const h of hints) {
    const hh = lower(h)
    if (candSet.has(hh)) return candidates.find((c) => lower(c) === hh)
    const hit = candidates.find((c) => lower(c).includes(hh) || hh.includes(lower(c)))
    if (hit) return hit
    const hn = norm(h)
    if (candNorm.has(hn)) return candNorm.get(hn)
    const includeNorm = [...candNorm.entries()].find(([k]) => k.includes(hn) || hn.includes(k))
    if (includeNorm) return includeNorm[1]
  }
  return null
}

function computeVarianceStats(rows, col) {
  let n = 0
  let mean = 0
  let m2 = 0
  for (const r of rows) {
    const x = safeNumber(r?.[col])
    if (x === null) continue
    n++
    const delta = x - mean
    mean += delta / n
    const delta2 = x - mean
    m2 += delta * delta2
    if (n >= 8000) break
  }
  const variance = n > 1 ? m2 / (n - 1) : 0
  return { n, mean, variance }
}

function selectPrimaryMeasure({ datasetProfile, canonicalDataset, template }) {
  const cols = Array.isArray(datasetProfile?.columns) ? datasetProfile.columns : []
  const rows = Array.isArray(canonicalDataset?.rows) ? canonicalDataset.rows : []
  const candidates = cols
    .filter((c) => c && (c.roleCandidate === 'measure' || c.inferredType === 'number'))
    .filter((c) => c.roleCandidate !== 'time' && c.roleCandidate !== 'id' && c.roleCandidate !== 'geo')
    .map((c) => c.name)

  if (candidates.length === 0) return null

  if (template && template.id !== 'general' && Array.isArray(template.primaryMeasureHints) && template.primaryMeasureHints.length > 0) {
    const fromHints = matchFromHints(candidates, template.primaryMeasureHints)
    if (fromHints) return fromHints
  }

  const preferred = pickPrimaryMeasureName(candidates)
  if (preferred) return preferred

  const stats = candidates.map((c) => ({ name: c, ...computeVarianceStats(rows, c) }))
  const nonZeroMean = stats.filter((s) => Math.abs(s.mean || 0) > 1e-9 && s.n >= 3)
  const pool = nonZeroMean.length ? nonZeroMean : stats
  pool.sort((a, b) => (b.variance - a.variance) || String(a.name).localeCompare(String(b.name)))
  return pool[0]?.name || candidates[0]
}

function buildSemanticGraph(datasetProfile, canonicalDataset, options = {}) {
  const template = options && options.template && options.template.id ? options.template : null
  const overrides = options && options.overrides && typeof options.overrides === 'object' ? options.overrides : {}
  const cols = Array.isArray(datasetProfile?.columns) ? datasetProfile.columns : []
  const columns = {}
  for (const c of cols) {
    if (!c?.name) continue
    columns[c.name] = {
      name: c.name,
      roleCandidate: c.roleCandidate || 'dimension',
      inferredType: c.inferredType || 'string',
      nullPct: c.nullPct,
      distinctCount: c.distinctCount,
    }
  }
  let primaryMeasure = canonicalDataset
    ? selectPrimaryMeasure({ datasetProfile, canonicalDataset, template })
    : null
  const overrideMeasure = overrides.primaryMeasure && String(overrides.primaryMeasure).trim()
  if (overrideMeasure) {
    if (columns[overrideMeasure]) {
      primaryMeasure = overrideMeasure
    } else {
      const lower = (s) => String(s || '').toLowerCase()
      const match = Object.keys(columns).find((k) => lower(k) === lower(overrideMeasure))
      if (match) primaryMeasure = match
    }
  }
  return {
    version: '1.0',
    builtAt: new Date().toISOString(),
    columns,
    primaryMeasure,
    overridesUsed: overrideMeasure ? { primaryMeasure: overrideMeasure } : undefined,
  }
}

module.exports = { buildSemanticGraph }

