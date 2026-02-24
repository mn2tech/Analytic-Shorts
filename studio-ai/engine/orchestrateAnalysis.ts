import type { DatasetProfile } from './profileDataset'
import type { CanonicalDataset } from '../contracts/canonicalDataset'
import type { SemanticGraph } from './buildSemanticGraph'

export interface AnalysisPlan {
  version: string
  builtAt: string
  blocks: any[]
  selections?: any
}

function chooseTimeColumn(datasetProfile: DatasetProfile): string | null {
  const cols = Array.isArray(datasetProfile?.columns) ? datasetProfile.columns : []
  return cols.find((c) => c?.roleCandidate === 'time')?.name || null
}

function chooseMeasures(datasetProfile: DatasetProfile, { limit = 5 } = {}): string[] {
  const cols = Array.isArray(datasetProfile?.columns) ? datasetProfile.columns : []
  const measures = cols
    .filter((c) => c?.roleCandidate === 'measure' || c?.inferredType === 'number')
    .filter((c) => c?.roleCandidate !== 'time' && c?.roleCandidate !== 'id' && c?.roleCandidate !== 'geo')
  measures.sort((a, b) => {
    const am = a.roleCandidate === 'measure' ? 0 : 1
    const bm = b.roleCandidate === 'measure' ? 0 : 1
    if (am !== bm) return am - bm
    if ((a.nullPct || 0) !== (b.nullPct || 0)) return (a.nullPct || 0) - (b.nullPct || 0)
    return String(a.name).localeCompare(String(b.name))
  })
  return measures.slice(0, limit).map((c) => c.name)
}

function chooseDimension(datasetProfile: DatasetProfile): string | null {
  const cols = Array.isArray(datasetProfile?.columns) ? datasetProfile.columns : []
  const rowCount = datasetProfile?.datasetStats?.profiledRowCount || datasetProfile?.datasetStats?.rowCount || 0
  const candidates = cols
    .filter((c) => c && (c.roleCandidate === 'dimension' || c.roleCandidate === 'geo') && c.inferredType !== 'object')
    .filter((c) => c.roleCandidate !== 'id' && c.roleCandidate !== 'text')
    .filter((c) => {
      const d = c.distinctCount || 0
      if (d < 2) return false
      if (rowCount && d > Math.min(200, rowCount * 0.95)) return false
      return true
    })
  candidates.sort((a, b) => {
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
  return candidates[0]?.name || null
}

function chooseTopDimensions(datasetProfile: DatasetProfile, { limit = 3 } = {}): string[] {
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

function chooseGeoConfig(datasetProfile: DatasetProfile): any | null {
  const cols = Array.isArray(datasetProfile?.columns) ? datasetProfile.columns : []
  const lat = cols.find((c) => /(^|__)(lat|latitude)$/i.test(String(c.name)))?.name || null
  const lon = cols.find((c) => /(^|__)(lon|lng|longitude)$/i.test(String(c.name)))?.name || null
  const region =
    cols.find((c) => /(state|country)$/i.test(String(c.name)) && c.roleCandidate === 'geo')?.name ||
    cols.find((c) => /(state|country)$/i.test(String(c.name)))?.name ||
    null
  if (lat && lon) return { geoMode: 'points', latColumn: lat, lonColumn: lon }
  if (region) return { geoMode: 'region', regionColumn: region }
  return null
}

function isNullLike(v: any): boolean {
  return v === null || v === undefined || v === ''
}

function parseDate(v: any): Date | null {
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

function chooseTimeGrain(canonicalDataset: CanonicalDataset | undefined | null, timeColumn: string | null): 'day' | 'week' | 'month' {
  const rows = Array.isArray(canonicalDataset?.rows) ? canonicalDataset!.rows : []
  if (!timeColumn || rows.length === 0) return 'day'

  let minT: number | null = null
  let maxT: number | null = null
  const days = new Set<string>()
  let parsed = 0
  for (const r of rows) {
    const d = parseDate((r as any)?.[timeColumn])
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

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(1, v))
}

function computeDataQualityPenalty(datasetProfile: DatasetProfile): number {
  const q: any = (datasetProfile as any)?.quality || {}
  const dup = Number.isFinite(q.duplicatesPct) ? q.duplicatesPct : 0
  const missingTop = Array.isArray(q.missingnessSummary) ? q.missingnessSummary : []
  const miss = missingTop.length ? Math.max(...missingTop.map((m: any) => (Number.isFinite(m?.nullPct) ? m.nullPct : 0))) : 0
  const issues = Array.isArray(q.parseIssues) ? q.parseIssues.length : 0
  return clamp01(dup * 0.6 + miss * 0.9 + Math.min(0.5, issues / 20) * 0.5)
}

export function orchestrateAnalysis(datasetProfile: DatasetProfile, semanticGraph?: SemanticGraph | null, canonicalDataset?: CanonicalDataset | null): AnalysisPlan {
  const timeColumn = chooseTimeColumn(datasetProfile)
  const measures = chooseMeasures(datasetProfile, { limit: 5 })
  const primaryMeasure = semanticGraph?.primaryMeasure || measures[0] || null
  const grain = chooseTimeGrain(canonicalDataset, timeColumn)
  const dimension = chooseDimension(datasetProfile)
  const topDims = chooseTopDimensions(datasetProfile, { limit: 3 })
  const geo = chooseGeoConfig(datasetProfile)
  const dataQualityPenalty = computeDataQualityPenalty(datasetProfile)

  const blocks: any[] = []
  blocks.push({ type: 'KPIBlock' })
  if (timeColumn) blocks.push({ type: 'TrendBlock', timeColumn, grain, measure: primaryMeasure || undefined, agg: primaryMeasure ? 'sum' : 'count' })
  if (primaryMeasure && topDims.length) blocks.push({ type: 'DriverBlock', measure: primaryMeasure, dimensions: topDims, limit: 12 })

  const geoLikeDim = topDims.find((d) => /region|zone|area|district|territory/i.test(String(d))) || null
  if (geo) blocks.push({ type: 'GeoBlock', ...geo, measure: primaryMeasure || undefined, agg: primaryMeasure ? 'sum' : 'count' })
  else if (geoLikeDim) blocks.push({ type: 'GeoLikeBlock', dimension: geoLikeDim, measure: primaryMeasure || undefined, agg: primaryMeasure ? 'sum' : 'count', limit: 10 })
  else blocks.push({ type: 'GeoBlock' })

  blocks.push({ type: 'DetailsTableBlock', previewRows: 50 })

  if (timeColumn && primaryMeasure && topDims.length) {
    const compareDims = topDims.filter((d) => /(category|region)/i.test(String(d))).slice(0, 2)
    blocks.push({ type: 'ComparePeriodsBlock', timeColumn, measure: primaryMeasure, dimensions: compareDims, limit: 12 })
  }
  blocks.push({ type: 'DataQualityBlock' })

  return {
    version: '1.0',
    builtAt: new Date().toISOString(),
    blocks,
    selections: { timeColumn, grain, measures, primaryMeasure, dimension, topDims, geo, dataQualityPenalty },
  }
}

