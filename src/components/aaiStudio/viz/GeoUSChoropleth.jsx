import { useMemo, useState } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import { aggregateByState, STATE_CODE_TO_FIPS } from './usStateCodes'

const US_ATLAS_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json'

function formatValue(v) {
  if (v == null || !Number.isFinite(v)) return '—'
  if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(2)}B`
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(2)}M`
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(2)}K`
  return Number(v).toLocaleString()
}

export default function GeoUSChoropleth({ rows = [], onStateClick, selectedState }) {
  const [hoveredState, setHoveredState] = useState(null)

  const { byState, valueByFips, maxVal, topStates } = useMemo(() => {
    const byState = aggregateByState(rows)
    const valueByFips = {}
    let maxVal = 0
    for (const s of byState) {
      const fips = STATE_CODE_TO_FIPS[s.stateCode]
      if (fips) {
        valueByFips[fips] = s.value
        if (s.value > maxVal) maxVal = s.value
      }
    }
    const topStates = [...byState].sort((a, b) => b.value - a.value).slice(0, 5)
    return { byState, valueByFips, maxVal, topStates }
  }, [rows])

  const getFill = (fips) => {
    const v = valueByFips[fips]
    const code = Object.entries(STATE_CODE_TO_FIPS).find(([, f]) => f === fips)?.[0]
    const isSelected = selectedState === code || hoveredState === code
    if (isSelected) return 'var(--chart-selected)'
    if (v == null) return 'var(--card-2)'
    return 'var(--chart-primary)'
  }

  const getFillOpacity = (fips) => {
    const v = valueByFips[fips]
    if (v == null || !maxVal) return 0.15
    return 0.25 + 0.7 * Math.min(1, v / maxVal)
  }

  if (byState.length === 0) {
    return (
      <div className="text-sm flex items-center justify-center py-8" style={{ color: 'var(--muted)' }}>
        No US state data to display
      </div>
    )
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1 min-h-[280px]" style={{ color: 'var(--text)' }}>
        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{ scale: 1000 }}
          style={{ width: '100%', height: 'auto' }}
        >
          <Geographies geography={US_ATLAS_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const fips = geo.id
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getFill(fips)}
                    fillOpacity={getFillOpacity(fips)}
                    stroke="var(--border)"
                    strokeWidth={0.5}
                    onMouseEnter={() => {
                      const code = Object.entries(STATE_CODE_TO_FIPS).find(([, f]) => f === fips)?.[0]
                      setHoveredState(code || null)
                    }}
                    onMouseLeave={() => setHoveredState(null)}
                    onClick={() => {
                      const code = Object.entries(STATE_CODE_TO_FIPS).find(([, f]) => f === fips)?.[0]
                      onStateClick?.(code)
                    }}
                    style={{
                      default: { outline: 'none' },
                      hover: { outline: 'none', cursor: onStateClick ? 'pointer' : 'default' },
                      pressed: { outline: 'none' },
                    }}
                  />
                )
              })
            }
          </Geographies>
        </ComposableMap>
        {(hoveredState || selectedState) && (
          <div className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>
            {hoveredState && valueByFips[STATE_CODE_TO_FIPS[hoveredState]] != null && (
              <span>{hoveredState}: {formatValue(valueByFips[STATE_CODE_TO_FIPS[hoveredState]])}</span>
            )}
            {selectedState && !hoveredState && <span>Selected: {selectedState}</span>}
          </div>
        )}
      </div>
      <div className="w-full sm:w-48 shrink-0">
        <div className="text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>Top States</div>
        <ul className="space-y-1.5">
          {topStates.map((s) => (
            <li
              key={s.stateCode}
              className="flex justify-between text-sm gap-2"
              style={{ color: 'var(--text)' }}
            >
              <span>{s.stateCode}</span>
              <span>{formatValue(s.value)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
