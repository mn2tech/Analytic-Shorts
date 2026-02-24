import type { DatasetProfile } from './profileDataset'
import type { CanonicalDataset } from '../contracts/canonicalDataset'

export interface SemanticGraph {
  version: string
  builtAt: string
  columns: Record<
    string,
    {
      name: string
      roleCandidate: string
      inferredType: string
      nullPct?: number
      distinctCount?: number
    }
  >
  primaryMeasure?: string | null
}

function safeNumber(v: any): number | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const s = String(v).trim()
  if (!s) return null
  const cleaned = s.replace(/[$,\s]/g, '')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function pickPrimaryMeasureName(candidates: string[]): string | null {
  const prefs = ['sales', 'revenue', 'amount', 'cost', 'spend', 'income']
  const lower = (s: string) => String(s || '').toLowerCase()
  for (const p of prefs) {
    const hit = candidates.find((c) => lower(c).includes(p))
    if (hit) return hit
  }
  return null
}

function computeVarianceStats(rows: Record<string, any>[], col: string) {
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

function selectPrimaryMeasure(datasetProfile: DatasetProfile, canonicalDataset?: CanonicalDataset | null): string | null {
  const cols = Array.isArray(datasetProfile?.columns) ? datasetProfile.columns : []
  const rows = Array.isArray(canonicalDataset?.rows) ? canonicalDataset!.rows : []
  const candidates = cols
    .filter((c) => c && (c.roleCandidate === 'measure' || c.inferredType === 'number'))
    .filter((c) => c.roleCandidate !== 'time' && c.roleCandidate !== 'id' && c.roleCandidate !== 'geo')
    .map((c) => c.name)

  if (candidates.length === 0) return null

  const preferred = pickPrimaryMeasureName(candidates)
  if (preferred) return preferred

  if (!rows.length) return candidates[0]

  const stats = candidates.map((c) => ({ name: c, ...computeVarianceStats(rows, c) }))
  const nonZeroMean = stats.filter((s) => Math.abs(s.mean || 0) > 1e-9 && s.n >= 3)
  const pool = nonZeroMean.length ? nonZeroMean : stats
  pool.sort((a, b) => (b.variance - a.variance) || String(a.name).localeCompare(String(b.name)))
  return pool[0]?.name || candidates[0]
}

export function buildSemanticGraph(datasetProfile: DatasetProfile, canonicalDataset?: CanonicalDataset | null): SemanticGraph {
  const cols = Array.isArray(datasetProfile?.columns) ? datasetProfile.columns : []
  const columns: SemanticGraph['columns'] = {}
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
  return {
    version: '1.0',
    builtAt: new Date().toISOString(),
    columns,
    primaryMeasure: canonicalDataset ? selectPrimaryMeasure(datasetProfile, canonicalDataset) : null,
  }
}

