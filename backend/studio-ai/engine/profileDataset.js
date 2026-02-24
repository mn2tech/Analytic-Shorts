function clampPct(v) {
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

function firstNUnique(values, limit) {
  const out = []
  const seen = new Set()
  for (const v of values) {
    if (isNullLike(v)) continue
    const key = normalizeDistinctKey(v)
    if (!key) continue
    if (seen.has(key)) continue
    seen.add(key)
    out.push(v)
    if (out.length >= limit) break
  }
  return out
}

function looksLikeDateColumnName(name) {
  const n = String(name || '').toLowerCase()
  return /(date|time|posted|due|created|updated|deadline|response)/i.test(n)
}

function looksLikeIdColumnName(name) {
  const n = String(name || '').toLowerCase()
  return /(id|uuid|key|notice|solicitation|solicitationnumber|noticeid)/i.test(n)
}

function looksLikeGeoColumnName(name) {
  const n = String(name || '').toLowerCase()
  return /(state|city|country|lat|latitude|lon|lng|longitude|zip|postal|address)/i.test(n)
}

function looksLikeYearColumnName(name) {
  const n = String(name || '').toLowerCase()
  return /(year|yr|fy|fiscal)/i.test(n)
}

function isMostlyYearIntegers(values) {
  let checked = 0
  let inRangeInt = 0
  const seq = []
  for (const v of values) {
    const num = parseNumberIfPossible(v)
    if (num === null) continue
    checked++
    const isInt = Number.isInteger(num)
    if (isInt && num >= 1900 && num <= 2100) {
      inRangeInt++
      seq.push(num)
    }
    if (checked >= 500) break
  }
  const ratio = checked ? inRangeInt / checked : 0
  let monotonicNonDecreasing = true
  for (let i = 1; i < seq.length; i++) {
    if (seq[i] < seq[i - 1]) {
      monotonicNonDecreasing = false
      break
    }
  }
  return { ok: ratio >= 0.8 && inRangeInt >= 3, monotonicNonDecreasing }
}

function parseDateIfPossible(v) {
  if (isNullLike(v)) return null
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v
  if (typeof v === 'number') {
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
  if (!s) return null
  if (/^\d{4}$/.test(s)) return null
  const looksDateLike =
    /^\d{4}-\d{1,2}-\d{1,2}/.test(s) ||
    /^\d{4}\/\d{1,2}\/\d{1,2}/.test(s) ||
    /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(s) ||
    /^\d{1,2}-\d{1,2}-\d{2,4}/.test(s) ||
    /^\d{4}-\d{2}-\d{2}T/.test(s) ||
    /^\d{4}-\d{2}-\d{2}\s/.test(s)
  if (!looksDateLike) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

function parseNumberIfPossible(v) {
  if (isNullLike(v)) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const s = String(v).trim()
  if (!s) return null
  const cleaned = s.replace(/[$,\s]/g, '')
  const num = Number(cleaned)
  return Number.isFinite(num) ? num : null
}

function avgStringLength(values) {
  let n = 0
  let total = 0
  for (const v of values) {
    if (isNullLike(v)) continue
    const s = String(v)
    n++
    total += s.length
  }
  return n ? total / n : 0
}

function isLikelyUSState(values) {
  const state2 = new Set([
    'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
  ])
  let checked = 0
  let matched = 0
  for (const v of values) {
    if (isNullLike(v)) continue
    const s = String(v).trim().toUpperCase()
    if (!s) continue
    checked++
    if (state2.has(s)) matched++
    if (checked >= 50) break
  }
  return checked >= 5 && matched / checked >= 0.8
}

function geoOutOfRangeCount(colName, values) {
  const n = String(colName || '').toLowerCase()
  const isLat = /(lat|latitude)/.test(n)
  const isLon = /(lon|lng|longitude)/.test(n)
  if (!isLat && !isLon) return { count: 0 }
  let bad = 0
  let seen = 0
  for (const v of values) {
    const num = parseNumberIfPossible(v)
    if (num === null) continue
    seen++
    if (isLat && (num < -90 || num > 90)) bad++
    if (isLon && (num < -180 || num > 180)) bad++
    if (seen >= 200) break
  }
  if (!bad) return { count: 0 }
  return {
    count: bad,
    hint: isLat ? 'Latitude should be between -90 and 90' : 'Longitude should be between -180 and 180',
  }
}

function varianceStats(nums) {
  const finite = nums.filter((n) => Number.isFinite(n))
  if (!finite.length) return { distinct: 0, range: 0 }
  let min = Infinity
  let max = -Infinity
  const seen = new Set()
  for (const n of finite) {
    if (n < min) min = n
    if (n > max) max = n
    seen.add(n)
    if (seen.size > 50) break
  }
  return { distinct: seen.size, range: max - min }
}

function stableRowKey(row) {
  const keys = Object.keys(row || {}).sort()
  const parts = []
  for (const k of keys) parts.push(`${k}=${normalizeDistinctKey(row[k])}`)
  return parts.join('|')
}

function profileDataset(dataset, options = {}) {
  const maxProfileRows = Number.isFinite(options.maxProfileRows) ? Math.max(1, options.maxProfileRows) : 5000
  const sampleValuesLimit = Number.isFinite(options.sampleValuesLimit) ? Math.max(1, options.sampleValuesLimit) : 8

  const allRows = Array.isArray(dataset?.rows) ? dataset.rows : []
  const schema = Array.isArray(dataset?.schema) ? dataset.schema : []

  const profiledRows = allRows.slice(0, Math.min(allRows.length, maxProfileRows))
  const profiledRowCount = profiledRows.length
  const rowCount = Number.isFinite(dataset?.metadata?.rowCount) ? dataset.metadata.rowCount : allRows.length

  const columnsSorted = schema
    .map((c) => ({ name: String(c?.name || '').trim(), inferredType: c?.inferredType, sampleValues: c?.sampleValues }))
    .filter((c) => c.name)
    .sort((a, b) => a.name.localeCompare(b.name))

  const parseIssues = []

  const perColumn = []
  let hasTime = false
  let hasGeo = false
  let hasNumeric = false
  let hasCategorical = false
  let hasText = false

  let missingCells = 0
  const totalCells = Math.max(1, profiledRowCount) * Math.max(1, columnsSorted.length)
  const columnsOver50 = []
  const columnsOver90 = []

  for (const col of columnsSorted) {
    const values = profiledRows.map((r) => (r ? r[col.name] : undefined))
    const nonNull = values.filter((v) => !isNullLike(v))
    const nullCount = values.length - nonNull.length
    const nullPct = values.length ? nullCount / values.length : 0
    missingCells += nullCount

    const distinctSet = new Set()
    for (const v of nonNull) {
      const k = normalizeDistinctKey(v)
      if (k) distinctSet.add(k)
      if (distinctSet.size > 50_000) break
    }
    const distinctCount = distinctSet.size

    const avgLen = avgStringLength(nonNull)
    const inferredType = col.inferredType || 'string'

    let dateParseable = 0
    let dateParseFailed = 0
    if (inferredType === 'date' || looksLikeDateColumnName(col.name)) {
      for (const v of nonNull.slice(0, 500)) {
        const d = parseDateIfPossible(v)
        if (d) dateParseable++
        else dateParseFailed++
      }
      if (dateParseFailed > 0 && inferredType === 'date') {
        parseIssues.push({ column: col.name, type: 'date_parse_failed', count: dateParseFailed })
      }
    } else {
      for (const v of nonNull.slice(0, 250)) {
        if (parseDateIfPossible(v)) dateParseable++
      }
    }
    const denom = nonNull.length ? Math.min(nonNull.length, inferredType === 'date' ? 500 : 250) : 1
    const dateParseRate = nonNull.length ? dateParseable / denom : 0
    const isTimeByDate =
      looksLikeDateColumnName(col.name) ||
      dateParseRate >= 0.7 ||
      (inferredType === 'date' && dateParseRate >= 0.5)

    const cardinalityRatio = profiledRowCount > 0 ? distinctCount / profiledRowCount : 0
    const yearProbe =
      inferredType === 'number' && looksLikeYearColumnName(col.name)
        ? isMostlyYearIntegers(nonNull)
        : { ok: false, monotonicNonDecreasing: false }
    const isTimeByYear =
      yearProbe.ok && (cardinalityRatio >= 0.6 || yearProbe.monotonicNonDecreasing)
    const isTime = isTimeByYear || isTimeByDate

    const isGeoName = looksLikeGeoColumnName(col.name)
    const geoState = /state/.test(col.name.toLowerCase()) && isLikelyUSState(nonNull)
    const outOfRange = geoOutOfRangeCount(col.name, nonNull)
    if (outOfRange.count > 0) {
      parseIssues.push({ column: col.name, type: 'geo_out_of_range', count: outOfRange.count, hint: outOfRange.hint })
    }
    const isGeo = isGeoName || geoState || /(zip|postal)/i.test(col.name)

    const highCardinality = profiledRowCount <= 50 ? cardinalityRatio >= 0.6 : cardinalityRatio >= 0.9
    const isId = looksLikeIdColumnName(col.name) && highCardinality

    let isMeasure = false
    let numberParseFailed = 0
    if (inferredType === 'number') {
      const nums = []
      for (const v of nonNull.slice(0, 2000)) {
        const n = parseNumberIfPossible(v)
        if (n === null) numberParseFailed++
        else nums.push(n)
      }
      if (numberParseFailed > 0) {
        parseIssues.push({ column: col.name, type: 'number_parse_failed', count: numberParseFailed })
      }
      const stats = varianceStats(nums)
      isMeasure = stats.distinct >= 2 && Math.abs(stats.range) > 0
    }
    if (isTime) isMeasure = false

    const isText =
      inferredType === 'string' &&
      (avgLen > 30 ||
        (!isTime && !isGeo && !isId && !isMeasure && distinctCount / Math.max(1, profiledRowCount) > 0.5 && avgLen > 15))

    let roleCandidate = 'dimension'
    if (isTime) roleCandidate = 'time'
    else if (isGeo) roleCandidate = 'geo'
    else if (isId) roleCandidate = 'id'
    else if (isMeasure) roleCandidate = 'measure'
    else if (isText) roleCandidate = 'text'
    else roleCandidate = 'dimension'

    const sampleValues = firstNUnique(nonNull, sampleValuesLimit)

    if (roleCandidate === 'time') hasTime = true
    if (roleCandidate === 'geo') hasGeo = true
    if (inferredType === 'number') hasNumeric = true
    if (roleCandidate === 'dimension' || inferredType === 'boolean') hasCategorical = true
    if (roleCandidate === 'text') hasText = true

    if (nullPct >= 0.5) columnsOver50.push(col.name)
    if (nullPct >= 0.9) columnsOver90.push(col.name)

    perColumn.push({
      name: col.name,
      inferredType,
      roleCandidate,
      nullPct: clampPct(nullPct),
      distinctCount,
      sampleValues,
    })
  }

  let duplicatesPct = 0
  if (profiledRowCount > 0) {
    const seen = new Set()
    let dup = 0
    for (const r of profiledRows) {
      const key = stableRowKey(r || {})
      if (seen.has(key)) dup++
      else seen.add(key)
    }
    duplicatesPct = dup / profiledRowCount
  }

  const overallMissingPct = missingCells / totalCells

  return {
    datasetStats: {
      rowCount,
      columnCount: columnsSorted.length,
      profiledRowCount,
    },
    columns: perColumn,
    flags: {
      hasTime,
      hasGeo,
      hasNumeric,
      hasCategorical,
      hasText,
    },
    quality: {
      duplicatesPct: clampPct(duplicatesPct),
      missingnessSummary: {
        overallMissingPct: clampPct(overallMissingPct),
        columnsOver50PctMissing: columnsOver50.sort((a, b) => a.localeCompare(b)),
        columnsOver90PctMissing: columnsOver90.sort((a, b) => a.localeCompare(b)),
      },
      parseIssues: parseIssues
        .filter((x) => x.count > 0)
        .sort((a, b) => (a.column + a.type).localeCompare(b.column + b.type)),
    },
  }
}

module.exports = { profileDataset }

