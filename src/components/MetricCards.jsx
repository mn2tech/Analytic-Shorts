import { useMemo, memo, useState } from 'react'
import { parseNumericValue } from '../utils/numberUtils'
import { formatCompact } from '../utils/formatNumber'
import { TD } from '../constants/terminalDashboardPalette'

function MetricCards({ data, numericColumns, selectedNumeric, stats }) {
  if (!data || data.length === 0 || !stats || !selectedNumeric) return null

  const [showAdvanced, setShowAdvanced] = useState(false)

  // Memoize expensive calculations to prevent recalculation on every render
  const metrics = useMemo(() => {
    // Sample data if too large for performance
    const sampleSize = 5000
    const sampledData = data.length > sampleSize 
      ? data.filter((_, i) => i % Math.ceil(data.length / sampleSize) === 0)
      : data

    const values = sampledData
      .map((row) => {
        const value = parseNumericValue(row[selectedNumeric])
        const originalValue = row[selectedNumeric]
        return { value, originalValue }
      })
      .filter((item) => {
        // Keep zeros if they're valid (original was '0' or '$0'), or if value is non-zero
        return !isNaN(item.value) && (item.value !== 0 || item.originalValue === '0' || item.originalValue === '$0')
      })
      .map((item) => item.value)

    if (values.length === 0) return null

    // Calculate engagement rate (percentage of non-zero values)
    const nonZeroCount = values.filter(v => v > 0).length
    const engagementRate = (nonZeroCount / values.length) * 100

    // Calculate average per item (same as avg)
    const avgPerItem = stats.avg

    // Calculate total unique values
    const uniqueValues = new Set(values).size

    // Calculate median (optimized for large arrays)
    const sorted = values.length > 1000 
      ? [...values].sort((a, b) => a - b).slice(0, 1000) // Sample for median if too large
      : [...values].sort((a, b) => a - b)
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)]

    // Calculate standard deviation (optimized)
    const variance = values.reduce((acc, val) => acc + Math.pow(val - stats.avg, 2), 0) / values.length
    const stdDev = Math.sqrt(variance)

    return {
      engagementRate,
      avgPerItem,
      uniqueValues,
      median,
      stdDev,
      totalItems: data.length, // Use original data length
      activeItems: nonZeroCount,
    }
  }, [data, selectedNumeric, stats])
  if (!metrics) return null

  const formatValue = (value, type = 'number') => {
    if (type === 'percentage') {
      return `${value.toFixed(2)}%`
    }
    if (type === 'time') {
      const hours = Math.floor(value / 3600)
      const minutes = Math.floor((value % 3600) / 60)
      const seconds = Math.floor(value % 60)
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }
    return typeof value === 'number' ? formatCompact(value) : value
  }

  // Calculate more meaningful metrics
  // Add defensive check for selectedNumeric
  if (!selectedNumeric || !data || data.length === 0) {
    return null
  }

  const values = data
    .map((row) => {
      if (!row || !row[selectedNumeric]) {
        return { value: NaN, originalValue: null }
      }
      const value = parseNumericValue(row[selectedNumeric])
      const originalValue = row[selectedNumeric]
      return { value, originalValue }
    })
    .filter((item) => {
      // Keep zeros if they're valid (original was '0' or '$0'), or if value is non-zero
      return !isNaN(item.value) && isFinite(item.value) && (item.value !== 0 || item.originalValue === '0' || item.originalValue === '$0')
    })
    .map((item) => item.value)

  if (values.length === 0) return null

  const sorted = [...values].sort((a, b) => a - b)
  const q1Index = Math.floor(sorted.length * 0.25)
  const q3Index = Math.floor(sorted.length * 0.75)
  const q1 = sorted[q1Index] || 0
  const q3 = sorted[q3Index] || 0
  const iqr = q3 - q1

  // Calculate growth rate (comparing first half vs second half)
  const mid = Math.floor(values.length / 2)
  const firstHalfAvg = mid > 0 ? values.slice(0, mid).reduce((a, b) => a + b, 0) / mid : 0
  const secondHalfAvg = mid > 0 ? values.slice(mid).reduce((a, b) => a + b, 0) / (values.length - mid) : 0
  const growthRate = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0

  // Calculate coefficient of variation (relative variability)
  const cv = stats.avg > 0 ? (metrics.stdDev / stats.avg) * 100 : 0

  // Detect if this is percentage/rate data (shouldn't show "Total Sum")
  const isPercentageData = selectedNumeric.toLowerCase().includes('%') || 
                           selectedNumeric.toLowerCase().includes('rate') ||
                           selectedNumeric.toLowerCase().includes('percentage') ||
                           (stats.max <= 100 && stats.min >= 0 && stats.avg < 50) // Heuristic: likely percentage if 0-100 range

  // Calculate range (more meaningful for percentage data)
  const range = stats.max - stats.min

  // Build card data - conditionally show "Total Sum" or "Range" based on data type
  const keyMetric = isPercentageData
    ? { label: 'Range', value: formatCompact(range), accent: TD.ACCENT_BLUE }
    : { label: 'Total', value: formatCompact(stats.sum), accent: TD.ACCENT_BLUE }

  const primaryCards = [
    keyMetric,
    { label: 'Average', value: formatCompact(stats.avg), accent: '#7c3aed' },
    { label: 'Min', value: formatCompact(stats.min), accent: TD.TEXT_3 },
    { label: 'Max', value: formatCompact(stats.max), accent: TD.SUCCESS_ALT },
    {
      label: 'Trend',
      value: formatValue(growthRate, 'percentage'),
      trendDelta: growthRate,
      accent: growthRate < 0 ? TD.DANGER : growthRate === 0 ? TD.TEXT_3 : TD.SUCCESS_ALT,
    },
  ]

  // Advanced stats (available via toggle)
  const advancedCards = [
    { label: 'Total Items', value: formatCompact(metrics.totalItems), accent: TD.TEXT_3 },
    { label: 'Engagement Rate', value: formatValue(metrics.engagementRate, 'percentage'), accent: TD.SUCCESS_ALT },
    { label: 'Median', value: formatCompact(metrics.median), accent: '#db2777' },
    { label: 'Unique Values', value: formatCompact(metrics.uniqueValues), accent: '#7c3aed' },
    { label: 'Std Deviation', value: formatCompact(metrics.stdDev), accent: '#6366f1' },
    { label: 'IQR (Spread)', value: formatCompact(iqr), accent: TD.ACCENT_MID },
    { label: 'Variability', value: formatValue(cv, 'percentage'), accent: TD.SUCCESS_ALT },
  ]

  return (
    <div className="space-y-4">
      {/* Primary (default) */}
      <div className="flex items-center justify-between gap-3">
        <p style={{ fontSize: '14px', fontWeight: 600, color: TD.TEXT_1 }}>Key metrics</p>
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          style={{ fontSize: '14px', fontWeight: 500, color: TD.ACCENT_MID, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {showAdvanced ? 'Hide advanced stats' : 'Show advanced stats'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {primaryCards.map((card, index) => (
          <div
            key={index}
            className="rounded-lg p-4 transition-all duration-200 cursor-pointer group"
            style={{
              background: TD.CARD_BG,
              border: `0.5px solid ${TD.CARD_BORDER}`,
              borderLeft: `4px solid ${card.accent}`,
            }}
            title={`${card.label}: ${card.value}`}
          >
            <p style={{ fontSize: '12px', fontWeight: 500, color: TD.TEXT_3, marginBottom: '4px' }}>{card.label}</p>
            <p style={{ fontSize: '20px', fontWeight: 500, color: TD.TEXT_1 }}>{card.value}</p>
            {card.label === 'Trend' && (
              <p style={{ fontSize: '12px', marginTop: '6px', color: TD.TEXT_2 }}>
                {(card.trendDelta ?? 0) < 0
                  ? '↓ Declining from prior period'
                  : (card.trendDelta ?? 0) > 0
                    ? '↑ Growing from prior period'
                    : 'Flat vs prior period'}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Advanced (toggle) */}
      {showAdvanced && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
          {advancedCards.map((card, index) => (
            <div
              key={`adv-${index}`}
              className="rounded-lg p-4 transition-all duration-200 cursor-pointer group"
              style={{
                background: TD.CARD_BG,
                border: `0.5px solid ${TD.CARD_BORDER}`,
                borderLeft: `4px solid ${card.accent}`,
              }}
              title={`${card.label}: ${card.value}`}
            >
              <p style={{ fontSize: '12px', fontWeight: 500, color: TD.TEXT_3, marginBottom: '4px' }}>{card.label}</p>
              <p style={{ fontSize: '18px', fontWeight: 600, color: TD.TEXT_1 }}>{card.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Memoize component to prevent unnecessary re-renders
export default memo(MetricCards)

