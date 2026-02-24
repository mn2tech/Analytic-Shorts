import React, { useState, Component } from 'react'
import TrendBlockView from './TrendBlockView'
import TopNBlockView from './TopNBlockView'
import BreakdownBlockView from './BreakdownBlockView'
import DistributionBlockView from './DistributionBlockView'
import DriverBlockView from './DriverBlockView'
import ComparePeriodsBlockView from './ComparePeriodsBlockView'
import GeoLikeBlockView from './GeoLikeBlockView'
import GeoBlockView from './GeoBlockView'
import KPIBlockView from './KPIBlockView'
import DataQualityBlockView from './DataQualityBlockView'
import DetailsTableBlockView from './DetailsTableBlockView'
import { getPremiumRenderer } from './viz/registry.jsx'

function BlockCard({ title, children, onClick, isSelected }) {
  const baseStyle = {
    background: 'var(--card)',
    border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
    boxShadow: isSelected ? '0 0 0 2px var(--primary)' : 'var(--shadow)',
  }
  const content = (
    <>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{title}</h3>
      </div>
      {children}
    </>
  )
  if (onClick) {
    return (
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); onClick() }}
        className="w-full text-left rounded-xl p-6 transition-all cursor-pointer hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)]"
        style={baseStyle}
      >
        {content}
      </button>
    )
  }
  return (
    <div className="rounded-xl p-6" style={baseStyle}>
      {content}
    </div>
  )
}

function StatusPill({ status }) {
  const s = String(status || '')
  const style =
    s === 'OK'
      ? { background: 'var(--card-2)', color: 'var(--success)', borderColor: 'var(--success)' }
      : s === 'NOT_APPLICABLE'
        ? { background: 'var(--card-2)', color: 'var(--muted)', borderColor: 'var(--border)' }
        : { background: 'var(--card-2)', color: 'var(--warning)', borderColor: 'var(--warning)' }
  return <span className="text-xs px-2 py-1 rounded-full border" style={style}>{s || '—'}</span>
}

function TrustBadge({ badge }) {
  const b = badge || {}
  const s = String(b.status || '')
  const style = s === 'OK' ? { background: 'var(--card-2)', color: 'var(--success)', borderColor: 'var(--success)' } : { background: 'var(--card-2)', color: 'var(--warning)', borderColor: 'var(--warning)' }
  return (
    <span className="text-xs px-2 py-1 rounded-full border" style={style} title={b.id || ''}>
      {b.label || '—'}
    </span>
  )
}

const VIEW_MAP = {
  KPIBlock: KPIBlockView,
  TrendBlock: TrendBlockView,
  TopNBlock: TopNBlockView,
  BreakdownBlock: BreakdownBlockView,
  DistributionBlock: DistributionBlockView,
  DriverBlock: DriverBlockView,
  ComparePeriodsBlock: ComparePeriodsBlockView,
  GeoLikeBlock: GeoLikeBlockView,
  GeoBlock: GeoBlockView,
  DataQualityBlock: DataQualityBlockView,
  DetailsTableBlock: DetailsTableBlockView,
}

/**
 * Renders a single InsightBlock with the correct chart/table view.
 * @param {Object} block - InsightBlock from executePlan
 * @param {Object} filterState - { eq: Record<col, value>, timeRange: { column, start, end } | null }
 * @param {Object} onFilterChange - { setEq(col, value), setTimeRange({ column, start, end }) }
 */
function CollapsibleNotApplicable({ block, title, header, children }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="rounded-xl shadow-md overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full px-6 py-4 flex items-center justify-between gap-3 text-left transition-colors"
        style={{ background: 'transparent' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <h3 className="text-lg font-semibold truncate" style={{ color: 'var(--text)' }}>{title}</h3>
          <StatusPill status="NOT_APPLICABLE" />
          <span className="text-sm" style={{ color: 'var(--muted)' }}>Not applicable — click to expand</span>
        </div>
        <svg
          className={`w-5 h-5 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          style={{ color: 'var(--muted)' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="px-6 pb-6 pt-0 border-t" style={{ borderColor: 'var(--border)' }}>
          {header}
          {children}
        </div>
      )}
    </div>
  )
}

function getPremiumRendererSafe(block, context) {
  try {
    return getPremiumRenderer(block, context)
  } catch (_) {
    return null
  }
}

/** Catches render errors from premium viz and falls back to default view so one block cannot blank the page. */
class PremiumBlockErrorBoundary extends Component {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(err, info) {
    if (typeof console !== 'undefined') console.warn('[AAIStudio] Premium block render failed, using default view', err, info?.componentStack)
  }
  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}

export default function AAIStudioBlockRenderer({ block, filterState = {}, onFilterChange = {}, templateId, isSelected = false, onSelect }) {
  if (!block) return null

  const title = `${block.title || block.type} `
  const isNotApplicable = String(block.status || '').toUpperCase() === 'NOT_APPLICABLE'
  const PremiumComponent = getPremiumRendererSafe(block, { templateId })
  const ViewComponent = VIEW_MAP[block.type]
  const usePremium = PremiumComponent != null
  const handleSelect = onSelect || undefined

  const header = (
    <>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs" style={{ color: 'var(--muted)' }}>{block.questionAnswered}</div>
        {!isNotApplicable && <StatusPill status={block.status} />}
      </div>
      {Array.isArray(block.badges) && block.badges.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {block.badges.map((x) => (
            <TrustBadge key={x.id || x.label} badge={x} />
          ))}
        </div>
      )}
      {block.blockNarrative && <div className="text-sm mb-3" style={{ color: 'var(--text)' }}>{block.blockNarrative}</div>}
    </>
  )

  const commonProps = { block, filterState, onFilterChange }

  const defaultView = ViewComponent ? (
    isNotApplicable ? (
      <CollapsibleNotApplicable key={block.id} block={block} title={title} header={header}>
        <ViewComponent block={block} filterState={filterState} onFilterChange={onFilterChange} />
      </CollapsibleNotApplicable>
    ) : (
      <BlockCard key={block.id} title={title} onClick={handleSelect} isSelected={isSelected}>
        {header}
        <ViewComponent block={block} filterState={filterState} onFilterChange={onFilterChange} />
      </BlockCard>
    )
  ) : null

  if (usePremium && PremiumComponent) {
    const premiumContent = isNotApplicable ? (
      <CollapsibleNotApplicable key={block.id} block={block} title={title} header={header}>
        <PremiumComponent {...commonProps} />
      </CollapsibleNotApplicable>
    ) : (
      <BlockCard key={block.id} title={title} onClick={handleSelect} isSelected={isSelected}>
        {header}
        <PremiumComponent {...commonProps} />
      </BlockCard>
    )
    return (
      <PremiumBlockErrorBoundary fallback={defaultView}>
        {premiumContent}
      </PremiumBlockErrorBoundary>
    )
  }

  if (ViewComponent) {
    if (isNotApplicable) {
      return (
        <CollapsibleNotApplicable key={block.id} block={block} title={title} header={header}>
          <ViewComponent block={block} filterState={filterState} onFilterChange={onFilterChange} />
        </CollapsibleNotApplicable>
      )
    }
    return (
      <BlockCard key={block.id} title={title} onClick={handleSelect} isSelected={isSelected}>
        {header}
        <ViewComponent block={block} filterState={filterState} onFilterChange={onFilterChange} />
      </BlockCard>
    )
  }

  // Fallback: AnomalyBlock and any unknown type
  if (isNotApplicable) {
    return (
      <CollapsibleNotApplicable key={block.id} block={block} title={title} header={header}>
        <pre className="text-xs overflow-auto rounded-lg p-2 mt-2" style={{ background: 'var(--card-2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
          {JSON.stringify(block.payload, null, 2)}
        </pre>
      </CollapsibleNotApplicable>
    )
  }
  return (
    <BlockCard key={block.id} title={title} onClick={handleSelect} isSelected={isSelected}>
      {header}
      <pre className="text-xs overflow-auto rounded-lg p-2" style={{ background: 'var(--card-2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
        {JSON.stringify(block.payload, null, 2)}
      </pre>
    </BlockCard>
  )
}

export { BlockCard, StatusPill, TrustBadge }
