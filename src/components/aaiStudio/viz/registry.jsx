/**
 * Premium Viz Registry: block.type + templateId + payload subtype -> component.
 * Returns a component to render, or null to use the default VIEW_MAP renderer.
 */

import GeoUSChoropleth from './GeoUSChoropleth'
import EmptyState from './EmptyState'
import { GeoEmptyState } from './EmptyState'
import KPIStatCard from './KPIStatCard'
import TrendHeroChart from './TrendHeroChart'
import DriverBarChart from './DriverBarChart'
import WaterfallDelta from './WaterfallDelta'
import TreemapShare from './TreemapShare'
import DistributionHistogram from './DistributionHistogram'
import { aggregateByState, isUSStateKey } from './usStateCodes'
import { GovConKpiRow, GovConTrendHero, GovConDriverBars, GovConDetailsTable, TopStatesList } from './govcon'
import { formatNum as formatNumBase, isCurrencyMeasure } from '../formatUtils'

/**
 * Get the premium renderer component for a block, or null to use default.
 * @param {Object} block - InsightBlock { type, payload, ... }
 * @param {Object} context - { templateId, ... }
 * @returns {React.Component|null}
 */
export function getPremiumRenderer(block, context = {}) {
  try {
    const type = block?.type
    const payload = block?.payload || {}
    const templateId = context.templateId || 'general'

    switch (type) {
    case 'KPIBlock':
      if (templateId === 'govcon') return GovConKpiRow
      return KPIStatCardRow
    case 'TrendBlock':
      if (templateId === 'govcon') return GovConTrendHero
      return TrendHeroChart
    case 'DriverBlock':
      if (templateId === 'govcon') return GovConDriverBars
      return DriverBarChart
    case 'DetailsTableBlock':
      if (templateId === 'govcon') return GovConDetailsTable
      return null
    case 'ComparePeriodsBlock':
      if (payload.contributions && Object.keys(payload.contributions).length > 0) return WaterfallDelta
      return null
    case 'GeoBlock':
      if (payload.reason || (payload.mode !== 'points' && (!payload.rows || payload.rows.length === 0))) return EmptyStateGeo
      if (payload.mode === 'region' && Array.isArray(payload.rows) && payload.rows.length > 0) {
        const hasUSStates = payload.rows.some((r) => isUSStateKey(r?.key))
        if (hasUSStates) return templateId === 'govcon' ? GovConMapWithTopStates : GeoUSChoroplethWrapper
      }
      return null
    case 'GeoLikeBlock':
      if (payload.reason) return null
      if (Array.isArray(payload.rows) && payload.rows.length > 0 && payload.rows.some((r) => isUSStateKey(r?.key))) {
        return GeoUSChoroplethWrapper
      }
      return null
    case 'TopNBlock':
    case 'BreakdownBlock':
      if (templateId === 'govcon' || templateId === 'ecommerce') {
        const rows = payload.rows || []
        if (rows.length > 8) return TreemapShare
      }
      return null
    case 'DistributionBlock':
      return DistributionHistogram
    default:
      return null
    }
  } catch (_) {
    return null
  }
}

/** Wrapper that passes GeoBlock/GeoLikeBlock rows into GeoUSChoropleth and handles filter state. */
function GeoUSChoroplethWrapper({ block, filterState, onFilterChange }) {
  const rows = Array.isArray(block?.payload?.rows) ? block.payload.rows : []
  const regionColumn = block?.payload?.regionColumn || block?.payload?.dimension || 'region'
  const selectedState = regionColumn ? filterState?.eq?.[regionColumn] : null
  const byState = aggregateByState(rows)
  if (byState.length === 0) return <GeoEmptyState />
  const handleStateClick = (code) => {
    if (!onFilterChange?.setEq || !regionColumn) return
    onFilterChange.setEq(regionColumn, selectedState === code ? null : code)
  }
  return (
    <GeoUSChoropleth
      rows={rows}
      selectedState={selectedState}
      onStateClick={handleStateClick}
    />
  )
}

/** GovCon: US map (2/3) + Top States list (1/3). */
function GovConMapWithTopStates({ block, filterState, onFilterChange }) {
  const rows = Array.isArray(block?.payload?.rows) ? block.payload.rows : []
  const regionColumn = block?.payload?.regionColumn || block?.payload?.dimension || 'region'
  const selectedState = regionColumn ? filterState?.eq?.[regionColumn] : null
  const byState = aggregateByState(rows)
  if (byState.length === 0) return <GeoEmptyState />
  const handleStateClick = (code) => {
    if (!onFilterChange?.setEq || !regionColumn) return
    onFilterChange.setEq(regionColumn, selectedState === code ? null : code)
  }
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
        Opportunities by State (Last 90 Days)
      </h4>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 min-h-[280px]">
          <GeoUSChoropleth
            rows={rows}
            selectedState={selectedState}
            onStateClick={handleStateClick}
          />
        </div>
        <div className="lg:col-span-1">
          <TopStatesList rows={rows} title="Top States" />
        </div>
      </div>
    </div>
  )
}

/** Empty state for Geo when NOT_APPLICABLE or no region data. */
function EmptyStateGeo() {
  return <GeoEmptyState />
}

/** KPI row: render as grid of KPIStatCards. We need to adapt KPIBlock payload to cards. */
function KPIStatCardRow({ block }) {
  const payload = block?.payload || {}
  const executiveKpis = payload.executiveKpis
  const metricSummaries = Array.isArray(payload.metricSummaries) ? payload.metricSummaries : []
  const rowCount = payload.rowCount
  const cards = []

  const formatNum = (v, currency) => formatNumBase(v, { currency: !!currency })
  const anyMetricIsCurrency = metricSummaries.some((m) => isCurrencyMeasure(m?.name))
  const useCurrency = isCurrencyMeasure(payload.primaryMeasure) || anyMetricIsCurrency

  const totalValue = executiveKpis?.latest?.value != null
    ? formatNum(executiveKpis.latest.value, useCurrency)
    : (rowCount != null ? Number(rowCount).toLocaleString() : '—')
  const primaryLabel = payload.primaryMeasure ? String(payload.primaryMeasure).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Total'
  cards.push({
    label: primaryLabel,
    value: totalValue,
    subtitle: executiveKpis?.latest?.period ? `Period: ${executiveKpis.latest.period}` : null,
    delta: null,
    sparklineData: null,
  })

  if (executiveKpis?.change) {
    cards.push({
      label: 'Change vs Prior',
      value: formatNum(executiveKpis.change.abs, useCurrency),
      subtitle: null,
      delta: executiveKpis.change.pct,
      sparklineData: null,
    })
  }

  if (executiveKpis?.topContributor) {
    const tc = executiveKpis.topContributor
    cards.push({
      label: `Top ${tc.dimension || 'Contributor'}`,
      value: tc.group || '—',
      subtitle: `${(tc.share * 100).toFixed(1)}% of total`,
      delta: null,
      sparklineData: null,
    })
  }

  metricSummaries.slice(0, 4).forEach((m) => {
    if (cards.length >= 6) return
    const mCurrency = isCurrencyMeasure(m?.name)
    cards.push({
      label: m.name || 'Metric',
      value: formatNum(m.summary?.mean, mCurrency),
      subtitle: m.summary != null ? `min ${formatNum(m.summary.min, mCurrency)} · max ${formatNum(m.summary.max, mCurrency)}` : null,
      delta: null,
      sparklineData: null,
    })
  })

  if (cards.length === 0) {
    cards.push({ label: 'Total', value: '—', subtitle: null, delta: null, sparklineData: null })
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c, i) => (
        <KPIStatCard
          key={c.label + i}
          label={c.label}
          value={c.value}
          subtitle={c.subtitle}
          delta={c.delta}
          sparklineData={c.sparklineData}
        />
      ))}
    </div>
  )
}

export { GeoUSChoropleth, EmptyState, GeoEmptyState, KPIStatCard, TrendHeroChart, WaterfallDelta, TreemapShare, DistributionHistogram, DriverBarChart }
export { normalizeStateKey, isUSStateKey, aggregateByState, US_STATE_CODES } from './usStateCodes'
