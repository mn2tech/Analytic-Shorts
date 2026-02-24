function clamp01(v) {
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(1, v))
}

function isNullLike(v) {
  return v === null || v === undefined || v === ''
}

function normalizeDistinctKey(v) {
  if (isNullLike(v)) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

function safeNumber(v) {
  if (isNullLike(v)) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const s = String(v).trim()
  if (!s) return null
  const cleaned = s.replace(/[$,\s]/g, '')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function looksLikeDateStringStrict(s) {
  const str = String(s || '').trim()
  if (!str) return false
  if (/^\d{4}$/.test(str)) return false
  return (
    /^\d{4}-\d{1,2}-\d{1,2}/.test(str) ||
    /^\d{4}\/\d{1,2}\/\d{1,2}/.test(str) ||
    /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(str) ||
    /^\d{1,2}-\d{1,2}-\d{2,4}/.test(str) ||
    /^\d{4}-\d{2}-\d{2}T/.test(str) ||
    /^\d{4}-\d{2}-\d{2}\s/.test(str)
  )
}

function parseDate(v) {
  if (isNullLike(v)) return null
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v
  if (typeof v === 'number') {
    // Support numeric year columns (e.g. 2024) when used as time.
    if (Number.isInteger(v) && v >= 1900 && v <= 2100) {
      return new Date(Date.UTC(v, 0, 1))
    }
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
  if (!looksLikeDateStringStrict(s)) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

function startOfGrain(d, grain) {
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  if (grain === 'day') return `${yyyy}-${mm}-${dd}`
  if (grain === 'month') return `${yyyy}-${mm}-01`
  const day = d.getUTCDay() || 7
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  start.setUTCDate(start.getUTCDate() - (day - 1))
  const smm = String(start.getUTCMonth() + 1).padStart(2, '0')
  const sdd = String(start.getUTCDate()).padStart(2, '0')
  return `${start.getUTCFullYear()}-${smm}-${sdd}`
}

function formatNumberShort(n) {
  if (!Number.isFinite(n)) return '—'
  const abs = Math.abs(n)
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${(n / 1_000).toFixed(2)}K`
  return `${Math.round(n * 100) / 100}`
}

function formatPct(p) {
  if (!Number.isFinite(p)) return '—'
  const v = p * 100
  return `${Math.round(v * 10) / 10}%`
}

/** Deterministic anomaly detection: z-score on first differences. Returns array of period strings to mark. */
function simpleAnomalyDetection(series, threshold = 2) {
  if (!Array.isArray(series) || series.length < 4) return []
  const vals = series.map((s) => Number(s.sum ?? s.count ?? 0))
  const diffs = []
  for (let i = 1; i < vals.length; i++) {
    const d = vals[i] - vals[i - 1]
    if (Number.isFinite(d)) diffs.push(d)
  }
  if (diffs.length < 2) return []
  const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length
  const variance = diffs.reduce((a, d) => a + (d - mean) ** 2, 0) / diffs.length
  const std = Math.sqrt(variance) || 1e-9
  const out = []
  for (let i = 0; i < diffs.length; i++) {
    if (Math.abs(diffs[i] - mean) > threshold * std) out.push(series[i + 1].t)
  }
  return out
}

/** Heuristic: do keys look like US state codes (2-letter) or names? */
function looksLikeUSStateKeys(rows, sampleSize = 10) {
  const keys = (rows || []).slice(0, sampleSize).map((r) => String(r?.key ?? '').trim())
  const twoLetter = /^[A-Za-z]{2}$/
  const matchCount = keys.filter((k) => twoLetter.test(k) && k.length === 2).length
  return keys.length > 0 && matchCount >= Math.min(3, keys.length)
}

function computeTimeCoverage(rows, timeCol) {
  if (!timeCol) return null
  let minT = null
  let maxT = null
  let parsed = 0
  for (const r of rows) {
    const d = parseDate(r?.[timeCol])
    if (!d) continue
    parsed++
    const t = d.getTime()
    if (minT === null || t < minT) minT = t
    if (maxT === null || t > maxT) maxT = t
    if (parsed >= 8000) break
  }
  if (minT === null || maxT === null) return null
  const coverageDays = Math.max(0, Math.round((maxT - minT) / 86400000))
  const minIso = new Date(minT).toISOString().slice(0, 10)
  const maxIso = new Date(maxT).toISOString().slice(0, 10)
  return { minT, maxT, minIso, maxIso, coverageDays, parsed }
}

function computeBadges({ sampleSize, timeCoverage, dataQualityPenalty }) {
  const badges = []
  const ss = Number.isFinite(sampleSize) ? sampleSize : 0
  badges.push({
    id: 'sampleSize',
    label: `Sample ${ss}`,
    status: ss >= 50 ? 'OK' : 'WARN',
  })
  if (timeCoverage) {
    badges.push({
      id: 'timeCoverage',
      label: `Time ${timeCoverage.minIso}→${timeCoverage.maxIso}`,
      status: timeCoverage.coverageDays >= 30 ? 'OK' : 'WARN',
    })
  }
  const p = Number.isFinite(dataQualityPenalty) ? clamp01(dataQualityPenalty) : 0
  badges.push({
    id: 'dataQualityPenalty',
    label: `Quality penalty ${Math.round(p * 100)}%`,
    status: p <= 0.25 ? 'OK' : 'WARN',
  })
  return badges
}

function computeExecutiveTimeKpis(rows, { timeColumn, grain, measure, contributorDims = [] }) {
  if (!timeColumn || !measure) return null
  const stamped = []
  for (const r of rows) {
    const d = parseDate(r?.[timeColumn])
    if (!d) continue
    const n = safeNumber(r?.[measure])
    if (n === null) continue
    stamped.push({ t: d.getTime(), period: startOfGrain(d, grain), row: r, value: n })
    if (stamped.length >= 20000) break
  }
  if (stamped.length < 3) return null

  const byPeriod = new Map()
  for (const x of stamped) {
    byPeriod.set(x.period, (byPeriod.get(x.period) || 0) + x.value)
  }
  const periods = Array.from(byPeriod.keys()).sort((a, b) => a.localeCompare(b))
  if (periods.length < 2) return null
  const latestPeriod = periods[periods.length - 1]
  const prevPeriod = periods[periods.length - 2]
  const latestValue = byPeriod.get(latestPeriod) ?? 0
  const prevValue = byPeriod.get(prevPeriod) ?? 0
  const deltaAbs = latestValue - prevValue
  const deltaPct = prevValue !== 0 ? deltaAbs / prevValue : null

  stamped.sort((a, b) => a.t - b.t)
  const minT = stamped[0].t
  const maxT = stamped[stamped.length - 1].t
  const rangeMs = Math.max(1, maxT - minT)
  const prevStart = minT - rangeMs
  const prevEnd = minT
  let currentTotal = 0
  let previousTotal = 0
  for (const x of stamped) {
    if (x.t >= minT && x.t <= maxT) currentTotal += x.value
    if (x.t >= prevStart && x.t < prevEnd) previousTotal += x.value
  }
  const rangeDeltaAbs = currentTotal - previousTotal
  const rangeDeltaPct = previousTotal !== 0 ? rangeDeltaAbs / previousTotal : null

  let topContributor = null
  const dim = contributorDims.find(Boolean) || null
  if (dim) {
    const groups = new Map()
    for (const x of stamped) {
      if (x.period !== latestPeriod) continue
      const raw = x.row?.[dim]
      const key = isNullLike(raw) ? '(missing)' : String(raw).trim() || '(blank)'
      groups.set(key, (groups.get(key) || 0) + x.value)
    }
    const groupRows = Array.from(groups.entries()).map(([k, v]) => ({ key: k, value: v }))
    groupRows.sort((a, b) => (b.value - a.value) || a.key.localeCompare(b.key))
    const top = groupRows[0]
    const tot = groupRows.reduce((a, r) => a + r.value, 0) || 0
    if (top) {
      topContributor = {
        dimension: dim,
        group: top.key,
        value: top.value,
        share: tot ? top.value / tot : 0,
      }
    }
  }

  return {
    timeColumn,
    grain,
    measure,
    latest: { period: latestPeriod, value: latestValue },
    previous: { period: prevPeriod, value: prevValue },
    change: { abs: deltaAbs, pct: deltaPct },
    rangeCompare: {
      current: { from: new Date(minT).toISOString().slice(0, 10), to: new Date(maxT).toISOString().slice(0, 10), total: currentTotal },
      previous: { from: new Date(prevStart).toISOString().slice(0, 10), to: new Date(prevEnd).toISOString().slice(0, 10), total: previousTotal },
      change: { abs: rangeDeltaAbs, pct: rangeDeltaPct },
    },
    ...(topContributor ? { topContributor } : {}),
  }
}

function quantile(sortedNums, q) {
  const n = sortedNums.length
  if (!n) return null
  const qq = Math.max(0, Math.min(1, q))
  const idx = (n - 1) * qq
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sortedNums[lo]
  const w = idx - lo
  return sortedNums[lo] * (1 - w) + sortedNums[hi] * w
}

function stableTopN(items, limit) {
  return [...items].sort((a, b) => (b.value - a.value) || a.key.localeCompare(b.key)).slice(0, limit)
}

function detectColumns(dataset, semanticGraph) {
  const schema = Array.isArray(dataset?.schema) ? dataset.schema : []
  const roles = (semanticGraph && semanticGraph.columns) ? semanticGraph.columns : {}
  const getRole = (name) => roles?.[name]?.roleCandidate

  const numeric = schema.filter((c) => c.inferredType === 'number').map((c) => c.name)
  const date = schema
    .filter((c) => c.inferredType === 'date' || /date|time|posted|due|created|updated|deadline|response/i.test(c.name))
    .map((c) => c.name)
  const geo = schema.filter((c) => /state|city|country|lat|latitude|lon|lng|longitude|zip|postal/i.test(c.name)).map((c) => c.name)
  const id = schema.filter((c) => /id|uuid|key|notice|solicitation/i.test(c.name)).map((c) => c.name)

  const timeCols = schema.filter((c) => getRole(c.name) === 'time').map((c) => c.name)
  const geoCols = schema.filter((c) => getRole(c.name) === 'geo').map((c) => c.name)
  const idCols = schema.filter((c) => getRole(c.name) === 'id').map((c) => c.name)
  const measureCols = schema.filter((c) => getRole(c.name) === 'measure').map((c) => c.name)

  const timeSet = new Set(timeCols)
  const geoSet = new Set(geoCols)

  return {
    schema,
    numeric: Array.from(new Set([...measureCols, ...numeric])).filter((c) => !timeSet.has(c) && !geoSet.has(c)),
    date: Array.from(new Set([...timeCols, ...date])),
    geo: Array.from(new Set([...geoCols, ...geo])),
    id: Array.from(new Set([...idCols, ...id])),
  }
}

function isYearTimeColumn(name, values) {
  if (!/(year|yr|fy|fiscal)/i.test(String(name || ''))) return false
  let checked = 0
  let ok = 0
  for (const v of values) {
    const n = safeNumber(v)
    if (n === null) continue
    checked++
    if (Number.isInteger(n) && n >= 1900 && n <= 2100) ok++
    if (checked >= 300) break
  }
  return checked >= 3 && ok / checked >= 0.8
}

function computeLatestAndYoY(rows, timeCol, measureCol) {
  const timeVals = rows.map((r) => r?.[timeCol])
  const isYear = isYearTimeColumn(timeCol, timeVals)
  if (!isYear) return null

  const byYear = new Map()
  for (const r of rows) {
    const y = safeNumber(r?.[timeCol])
    if (y === null || !Number.isInteger(y) || y < 1900 || y > 2100) continue
    const m = safeNumber(r?.[measureCol])
    if (m === null) continue
    byYear.set(y, (byYear.get(y) || 0) + m)
  }
  const years = Array.from(byYear.keys()).sort((a, b) => a - b)
  if (years.length < 2) return null
  const latestYear = years[years.length - 1]
  const prevYear = byYear.has(latestYear - 1) ? latestYear - 1 : years[years.length - 2]
  const latest = byYear.get(latestYear)
  const prev = byYear.get(prevYear)
  if (latest == null || prev == null) return null
  const delta = latest - prev
  const pct = prev !== 0 ? delta / prev : null
  return { timeColumn: timeCol, latestPeriod: latestYear, prevPeriod: prevYear, latestValue: latest, prevValue: prev, delta, pct }
}

function pickTopMeasures(rows, numericCols, { limit = 5 } = {}) {
  const scored = []
  for (const col of numericCols) {
    const nums = []
    let nonNull = 0
    for (const r of rows) {
      const n = safeNumber(r?.[col])
      if (n === null) continue
      nonNull++
      nums.push(n)
      if (nums.length >= 5000) break
    }
    if (nonNull < 2) continue
    nums.sort((a, b) => a - b)
    const min = nums[0]
    const max = nums[nums.length - 1]
    const range = max - min
    const p50 = quantile(nums, 0.5) ?? 0
    const nonTrivial = Math.abs(range) > 0 ? 1 : 0
    const fillRate = nonNull / Math.max(1, rows.length)
    const score = nonTrivial * 1000 + Math.abs(range) + Math.abs(p50) * 0.01 + fillRate * 10
    scored.push({ name: col, score })
  }
  return scored.sort((a, b) => (b.score - a.score) || a.name.localeCompare(b.name)).slice(0, limit).map((s) => s.name)
}

function computeNumericSummary(rows, col) {
  const nums = []
  let nullCount = 0
  for (const r of rows) {
    const n = safeNumber(r?.[col])
    if (n === null) {
      nullCount++
      continue
    }
    nums.push(n)
  }
  nums.sort((a, b) => a - b)
  const count = nums.length
  const min = count ? nums[0] : null
  const max = count ? nums[count - 1] : null
  const mean = count ? nums.reduce((a, b) => a + b, 0) / count : null
  const q = (p) => quantile(nums, p)
  return { count, nullCount, min, max, mean, p10: q(0.1), p25: q(0.25), p50: q(0.5), p75: q(0.75), p90: q(0.9) }
}

function stableRowKey(row) {
  const keys = Object.keys(row || {}).sort()
  const parts = []
  for (const k of keys) parts.push(`${k}=${normalizeDistinctKey(row[k])}`)
  return parts.join('|')
}

function buildId(prefix, idx, extra) {
  const tail = extra ? `-${extra}` : ''
  return `${prefix}-${String(idx + 1).padStart(2, '0')}${tail}`
}

function defaultPlan(dataset, semanticGraph) {
  const cols = detectColumns(dataset, semanticGraph)
  const time = cols.date[0]
  const measure = cols.numeric[0]
  const dimension = (cols.geo.find((c) => /state|country/i.test(c)) || cols.schema.find((c) => c.inferredType === 'string')?.name) ?? ''

  const blocks = [{ type: 'KPIBlock' }]
  if (time) blocks.push({ type: 'TrendBlock', timeColumn: time, grain: 'day', measure, agg: measure ? 'sum' : 'count' })
  if (dimension) blocks.push({ type: 'TopNBlock', dimension, measure, agg: measure ? 'sum' : 'count', limit: 10, includeOther: true })
  if (cols.numeric[0]) blocks.push({ type: 'DistributionBlock', measure: cols.numeric[0], bins: 10 })
  blocks.push({ type: 'GeoBlock' })
  blocks.push({ type: 'DataQualityBlock' })
  blocks.push({ type: 'DetailsTableBlock', previewRows: 50 })
  return { blocks }
}

/** GovCon: find column name by pattern (first match from schema). */
function findColumnByPattern(schema, patterns) {
  const names = (schema || []).map((c) => c && c.name)
  for (const p of patterns) {
    const re = typeof p === 'string' ? new RegExp(p, 'i') : p
    const hit = names.find((n) => re.test(String(n || '')))
    if (hit) return hit
  }
  return null
}

/** GovCon: enrich KPI payload with dueInNext10DaysCount, avgDaysToDue, topAgency, newVsPriorPct. */
function computeGovconKpiExtras(rows, cols, exec) {
  const schema = cols.schema || []
  const dueDateCol = findColumnByPattern(schema, ['due_date', 'dueDate', 'response_deadline', 'deadline', 'due'])
  const agencyCol = findColumnByPattern(schema, ['awarding_agency', 'agency', 'funding_agency', 'Agency'])
  const now = Date.now()
  let dueInNext10DaysCount = null
  let avgDaysToDue = null
  let topAgencyKey = null
  let topAgencyShare = null
  let newVsPriorPct = null
  if (dueDateCol) {
    let dueCount = 0
    let sumDays = 0
    let nDays = 0
    for (const r of rows) {
      const d = parseDate(r?.[dueDateCol])
      if (!d) continue
      const daysToDue = Math.round((d.getTime() - now) / 86400000)
      if (daysToDue >= 0 && daysToDue <= 10) dueCount++
      if (daysToDue >= 0) {
        sumDays += daysToDue
        nDays++
      }
      if (nDays >= 5000) break
    }
    dueInNext10DaysCount = dueCount
    avgDaysToDue = nDays ? Math.round(sumDays / nDays) : null
  }
  if (agencyCol) {
    const byAgency = new Map()
    for (const r of rows) {
      const k = isNullLike(r?.[agencyCol]) ? '(missing)' : String(r[agencyCol]).trim() || '(blank)'
      byAgency.set(k, (byAgency.get(k) || 0) + 1)
    }
    const total = rows.length
    if (total > 0) {
      const sorted = [...byAgency.entries()].sort((a, b) => b[1] - a[1])
      const top = sorted[0]
      if (top) {
        topAgencyKey = top[0]
        topAgencyShare = total ? top[1] / total : 0
      }
    }
  }
  if (exec && exec.change && Number.isFinite(exec.change.pct)) newVsPriorPct = exec.change.pct
  return {
    dueInNext10DaysCount: dueInNext10DaysCount != null ? dueInNext10DaysCount : undefined,
    avgDaysToDue: avgDaysToDue != null ? avgDaysToDue : undefined,
    topAgencyKey: topAgencyKey || undefined,
    topAgencyShare: topAgencyShare != null ? topAgencyShare : undefined,
    newVsPriorPct: newVsPriorPct != null ? newVsPriorPct : undefined,
  }
}

function executePlan(dataset, semanticGraph, analysisPlan, options = {}) {
  const maxComputeRows = Number.isFinite(options.maxComputeRows) ? Math.max(1, options.maxComputeRows) : 20000
  const templateId = options.templateId || 'general'
  const isGovcon = templateId === 'govcon'
  const rowsAll = Array.isArray(dataset?.rows) ? dataset.rows : []
  const rows = rowsAll.slice(0, Math.min(rowsAll.length, maxComputeRows))
  const sampleSize = rows.length

  const cols = detectColumns(dataset, semanticGraph || undefined)
  const plan = analysisPlan && Array.isArray(analysisPlan.blocks) && analysisPlan.blocks.length ? analysisPlan : defaultPlan(dataset, semanticGraph || undefined)

  const blocks = []
  const planSelections = plan?.selections || {}
  const defaultTimeCol = planSelections?.timeColumn || cols.date[0] || null
  const defaultTimeCoverage = computeTimeCoverage(rows, defaultTimeCol)
  const defaultBadges = computeBadges({ sampleSize, timeCoverage: defaultTimeCoverage, dataQualityPenalty: planSelections?.dataQualityPenalty })

  for (let i = 0; i < plan.blocks.length; i++) {
    const b = plan.blocks[i]
    const baseAssumptions = [`Computed from first ${sampleSize} rows (maxComputeRows=${maxComputeRows}).`]
    const selections = plan?.selections || {}
    const dataQualityPenalty = selections?.dataQualityPenalty

    if (b.type === 'KPIBlock') {
      const primaryMeasure = selections?.primaryMeasure || semanticGraph?.primaryMeasure || pickTopMeasures(rows, cols.numeric, { limit: 1 })[0] || null
      const topMeasures = pickTopMeasures(rows, cols.numeric, { limit: 5 }).slice(0, 5)
      const timeCol = selections?.timeColumn || cols.date[0] || null
      const grain = selections?.grain || 'day'
      const contributorDims = Array.isArray(selections?.topDims)
        ? selections.topDims.filter((d) => /(category|region|product)/i.test(String(d)))
        : []
      const exec = timeCol && primaryMeasure ? computeExecutiveTimeKpis(rows, { timeColumn: timeCol, grain, measure: primaryMeasure, contributorDims }) : null
      const yoy = timeCol && primaryMeasure ? computeLatestAndYoY(rows, timeCol, primaryMeasure) : null
      const payload = {
        rowCount: dataset?.metadata?.rowCount ?? rowsAll.length,
        primaryMeasure,
        metricSummaries: topMeasures.map((m) => ({ name: m, summary: computeNumericSummary(rows, m) })),
        ...(exec ? { executiveKpis: exec } : {}),
        ...(yoy ? { timeKpis: { measure: primaryMeasure, ...yoy } } : {}),
      }
      if (isGovcon) {
        const govconExtras = computeGovconKpiExtras(rows, cols, exec)
        if (govconExtras.dueInNext10DaysCount != null) payload.dueInNext10DaysCount = govconExtras.dueInNext10DaysCount
        if (govconExtras.avgDaysToDue != null) payload.avgDaysToDue = govconExtras.avgDaysToDue
        if (govconExtras.topAgencyKey != null) payload.topAgencyKey = govconExtras.topAgencyKey
        if (govconExtras.topAgencyShare != null) payload.topAgencyShare = govconExtras.topAgencyShare
        if (govconExtras.newVsPriorPct != null) payload.newVsPriorPct = govconExtras.newVsPriorPct
      }
      const status = rowsAll.length ? 'OK' : 'INSUFFICIENT_DATA'
      const timeCoverage = computeTimeCoverage(rows, timeCol)
      const badges = computeBadges({ sampleSize, timeCoverage, dataQualityPenalty })
      const narrativeParts = []
      if (exec) {
        narrativeParts.push(
          `Latest ${exec.measure} (${exec.grain}) in ${exec.latest.period}: ${formatNumberShort(exec.latest.value)} `
            + `(Δ ${formatNumberShort(exec.change.abs)}, ${formatPct(exec.change.pct)} vs ${exec.previous.period}).`
        )
        if (exec.topContributor) {
          narrativeParts.push(
            `Top ${exec.topContributor.dimension}: ${exec.topContributor.group} (${formatPct(exec.topContributor.share)} of latest period).`
          )
        }
      }
      const blockNarrative = narrativeParts.length ? narrativeParts.join(' ') : 'Key metrics computed from the available data.'
      blocks.push({
        id: buildId('kpi', i),
        type: 'KPIBlock',
        title: b.title || 'Key metrics',
        questionAnswered: 'What are the headline stats and key numeric measures?',
        status,
        confidence: status === 'OK' ? 0.85 : 0.1,
        assumptions: [
          ...baseAssumptions,
          'Top metrics selected by variance + fill rate.',
          ...(exec ? ['Executive KPIs computed per chosen time grain.'] : []),
          ...(yoy ? ['YoY computed on year-like time column.'] : []),
        ],
        sampleSize,
        badges,
        blockNarrative,
        payload,
      })
      continue
    }

    if (b.type === 'GeoLikeBlock') {
      const dimension = b.dimension
      if (!dimension) {
        blocks.push({
          id: buildId('geolike', i),
          type: 'GeoLikeBlock',
          title: b.title || 'Geo-like breakdown',
          questionAnswered: 'How does the metric vary by region-like categories?',
          status: 'NOT_APPLICABLE',
          confidence: 0,
          assumptions: [...baseAssumptions, 'No dimension specified.'],
          sampleSize,
          badges: defaultBadges,
          blockNarrative: 'No region-like dimension was selected for this dataset.',
          payload: { reason: 'No dimension specified.' },
        })
        continue
      }
      const measure = b.measure || pickTopMeasures(rows, cols.numeric, { limit: 1 })[0] || null
      const agg = b.agg || (measure ? 'sum' : 'count')
      const limit = Math.max(1, Math.min(25, b.limit || 10))

      const groups = new Map()
      for (const r of rows) {
        const raw = r?.[dimension]
        const key = isNullLike(raw) ? '(missing)' : String(raw).trim() || '(blank)'
        const cur = groups.get(key) || { key, count: 0, sum: 0 }
        cur.count++
        if (agg === 'sum' && measure) {
          const n = safeNumber(r?.[measure])
          if (n !== null) cur.sum += n
        }
        groups.set(key, cur)
      }
      const scored = Array.from(groups.values()).map((g) => ({ key: g.key, value: agg === 'count' ? g.count : g.sum }))
      const top = stableTopN(scored, limit)
      const badges = computeBadges({ sampleSize, timeCoverage: null, dataQualityPenalty })
      const best = top[0]
      const blockNarrative = best
        ? `Top ${dimension}: ${best.key} (${formatNumberShort(best.value)}${measure ? ` ${measure}` : ''}).`
        : `Not enough data to rank ${dimension}.`
      blocks.push({
        id: buildId('geolike', i, dimension),
        type: 'GeoLikeBlock',
        title: b.title || `By ${dimension}`,
        questionAnswered: `Which ${dimension} groups are highest?`,
        status: top.length ? 'OK' : 'INSUFFICIENT_DATA',
        confidence: top.length ? 0.7 : 0.1,
        assumptions: [...baseAssumptions, `Dimension: ${dimension}`, measure ? `Measure: ${measure} (${agg})` : `Measure: none (${agg})`],
        sampleSize,
        badges,
        blockNarrative,
        payload: { dimension, measure, agg, rows: top },
      })
      continue
    }

    if (b.type === 'DriverBlock') {
      const measure = b.measure || pickTopMeasures(rows, cols.numeric, { limit: 1 })[0] || null
      if (!measure) {
        blocks.push({
          id: buildId('drivers', i),
          type: 'DriverBlock',
          title: b.title || 'Drivers',
          questionAnswered: 'What are the top drivers?',
          status: 'NOT_APPLICABLE',
          confidence: 0,
          assumptions: [...baseAssumptions, 'No numeric measure available.'],
          sampleSize,
          badges: defaultBadges,
          blockNarrative: 'No numeric measure was available to compute drivers.',
          payload: { reason: 'No numeric measure available.' },
        })
        continue
      }
      const dims = Array.isArray(b.dimensions) && b.dimensions.length
        ? b.dimensions
        : cols.schema.filter((c) => c.inferredType === 'string').map((c) => c.name).filter((n) => /(category|region|product)/i.test(n)).slice(0, 3)
      const limit = Math.max(5, Math.min(30, b.limit || 12))

      const overall = { total: 0, count: 0 }
      for (const r of rows) {
        const n = safeNumber(r?.[measure])
        if (n === null) continue
        overall.total += n
        overall.count++
      }
      const overallAvg = overall.count ? overall.total / overall.count : 0

      const drivers = []
      for (const dim of dims) {
        const groups = new Map()
        for (const r of rows) {
          const keyRaw = r?.[dim]
          const key = isNullLike(keyRaw) ? '(missing)' : String(keyRaw).trim() || '(blank)'
          const n = safeNumber(r?.[measure])
          if (n === null) continue
          const cur = groups.get(key) || { key, total: 0, count: 0 }
          cur.total += n
          cur.count++
          groups.set(key, cur)
        }
        const totalAll = Array.from(groups.values()).reduce((a, g) => a + g.total, 0) || 0
        for (const g of groups.values()) {
          const share = totalAll ? g.total / totalAll : 0
          const avg = g.count ? g.total / g.count : 0
          const lift = overallAvg ? avg / overallAvg - 1 : 0
          const score = share * Math.min(5, Math.abs(lift)) * Math.log1p(g.count)
          drivers.push({ dimension: dim, group: g.key, total: g.total, share, avg, lift, count: g.count, score })
        }
      }
      const top = [...drivers].sort((a, b) => (b.score - a.score) || a.dimension.localeCompare(b.dimension) || String(a.group).localeCompare(String(b.group))).slice(0, limit)
      const confidence = clamp01(0.55 + Math.min(0.35, (overall.count / Math.max(1, sampleSize)) * 0.4))
      const badges = computeBadges({ sampleSize, timeCoverage: null, dataQualityPenalty })
      const best = top[0]
      const blockNarrative = best
        ? `Top driver: ${best.group} (${best.dimension}) with ${formatPct(best.share)} share and lift ${formatPct(best.lift)} vs overall average.`
        : 'No drivers could be computed from the available data.'
      const topDriversForPayload = isGovcon
        ? top.map((d) => ({
            ...d,
            label: d.group,
            liftPct: Number.isFinite(d.lift) ? d.lift * 100 : null,
            sharePct: Number.isFinite(d.share) ? d.share * 100 : null,
          }))
        : top
      blocks.push({
        id: buildId('drivers', i, measure),
        type: 'DriverBlock',
        title: b.title || 'Top drivers',
        questionAnswered: `Which groups drive ${measure} (share + lift)?`,
        status: top.length ? 'OK' : 'INSUFFICIENT_DATA',
        confidence: top.length ? confidence : 0.1,
        assumptions: [...baseAssumptions, `Measure=${measure}`, 'Score=share * |lift| * log(count+1). Lift vs overall average.'],
        sampleSize,
        badges,
        blockNarrative,
        payload: { measure, overall: { total: overall.total, avg: overallAvg, count: overall.count }, topDrivers: topDriversForPayload },
      })
      continue
    }

    if (b.type === 'ComparePeriodsBlock') {
      const timeCol = b.timeColumn || cols.date[0] || null
      const measure = b.measure || pickTopMeasures(rows, cols.numeric, { limit: 1 })[0] || null
      const dims = Array.isArray(b.dimensions) && b.dimensions.length
        ? b.dimensions
        : cols.schema.filter((c) => c.inferredType === 'string').map((c) => c.name).filter((n) => /(category|region)/i.test(n)).slice(0, 2)
      const limit = Math.max(5, Math.min(30, b.limit || 15))

      if (!timeCol || !measure) {
        blocks.push({
          id: buildId('compare', i),
          type: 'ComparePeriodsBlock',
          title: b.title || 'Compare periods',
          questionAnswered: 'How did the metric change between periods?',
          status: 'NOT_APPLICABLE',
          confidence: 0,
          assumptions: [...baseAssumptions, !timeCol ? 'No time column.' : 'No measure column.'],
          sampleSize,
          badges: defaultBadges,
          blockNarrative: !timeCol ? 'No time column was available to compare periods.' : 'No measure column was available to compare periods.',
          payload: { reason: !timeCol ? 'No time column' : 'No measure column' },
        })
        continue
      }

      const stamped = []
      for (const r of rows) {
        const d = parseDate(r?.[timeCol])
        if (!d) continue
        const n = safeNumber(r?.[measure])
        if (n === null) continue
        stamped.push({ t: d.getTime(), row: r })
      }
      stamped.sort((a, b) => a.t - b.t)
      if (stamped.length < 6) {
        blocks.push({
          id: buildId('compare', i),
          type: 'ComparePeriodsBlock',
          title: b.title || 'Compare periods',
          questionAnswered: 'How did the metric change between periods?',
          status: 'INSUFFICIENT_DATA',
          confidence: 0.1,
          assumptions: [...baseAssumptions, 'Not enough time+measure rows.'],
          sampleSize,
          badges: defaultBadges,
          blockNarrative: 'Not enough time-stamped rows to compare periods.',
          payload: { timeColumn: timeCol, measure, reason: 'Not enough rows' },
        })
        continue
      }
      const minT = stamped[0].t
      const maxT = stamped[stamped.length - 1].t
      const mid = minT + (maxT - minT) / 2
      const first = stamped.filter((x) => x.t <= mid)
      const second = stamped.filter((x) => x.t > mid)
      if (first.length < 2 || second.length < 2) {
        blocks.push({
          id: buildId('compare', i),
          type: 'ComparePeriodsBlock',
          title: b.title || 'Compare periods',
          questionAnswered: 'How did the metric change between periods?',
          status: 'INSUFFICIENT_DATA',
          confidence: 0.1,
          assumptions: [...baseAssumptions, 'Could not split into two non-empty halves.'],
          sampleSize,
          badges: defaultBadges,
          blockNarrative: 'Could not split the observed time range into two comparable periods.',
          payload: { timeColumn: timeCol, measure, reason: 'Cannot split periods' },
        })
        continue
      }
      const sumRows = (arr) => arr.reduce((a, x) => a + (safeNumber(x.row?.[measure]) ?? 0), 0)
      const totalFirst = sumRows(first)
      const totalSecond = sumRows(second)
      const delta = totalSecond - totalFirst

      const contributions = {}
      for (const dim of dims) {
        const map = new Map()
        const add = (bucket, arr) => {
          for (const x of arr) {
            const keyRaw = x.row?.[dim]
            const key = isNullLike(keyRaw) ? '(missing)' : String(keyRaw).trim() || '(blank)'
            const n = safeNumber(x.row?.[measure]) ?? 0
            const cur = map.get(key) || { key, first: 0, second: 0 }
            cur[bucket] += n
            map.set(key, cur)
          }
        }
        add('first', first)
        add('second', second)
        const rowsOut = Array.from(map.values()).map((g) => ({ key: g.key, first: g.first, second: g.second, delta: g.second - g.first }))
        rowsOut.sort((a, b) => (Math.abs(b.delta) - Math.abs(a.delta)) || a.key.localeCompare(b.key))
        contributions[dim] = rowsOut.slice(0, limit)
      }

      const timeCoverage = computeTimeCoverage(rows, timeCol)
      const badges = computeBadges({ sampleSize, timeCoverage, dataQualityPenalty })
      let biggest = null
      for (const dim of Object.keys(contributions)) {
        const arr = contributions[dim]
        if (!Array.isArray(arr) || !arr.length) continue
        const cand = arr[0]
        if (!cand) continue
        const mag = Math.abs(cand.delta || 0)
        if (!biggest || mag > biggest.mag || (mag === biggest.mag && String(cand.key).localeCompare(String(biggest.key)) < 0)) {
          biggest = { dim, key: cand.key, delta: cand.delta, mag }
        }
      }
      const blockNarrative =
        `Second period ${delta >= 0 ? 'increased' : 'decreased'} by ${formatNumberShort(delta)} ${measure} vs first period.`
        + (biggest ? ` Biggest contributor: ${biggest.key} (${biggest.dim}) at ${formatNumberShort(biggest.delta)}.` : '')
      blocks.push({
        id: buildId('compare', i, measure),
        type: 'ComparePeriodsBlock',
        title: b.title || 'Compare periods',
        questionAnswered: `What changed between the first half vs second half for ${measure}?`,
        status: 'OK',
        confidence: 0.75,
        assumptions: [...baseAssumptions, 'Periods split by midpoint of observed time range (after filters).'],
        sampleSize,
        badges,
        blockNarrative,
        payload: {
          timeColumn: timeCol,
          measure,
          periodA: { from: new Date(minT).toISOString(), to: new Date(mid).toISOString(), total: totalFirst },
          periodB: { from: new Date(mid + 1).toISOString(), to: new Date(maxT).toISOString(), total: totalSecond },
          delta,
          pct: totalFirst !== 0 ? delta / totalFirst : null,
          contributions,
        },
      })
      continue
    }

    if (b.type === 'AnomalyBlock') {
      const enabled = !!b.enabled
      blocks.push({
        id: buildId('anomaly', i),
        type: 'AnomalyBlock',
        title: b.title || 'Anomalies',
        questionAnswered: 'Are there anomalies?',
        status: enabled ? 'INSUFFICIENT_DATA' : 'NOT_APPLICABLE',
        confidence: 0,
        assumptions: [...baseAssumptions, enabled ? 'Anomaly detection not implemented in MVP.' : 'Disabled.'],
        sampleSize,
        badges: defaultBadges,
        blockNarrative: enabled ? 'Anomaly detection is not implemented in this deterministic MVP.' : 'Anomaly block is disabled for this run.',
        payload: enabled ? { reason: 'Not implemented' } : { reason: 'Disabled' },
      })
      continue
    }

    if (b.type === 'TrendBlock') {
      const timeCol = b.timeColumn || cols.date[0]
      if (!timeCol) {
        blocks.push({
          id: buildId('trend', i),
          type: 'TrendBlock',
          title: b.title || 'Trend over time',
          questionAnswered: 'How does activity change over time?',
          status: 'NOT_APPLICABLE',
          confidence: 0,
          assumptions: [...baseAssumptions, 'No time column detected.'],
          sampleSize,
          badges: defaultBadges,
          blockNarrative: 'No time column was detected, so a trend cannot be computed.',
          payload: { reason: 'No time column available.' },
        })
        continue
      }
      const grain = b.grain || selections?.grain || 'day'
      const measure = b.measure || pickTopMeasures(rows, cols.numeric, { limit: 1 })[0] || null
      const agg = b.agg || (measure ? 'sum' : 'count')

      const buckets = new Map()
      let parsed = 0
      for (const r of rows) {
        const d = parseDate(r?.[timeCol])
        if (!d) continue
        parsed++
        const t = startOfGrain(d, grain)
        const cur = buckets.get(t) || { t, count: 0, ...(agg === 'sum' && measure ? { sum: 0 } : {}) }
        cur.count++
        if (agg === 'sum' && measure) {
          const n = safeNumber(r?.[measure])
          if (n !== null) cur.sum = (cur.sum || 0) + n
        }
        buckets.set(t, cur)
      }
      const series = Array.from(buckets.values()).sort((a, b) => a.t.localeCompare(b.t))
      const status = series.length ? 'OK' : 'INSUFFICIENT_DATA'
      const confidence = status === 'OK' ? clamp01(0.7 + Math.min(0.25, (parsed / Math.max(1, sampleSize)) * 0.3)) : 0.1
      const timeCoverage = computeTimeCoverage(rows, timeCol)
      const badges = computeBadges({ sampleSize, timeCoverage, dataQualityPenalty })
      const first = series[0]
      const last = series[series.length - 1]
      const firstV = first ? (agg === 'count' ? first.count : first.sum || 0) : null
      const lastV = last ? (agg === 'count' ? last.count : last.sum || 0) : null
      const dAbs = Number.isFinite(firstV) && Number.isFinite(lastV) ? (lastV - firstV) : null
      const dPct = Number.isFinite(firstV) && firstV !== 0 && Number.isFinite(dAbs) ? dAbs / firstV : null
      const blockNarrative = Number.isFinite(dAbs)
        ? `${measure ? `${measure} ` : ''}trend is ${dAbs >= 0 ? 'up' : 'down'} ${formatNumberShort(Math.abs(dAbs))} (${formatPct(dPct)}) from first to last ${grain} bucket.`
        : 'Trend computed over the observed time range.'
      blocks.push({
        id: buildId('trend', i, grain),
        type: 'TrendBlock',
        title: b.title || `Trend by ${grain}`,
        questionAnswered: `What is the ${grain}-level time trend?`,
        status,
        confidence,
        assumptions: [...baseAssumptions, `Time column: ${timeCol}`, `Grain: ${grain}`, measure ? `Measure: ${measure} (${agg})` : 'Measure: none (count)'],
        sampleSize,
        badges,
        blockNarrative,
        payload: {
          timeColumn: timeCol,
          grain,
          measure,
          agg,
          series,
          anomalies: simpleAnomalyDetection(series),
        },
      })
      continue
    }

    if (b.type === 'TopNBlock' || b.type === 'BreakdownBlock') {
      const isBreakdown = b.type === 'BreakdownBlock'
      const dimension = b.dimension
      if (!dimension) {
        blocks.push({
          id: buildId(isBreakdown ? 'breakdown' : 'topn', i),
          type: b.type,
          title: b.title || (isBreakdown ? 'Breakdown' : 'Top categories'),
          questionAnswered: 'Which categories contribute the most?',
          status: 'NOT_APPLICABLE',
          confidence: 0,
          assumptions: [...baseAssumptions, 'No dimension specified.'],
          sampleSize,
          badges: defaultBadges,
          blockNarrative: 'No dimension column was specified for this breakdown.',
          payload: { reason: 'No dimension specified.' },
        })
        continue
      }

      const measure = b.measure || null
      const agg = b.agg || (measure ? 'sum' : 'count')
      const limit = b.limit ?? 10
      const includeOther = b.includeOther ?? true
      const maxCategories = b.maxCategories ?? 8

      const groups = new Map()
      for (const r of rows) {
        const keyRaw = r?.[dimension]
        const key = isNullLike(keyRaw) ? '(missing)' : String(keyRaw).trim() || '(blank)'
        const cur = groups.get(key) || { key, count: 0, sum: 0, nonNull: 0 }
        cur.count++
        const n = measure ? safeNumber(r?.[measure]) : null
        if (n !== null) {
          cur.sum += n
          cur.nonNull++
        }
        groups.set(key, cur)
      }

      const categories = Array.from(groups.values())
      const categoryCount = categories.length

      if (isBreakdown && categoryCount > maxCategories) {
        const fallback = executePlan(dataset, semanticGraph, { blocks: [{ type: 'TopNBlock', dimension, measure: measure || undefined, agg, limit: 10, includeOther: true }] }, options)[0]
        blocks.push({
          ...fallback,
          id: buildId('topn', i, 'breakdown-fallback'),
          title: b.title || 'Top categories (fallback)',
          assumptions: [...fallback.assumptions, `Breakdown fallback: categoryCount=${categoryCount} > ${maxCategories}`],
        })
        continue
      }

      const scored = categories.map((c) => {
        const value = agg === 'count' ? c.count : agg === 'sum' ? c.sum : c.nonNull ? c.sum / c.nonNull : 0
        return { key: c.key, value }
      })
      const top = stableTopN(scored, Math.max(1, Math.min(50, limit)))
      const topSet = new Set(top.map((t) => t.key))
      const otherValue = includeOther ? scored.filter((s) => !topSet.has(s.key)).reduce((a, s) => a + s.value, 0) : 0
      const rowsOut = includeOther && otherValue > 0 ? [...top, { key: 'Other', value: otherValue }] : top

      const status = rowsAll.length ? 'OK' : 'INSUFFICIENT_DATA'
      blocks.push({
        id: buildId(isBreakdown ? 'breakdown' : 'topn', i),
        type: isBreakdown ? 'BreakdownBlock' : 'TopNBlock',
        title: b.title || (isBreakdown ? 'Breakdown' : `Top ${Math.min(10, limit)} by ${dimension}`),
        questionAnswered: isBreakdown ? 'How is the total distributed across categories?' : 'Which categories are largest?',
        status,
        confidence: status === 'OK' ? 0.75 : 0.1,
        assumptions: [...baseAssumptions, `Dimension: ${dimension}`, measure ? `Measure: ${measure} (${agg})` : `Measure: none (${agg})`, `Rows: top=${Math.min(10, limit)}${includeOther ? ' + Other' : ''}`],
        sampleSize,
        badges: defaultBadges,
        payload: { dimension, measure, agg, rows: rowsOut, categoryCount },
      })
      continue
    }

    if (b.type === 'DistributionBlock') {
      const measure = b.measure
      if (!measure) {
        blocks.push({
          id: buildId('dist', i),
          type: 'DistributionBlock',
          title: b.title || 'Distribution',
          questionAnswered: 'How are values distributed?',
          status: 'NOT_APPLICABLE',
          confidence: 0,
          assumptions: [...baseAssumptions, 'No measure specified.'],
          sampleSize,
          badges: defaultBadges,
          payload: { reason: 'No measure specified.' },
        })
        continue
      }
      const nums = []
      for (const r of rows) {
        const n = safeNumber(r?.[measure])
        if (n === null) continue
        nums.push(n)
      }
      nums.sort((a, b) => a - b)
      if (nums.length < 3) {
        blocks.push({
          id: buildId('dist', i),
          type: 'DistributionBlock',
          title: b.title || `Distribution of ${measure}`,
          questionAnswered: `How is ${measure} distributed?`,
          status: 'INSUFFICIENT_DATA',
          confidence: 0.1,
          assumptions: [...baseAssumptions, `Not enough numeric values for ${measure}.`],
          sampleSize,
          badges: defaultBadges,
          payload: { measure, valuesCount: nums.length },
        })
        continue
      }

      const bins = Math.max(3, Math.min(30, b.bins || 10))
      const min = nums[0]
      const max = nums[nums.length - 1]
      const width = max === min ? 1 : (max - min) / bins
      const hist = Array.from({ length: bins }, (_, j) => ({ bin: j, from: min + j * width, to: j === bins - 1 ? max : min + (j + 1) * width, count: 0 }))
      for (const n of nums) {
        const idx = max === min ? 0 : Math.min(bins - 1, Math.floor((n - min) / width))
        hist[idx].count++
      }
      const q = (p) => quantile(nums, p)
      blocks.push({
        id: buildId('dist', i, measure),
        type: 'DistributionBlock',
        title: b.title || `Distribution of ${measure}`,
        questionAnswered: `What is the distribution of ${measure}?`,
        status: 'OK',
        confidence: 0.75,
        assumptions: [...baseAssumptions, `Bins=${bins}`],
        sampleSize,
        badges: defaultBadges,
        payload: { measure, valuesCount: nums.length, quantiles: { p10: q(0.1), p25: q(0.25), p50: q(0.5), p75: q(0.75), p90: q(0.9) }, histogram: hist },
      })
      continue
    }

    if (b.type === 'GeoBlock') {
      const lat = b.latColumn || cols.geo.find((c) => /lat|latitude/i.test(c)) || null
      const lon = b.lonColumn || cols.geo.find((c) => /lon|lng|longitude/i.test(c)) || null
      const region = b.regionColumn || cols.geo.find((c) => /state|country/i.test(c)) || null
      const geoMode = b.geoMode || (lat && lon ? 'points' : 'region')
      const measure = b.measure || pickTopMeasures(rows, cols.numeric, { limit: 1 })[0] || null
      const agg = b.agg || (measure ? 'sum' : 'count')

      if (geoMode === 'points' && lat && lon) {
        const pts = []
        for (const r of rows) {
          const la = safeNumber(r?.[lat])
          const lo = safeNumber(r?.[lon])
          if (la === null || lo === null) continue
          if (la < -90 || la > 90 || lo < -180 || lo > 180) continue
          const w = measure ? safeNumber(r?.[measure]) : null
          pts.push({ lat: la, lon: lo, ...(w !== null ? { weight: w } : {}) })
          if (pts.length >= 2000) break
        }
        const status = pts.length ? 'OK' : 'NOT_APPLICABLE'
        blocks.push({
          id: buildId('geo', i, 'points'),
          type: 'GeoBlock',
          title: b.title || 'Geo points',
          questionAnswered: 'Where are records located (points)?',
          status,
          confidence: status === 'OK' ? 0.8 : 0,
          assumptions: [...baseAssumptions, `lat=${lat}`, `lon=${lon}`, measure ? `weight=${measure}` : 'weight=none'],
          sampleSize,
          badges: defaultBadges,
          payload: { mode: 'points', latColumn: lat, lonColumn: lon, measure, agg, points: pts },
        })
        continue
      }

      if (!region) {
        blocks.push({
          id: buildId('geo', i),
          type: 'GeoBlock',
          title: b.title || 'Geo',
          questionAnswered: 'What is the geographic distribution?',
          status: 'NOT_APPLICABLE',
          confidence: 0,
          assumptions: [...baseAssumptions, 'No geo columns detected.'],
          sampleSize,
          badges: defaultBadges,
          payload: { reason: 'No geo columns detected.' },
        })
        continue
      }

      const groups = new Map()
      for (const r of rows) {
        const raw = r?.[region]
        const key = isNullLike(raw) ? '(missing)' : String(raw).trim() || '(blank)'
        const cur = groups.get(key) || { key, count: 0, sum: 0, nonNull: 0 }
        cur.count++
        const n = measure ? safeNumber(r?.[measure]) : null
        if (n !== null) {
          cur.sum += n
          cur.nonNull++
        }
        groups.set(key, cur)
      }
      const scored = Array.from(groups.values()).map((g) => ({ key: g.key, value: agg === 'count' ? g.count : g.sum }))
      const top = stableTopN(scored, 60)
      blocks.push({
        id: buildId('geo', i, 'region'),
        type: 'GeoBlock',
        title: b.title || `Geo by ${region}`,
        questionAnswered: `How does activity vary by ${region}?`,
        status: rowsAll.length ? 'OK' : 'INSUFFICIENT_DATA',
        confidence: rowsAll.length ? 0.7 : 0.1,
        assumptions: [...baseAssumptions, `region=${region}`, measure ? `measure=${measure} (${agg})` : `measure=none (${agg})`],
        sampleSize,
        badges: defaultBadges,
        payload: {
          mode: 'region',
          regionColumn: region,
          measure,
          agg,
          rows: top,
          ...(looksLikeUSStateKeys(top) ? { geoSubtype: 'us_state' } : {}),
        },
      })
      continue
    }

    if (b.type === 'DataQualityBlock') {
      if (!rowsAll.length) {
        blocks.push({
          id: buildId('quality', i),
          type: 'DataQualityBlock',
          title: b.title || 'Data quality',
          questionAnswered: 'Are there data quality issues?',
          status: 'INSUFFICIENT_DATA',
          confidence: 0.1,
          assumptions: [...baseAssumptions],
          sampleSize,
          badges: defaultBadges,
          payload: { reason: 'No rows' },
        })
        continue
      }
      const missing = cols.schema
        .map((c) => {
          let nulls = 0
          for (const r of rows) if (isNullLike(r?.[c.name])) nulls++
          return { column: c.name, nullPct: nulls / Math.max(1, rows.length) }
        })
        .sort((a, b) => (b.nullPct - a.nullPct) || a.column.localeCompare(b.column))

      let dup = 0
      const seen = new Set()
      for (const r of rows) {
        const key = stableRowKey(r || {})
        if (seen.has(key)) dup++
        else seen.add(key)
      }
      const duplicatesPct = dup / Math.max(1, rows.length)

      const parseIssues = []
      for (const t of cols.date) {
        let failed = 0
        let checked = 0
        for (const r of rows) {
          const v = r?.[t]
          if (isNullLike(v)) continue
          checked++
          if (!parseDate(v)) failed++
          if (checked >= 500) break
        }
        if (failed) parseIssues.push({ column: t, type: 'date_parse_failed', count: failed })
      }
      for (const m of cols.numeric) {
        let failed = 0
        let checked = 0
        for (const r of rows) {
          const v = r?.[m]
          if (isNullLike(v)) continue
          checked++
          if (safeNumber(v) === null) failed++
          if (checked >= 500) break
        }
        if (failed) parseIssues.push({ column: m, type: 'number_parse_failed', count: failed })
      }
      for (const g of cols.geo) {
        const n = g.toLowerCase()
        const isLat = /(lat|latitude)/.test(n)
        const isLon = /(lon|lng|longitude)/.test(n)
        if (!isLat && !isLon) continue
        let bad = 0
        let checked = 0
        for (const r of rows) {
          const v = safeNumber(r?.[g])
          if (v === null) continue
          checked++
          if (isLat && (v < -90 || v > 90)) bad++
          if (isLon && (v < -180 || v > 180)) bad++
          if (checked >= 500) break
        }
        if (bad) parseIssues.push({ column: g, type: 'geo_out_of_range', count: bad })
      }
      parseIssues.sort((a, b) => (a.column + a.type).localeCompare(b.column + b.type))

      blocks.push({
        id: buildId('quality', i),
        type: 'DataQualityBlock',
        title: b.title || 'Data quality',
        questionAnswered: 'Are there missing values, duplicates, or parse errors?',
        status: 'OK',
        confidence: 0.8,
        assumptions: [...baseAssumptions, 'Duplicates computed by full-row equality (stringified).'],
        sampleSize,
        badges: defaultBadges,
        payload: { duplicatesPct: clamp01(duplicatesPct), missingness: missing, parseIssues },
      })
      continue
    }

    if (b.type === 'DetailsTableBlock') {
      const preview = Math.max(1, Math.min(200, b.previewRows || 50))
      let columnOrder = cols.schema.map((c) => c.name)
      if (isGovcon) {
        const govconPreferred = [
          findColumnByPattern(cols.schema, ['notice_id', 'noticeId', 'notice_number', 'id']),
          findColumnByPattern(cols.schema, ['solicitation', 'title', 'solicitation_number', 'description']),
          findColumnByPattern(cols.schema, ['due_date', 'dueDate', 'response_deadline', 'deadline', 'posted_date']),
          findColumnByPattern(cols.schema, ['agency', 'awarding_agency', 'funding_agency']),
          findColumnByPattern(cols.schema, ['naics', 'naics_code']),
          findColumnByPattern(cols.schema, ['state', 'place_of_performance_state']),
        ].filter(Boolean)
        const rest = columnOrder.filter((n) => !govconPreferred.includes(n))
        columnOrder = [...govconPreferred, ...rest]
      }
      const previewRows = rowsAll.slice(0, preview)
      const searchKeys = columnOrder.filter((c) => /id|name|title|solicitation|notice|state|city|country|date|posted|created/i.test(c)).slice(0, 12)
      blocks.push({
        id: buildId('table', i),
        type: 'DetailsTableBlock',
        title: b.title || 'Row details',
        questionAnswered: 'What do the raw rows look like (preview)?',
        status: rowsAll.length ? 'OK' : 'INSUFFICIENT_DATA',
        confidence: rowsAll.length ? 0.9 : 0.1,
        assumptions: [...baseAssumptions, `Preview rows=${preview}`],
        sampleSize,
        badges: defaultBadges,
        payload: { columnOrder, searchKeys, rows: previewRows },
      })
      continue
    }

    blocks.push({
      id: buildId('unknown', i),
      type: b.type,
      title: 'Unsupported block',
      questionAnswered: '',
      status: 'NOT_APPLICABLE',
      confidence: 0,
      assumptions: [...baseAssumptions, 'Unsupported block type.'],
      sampleSize,
      payload: { reason: 'Unsupported block type' },
    })
  }

  return blocks
}

module.exports = { executePlan }

