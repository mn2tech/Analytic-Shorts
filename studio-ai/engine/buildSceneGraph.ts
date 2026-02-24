import type { DatasetProfile } from './profileDataset'
import type { InsightBlock } from './executePlan'

export interface SceneGraph {
  version: string
  builtAt: string
  nodes: Array<{
    id: string
    type: 'InsightBlockNode'
    blockId: string
    blockType: string
    title: string
    layout: { order: number }
  }>
  filters: Array<any>
  pages?: Array<{ id: string; label: string; nodeIds: string[] }>
}

export function buildSceneGraph(input: { insightBlocks: InsightBlock[]; datasetProfile: DatasetProfile }): SceneGraph {
  const blocks = Array.isArray(input?.insightBlocks) ? input.insightBlocks : []
  const nodes = blocks.map((b, idx) => ({
    id: `node-${String(idx + 1).padStart(2, '0')}`,
    type: 'InsightBlockNode' as const,
    blockId: b.id,
    blockType: b.type,
    title: b.title,
    layout: { order: idx },
  }))

  const filters: any[] = []
  const cols = Array.isArray(input?.datasetProfile?.columns) ? input.datasetProfile.columns : []
  const timeCol = cols.find((c) => c?.roleCandidate === 'time')?.name
  if (timeCol) filters.push({ id: 'time_range', type: 'time_range', column: timeCol, label: 'Date range' })
  const geoCol = cols.find((c) => c?.roleCandidate === 'geo' && /(state|country)/i.test(String(c.name)))?.name
  if (geoCol) filters.push({ id: 'geo', type: 'dropdown', column: geoCol, label: 'Geography' })

  const overviewTypes = new Set(['KPIBlock', 'TrendBlock', 'DriverBlock', 'GeoBlock', 'GeoLikeBlock'])
  const insightTypes = new Set(['ComparePeriodsBlock', 'AnomalyBlock'])
  const qualityTypes = new Set(['DataQualityBlock'])
  const detailTypes = new Set(['DetailsTableBlock'])

  const overviewNodes = nodes.filter((n) => overviewTypes.has(n.blockType))
  const insightNodes = nodes.filter((n) => insightTypes.has(n.blockType))
  const qualityNodes = nodes.filter((n) => qualityTypes.has(n.blockType))
  const detailNodes = nodes.filter((n) => detailTypes.has(n.blockType))
  const used = new Set([...overviewNodes, ...insightNodes, ...qualityNodes, ...detailNodes].map((n) => n.id))
  const leftover = nodes.filter((n) => !used.has(n.id))
  const overviewFinal = [...overviewNodes, ...leftover]

  return {
    version: '1.0',
    builtAt: new Date().toISOString(),
    nodes,
    filters,
    pages: [
      { id: 'overview', label: 'Overview', nodeIds: overviewFinal.map((n) => n.id) },
      { id: 'insights', label: 'Insights', nodeIds: insightNodes.map((n) => n.id) },
      { id: 'quality', label: 'Data Quality', nodeIds: qualityNodes.map((n) => n.id) },
      { id: 'details', label: 'Details', nodeIds: detailNodes.map((n) => n.id) },
    ],
  }
}

