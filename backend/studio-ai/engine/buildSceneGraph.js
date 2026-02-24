// Default block display order per template (same blocks, different emphasis).
const TEMPLATE_BLOCK_ORDER = {
  general: ['KPIBlock', 'TrendBlock', 'DriverBlock', 'GeoBlock', 'GeoLikeBlock', 'ComparePeriodsBlock', 'DetailsTableBlock', 'AnomalyBlock', 'DataQualityBlock'],
  govcon: ['KPIBlock', 'TrendBlock', 'DriverBlock', 'GeoBlock', 'GeoLikeBlock', 'DetailsTableBlock', 'ComparePeriodsBlock', 'AnomalyBlock', 'DataQualityBlock'],
  ecommerce: ['KPIBlock', 'TrendBlock', 'DriverBlock', 'ComparePeriodsBlock', 'GeoBlock', 'GeoLikeBlock', 'DetailsTableBlock', 'AnomalyBlock', 'DataQualityBlock'],
  saas: ['KPIBlock', 'ComparePeriodsBlock', 'TrendBlock', 'DriverBlock', 'GeoBlock', 'GeoLikeBlock', 'DetailsTableBlock', 'AnomalyBlock', 'DataQualityBlock'],
}

function buildSceneGraph({ insightBlocks, datasetProfile, templateId, overrides }) {
  const blocks = Array.isArray(insightBlocks) ? insightBlocks : []
  const overridesBlockOrder = (overrides && Array.isArray(overrides.blockOrder)) ? overrides.blockOrder : null
  const blockOrder = overridesBlockOrder && overridesBlockOrder.length > 0
    ? overridesBlockOrder
    : (TEMPLATE_BLOCK_ORDER[templateId] || TEMPLATE_BLOCK_ORDER.general)
  const enabledBlocks = (overrides && overrides.enabledBlocks && typeof overrides.enabledBlocks === 'object') ? overrides.enabledBlocks : null

  let filtered = blocks
  if (enabledBlocks && Object.keys(enabledBlocks).length > 0) {
    filtered = blocks.filter((b) => {
      const enabled = enabledBlocks[b.type]
      if (enabled === false) return false
      return true
    })
  }

  const nodes = filtered.map((b, idx) => ({
    id: `node-${String(idx + 1).padStart(2, '0')}`,
    type: 'InsightBlockNode',
    blockId: b.id,
    blockType: b.type,
    title: b.title,
    layout: { order: idx },
  }))

  const sortNodesByBlockOrder = (nodeList) => {
    if (!blockOrder || blockOrder.length === 0) return nodeList
    const orderMap = new Map(blockOrder.map((t, i) => [t, i]))
    return [...nodeList].sort((a, b) => {
      const at = (nodes.find((n) => n.id === a) || {}).blockType
      const bt = (nodes.find((n) => n.id === b) || {}).blockType
      const ai = at && orderMap.has(at) ? orderMap.get(at) : 9999
      const bi = bt && orderMap.has(bt) ? orderMap.get(bt) : 9999
      return ai - bi
    })
  }

  // Minimal global filter schema (front-end interprets these).
  const filters = []
  const cols = Array.isArray(datasetProfile?.columns) ? datasetProfile.columns : []
  const timeCol = cols.find((c) => c?.roleCandidate === 'time')?.name
  if (timeCol) {
    filters.push({ id: 'time_range', type: 'time_range', column: timeCol, label: 'Date range' })
  }
  const geoCol = cols.find((c) => c?.roleCandidate === 'geo' && /(state|country)/i.test(String(c.name)))?.name
  if (geoCol) {
    filters.push({ id: 'geo', type: 'dropdown', column: geoCol, label: 'State' })
  }
  const agencyCol = cols.find((c) => /agency/i.test(String(c.name)))?.name
  if (agencyCol) {
    filters.push({ id: 'agency', type: 'dropdown', column: agencyCol, label: 'Agency' })
  }
  const naicsCol = cols.find((c) => /naics/i.test(String(c.name)))?.name
  if (naicsCol) {
    filters.push({ id: 'naics', type: 'dropdown', column: naicsCol, label: 'NAICS' })
  }

  const isGovcon = templateId === 'govcon'
  const isEcommerce = templateId === 'ecommerce'
  const isSaas = templateId === 'saas'

  if (isGovcon) {
    const overviewTypes = new Set(['KPIBlock', 'TrendBlock', 'DriverBlock', 'GeoBlock', 'GeoLikeBlock', 'DetailsTableBlock'])
    const anomalyTypes = new Set(['TrendBlock', 'AnomalyBlock'])
    const segmentsTypes = new Set(['TopNBlock', 'BreakdownBlock', 'ComparePeriodsBlock'])
    const qualityTypes = new Set(['DataQualityBlock'])
    const overviewNodes = nodes.filter((n) => overviewTypes.has(n.blockType))
    const anomalyNodes = nodes.filter((n) => anomalyTypes.has(n.blockType))
    const segmentsNodes = nodes.filter((n) => segmentsTypes.has(n.blockType))
    const qualityNodes = nodes.filter((n) => qualityTypes.has(n.blockType))
    const used = new Set([...overviewNodes.map((n) => n.id), ...anomalyNodes.map((n) => n.id), ...segmentsNodes.map((n) => n.id), ...qualityNodes.map((n) => n.id)])
    const leftover = nodes.filter((n) => !used.has(n.id))
    const overviewIds = sortNodesByBlockOrder([...overviewNodes, ...leftover].map((n) => n.id))
    return {
      version: '1.0',
      builtAt: new Date().toISOString(),
      nodes,
      filters,
      pages: [
        { id: 'overview', label: 'Overview', nodeIds: overviewIds },
        { id: 'anomaliesForecast', label: 'Anomalies & Forecast', nodeIds: sortNodesByBlockOrder(anomalyNodes.map((n) => n.id)) },
        { id: 'segmentsTrends', label: 'Segments & Trends', nodeIds: sortNodesByBlockOrder(segmentsNodes.map((n) => n.id)) },
        { id: 'dataQuality', label: 'Data Quality', nodeIds: sortNodesByBlockOrder(qualityNodes.map((n) => n.id)) },
      ],
    }
  }

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

  if (isEcommerce) {
    return {
      version: '1.0',
      builtAt: new Date().toISOString(),
      nodes,
      filters,
      pages: [
        { id: 'overview', label: 'Performance', nodeIds: sortNodesByBlockOrder(overviewFinal.map((n) => n.id)) },
        { id: 'insights', label: 'Period Compare', nodeIds: sortNodesByBlockOrder(insightNodes.map((n) => n.id)) },
        { id: 'details', label: 'Data Table', nodeIds: sortNodesByBlockOrder(detailNodes.map((n) => n.id)) },
        { id: 'quality', label: 'Data Quality', nodeIds: sortNodesByBlockOrder(qualityNodes.map((n) => n.id)) },
      ],
    }
  }

  if (isSaas) {
    return {
      version: '1.0',
      builtAt: new Date().toISOString(),
      nodes,
      filters,
      pages: [
        { id: 'overview', label: 'Growth', nodeIds: sortNodesByBlockOrder(overviewFinal.map((n) => n.id)) },
        { id: 'insights', label: 'Compare & Anomaly', nodeIds: sortNodesByBlockOrder(insightNodes.map((n) => n.id)) },
        { id: 'details', label: 'Details', nodeIds: sortNodesByBlockOrder(detailNodes.map((n) => n.id)) },
        { id: 'quality', label: 'Data Quality', nodeIds: sortNodesByBlockOrder(qualityNodes.map((n) => n.id)) },
      ],
    }
  }

  return {
    version: '1.0',
    builtAt: new Date().toISOString(),
    nodes,
    filters,
    pages: [
      { id: 'overview', label: 'Overview', nodeIds: sortNodesByBlockOrder(overviewFinal.map((n) => n.id)) },
      { id: 'insights', label: 'Insights', nodeIds: sortNodesByBlockOrder(insightNodes.map((n) => n.id)) },
      { id: 'quality', label: 'Data Quality', nodeIds: sortNodesByBlockOrder(qualityNodes.map((n) => n.id)) },
      { id: 'details', label: 'Details', nodeIds: sortNodesByBlockOrder(detailNodes.map((n) => n.id)) },
    ],
  }
}

module.exports = { buildSceneGraph }

