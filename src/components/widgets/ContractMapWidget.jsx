import { useMemo, useState, useEffect } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
  Marker
} from 'react-simple-maps'

// US state/territory abbreviation or name -> FIPS (2-digit string) for TopoJSON match
const STATE_TO_FIPS = {
  AL: '01', Alabama: '01', Alaska: '02', AK: '02', Arizona: '04', AZ: '04',
  Arkansas: '05', AR: '05', California: '06', CA: '06', Colorado: '08', CO: '08',
  Connecticut: '09', CT: '09', Delaware: '10', DE: '10', 'District of Columbia': '11', DC: '11',
  Florida: '12', FL: '12', Georgia: '13', GA: '13', Hawaii: '15', HI: '15',
  Idaho: '16', ID: '16', Illinois: '17', IL: '17', Indiana: '18', IN: '18',
  Iowa: '19', IA: '19', Kansas: '20', KS: '20', Kentucky: '21', KY: '21',
  Louisiana: '22', LA: '22', Maine: '23', ME: '23', Maryland: '24', MD: '24',
  Massachusetts: '25', MA: '25', Michigan: '26', MI: '26', Minnesota: '27', MN: '27',
  Mississippi: '28', MS: '28', Missouri: '29', MO: '29', Montana: '30', MT: '30',
  Nebraska: '31', NE: '31', Nevada: '32', NV: '32', 'New Hampshire': '33', NH: '33',
  'New Jersey': '34', NJ: '34', 'New Mexico': '35', NM: '35', 'New York': '36', NY: '36',
  'North Carolina': '37', NC: '37', 'North Dakota': '38', ND: '38', Ohio: '39', OH: '39',
  Oklahoma: '40', OK: '40', Oregon: '41', OR: '41', Pennsylvania: '42', PA: '42',
  'Rhode Island': '44', RI: '44', 'South Carolina': '45', SC: '45', 'South Dakota': '46', SD: '46',
  Tennessee: '47', TN: '47', Texas: '48', TX: '48', Utah: '49', UT: '49',
  Vermont: '50', VT: '50', Virginia: '51', VA: '51', Washington: '53', WA: '53',
  'West Virginia': '54', WV: '54', Wisconsin: '55', WI: '55', Wyoming: '56', WY: '56'
}

const US_STATES_TOPOLOGY = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json'

const FIPS_TO_ABBR = {}
Object.entries(STATE_TO_FIPS).forEach(([abbrOrName, fips]) => {
  if (abbrOrName.length === 2) FIPS_TO_ABBR[fips] = abbrOrName
})

// Approximate state centroids [longitude, latitude] for label placement (no d3-geo dependency)
const STATE_CENTROIDS = {
  '01': [-86.9, 32.3], '02': [-153.5, 64.2], '04': [-111.6, 34.2], '05': [-92.4, 34.7],
  '06': [-119.4, 37.2], '08': [-105.3, 38.9], '09': [-72.8, 41.6], '10': [-75.5, 38.9],
  '11': [-77.0, 38.9], '12': [-81.6, 27.8], '13': [-83.6, 32.6], '15': [-155.5, 19.6],
  '16': [-114.5, 44.4], '17': [-89.4, 40.0], '18': [-86.3, 40.3], '19': [-93.5, 42.0],
  '20': [-98.4, 38.5], '21': [-84.3, 37.5], '22': [-92.0, 31.2], '23': [-69.4, 45.4],
  '24': [-76.6, 38.9], '25': [-71.4, 42.2], '26': [-84.5, 43.3], '27': [-94.7, 46.4],
  '28': [-89.6, 32.7], '29': [-91.6, 37.9], '30': [-110.4, 47.0], '31': [-99.5, 41.1],
  '32': [-116.4, 39.3], '33': [-71.6, 43.2], '34': [-74.4, 40.2], '35': [-105.3, 34.4],
  '36': [-75.5, 43.0], '37': [-79.0, 35.5], '38': [-100.4, 47.5], '39': [-82.8, 40.4],
  '40': [-97.5, 35.6], '41': [-120.6, 43.9], '42': [-77.4, 41.2], '44': [-71.6, 41.7],
  '45': [-81.0, 33.8], '46': [-99.5, 44.4], '47': [-86.6, 35.8], '48': [-99.3, 31.5],
  '49': [-111.6, 39.3], '50': [-72.6, 44.1], '51': [-78.7, 37.5], '53': [-120.7, 47.4],
  '54': [-80.8, 38.9], '55': [-89.6, 44.6], '56': [-107.6, 43.0]
}

function normalizeState(value) {
  if (value == null || value === '') return null
  const s = String(value).trim()
  const fips = STATE_TO_FIPS[s] || STATE_TO_FIPS[s.toUpperCase()]
  return fips || null
}

/** Canonical 2-letter state code for filtering (e.g. "PA"). Export for Dashboard state filter. */
export function getStateAbbr(value) {
  if (value == null || value === '') return ''
  const fips = normalizeState(value)
  return (fips && FIPS_TO_ABBR[fips]) || String(value).trim()
}

function ContractMapWidget({
  data = [],
  selectedCategorical = 'state',
  selectedNumeric = null,
  chartFilter,
  onChartFilter
}) {
  const [geographyData, setGeographyData] = useState(null)
  const [fetchError, setFetchError] = useState(null)
  const [tooltip, setTooltip] = useState(null)

  useEffect(() => {
    let cancelled = false
    setFetchError(null)
    fetch(US_STATES_TOPOLOGY)
      .then((res) => {
        if (!res.ok) throw new Error(`Map data failed: ${res.status}`)
        return res.json()
      })
      .then((topology) => {
        if (cancelled) return
        // Ensure react-simple-maps uses "states" (it uses first key in objects)
        const statesOnly = topology?.objects?.states
          ? { type: 'Topology', bbox: topology.bbox, transform: topology.transform, objects: { states: topology.objects.states }, arcs: topology.arcs }
          : topology
        setGeographyData(statesOnly)
      })
      .catch((err) => {
        if (!cancelled) {
          setFetchError(err?.message || 'Failed to load map')
          setGeographyData(null)
        }
      })
    return () => { cancelled = true }
  }, [])

  const { byFips, maxVal, total } = useMemo(() => {
    const map = new Map()
    let totalCount = 0
    let sumNumeric = 0
    const rows = Array.isArray(data) ? data : []
    const catCol = selectedCategorical
    const numCol = selectedNumeric

    for (const row of rows) {
      const stateVal = row[catCol]
      const fips = normalizeState(stateVal)
      if (!fips) continue
      const prev = map.get(fips) || { count: 0, sum: 0 }
      prev.count += 1
      if (numCol != null && row[numCol] != null) {
        const n = Number(row[numCol])
        if (!isNaN(n)) prev.sum += n
      }
      map.set(fips, prev)
      totalCount += 1
      if (numCol != null && row[numCol] != null) {
        const n = Number(row[numCol])
        if (!isNaN(n)) sumNumeric += n
      }
    }

    let maxVal = 0
    for (const v of map.values()) {
      const val = numCol ? v.sum : v.count
      if (val > maxVal) maxVal = val
    }
    return {
      byFips: map,
      maxVal: maxVal || 1,
      total: numCol ? sumNumeric : totalCount
    }
  }, [data, selectedCategorical, selectedNumeric])

  const fipsToId = (id) => (id != null && String(id).length === 1 ? `0${id}` : String(id))

  const isStateSelected = (fips) => {
    if (!chartFilter || chartFilter.type !== 'category') return false
    const abbr = FIPS_TO_ABBR[fips]
    return abbr && getStateAbbr(chartFilter.value) === abbr
  }

  const getFill = (geo) => {
    const fips = fipsToId(geo.id)
    const rec = byFips.get(fips)
    const selected = isStateSelected(fips)
    if (!rec) return selected ? 'rgb(96, 165, 250)' : '#e5e7eb'
    const val = selectedNumeric ? rec.sum : rec.count
    const ratio = maxVal ? val / maxVal : 0
    const t = selected ? 1 : 0.4 + 0.55 * ratio
    return `rgb(${Math.round(59 * t)}, ${Math.round(130 * t)}, ${Math.round(246 * t)})`
  }

  const handleStateClick = (fips) => {
    if (!onChartFilter) return
    const abbr = FIPS_TO_ABBR[fips]
    if (!abbr) return
    const currentAbbr = chartFilter?.type === 'category' ? getStateAbbr(chartFilter.value) : null
    if (currentAbbr === abbr) {
      onChartFilter(null)
    } else {
      onChartFilter({ type: 'category', value: abbr })
    }
  }

  if (fetchError) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-amber-700 bg-amber-50 rounded-lg p-4">
        <p className="text-sm">{fetchError}</p>
      </div>
    )
  }

  if (!geographyData) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-gray-500 text-sm">
        Loading map…
      </div>
    )
  }

  const formatVal = (v) => {
    const n = typeof v === 'number' ? v : Number(v)
    if (n >= 1000000) return `${(n / 1e6).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return n.toLocaleString()
  }

  const metricLabel = selectedNumeric ? `Sum of ${selectedNumeric}` : 'Opportunity count'

  return (
    <div className="flex flex-col relative min-h-[420px]">
      <div className="flex-shrink-0 text-xs text-gray-600 mb-1">
        {metricLabel} by state
      </div>
      <div className="flex-1 min-h-[380px]">
        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{ scale: 1000 }}
          width={800}
          height={500}
          style={{ width: '100%', height: '500px', maxWidth: '100%' }}
        >
          <ZoomableGroup center={[-96, 38]} zoom={1}>
            <Geographies geography={geographyData}>
              {({ geographies }) => (
                <>
                  {geographies.map((geo) => {
                    const fips = fipsToId(geo.id)
                    const rec = byFips.get(fips)
                    const val = rec ? (selectedNumeric ? rec.sum : rec.count) : 0
                    const stateName = geo.properties?.name ?? FIPS_TO_ABBR[fips] ?? fips
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={getFill(geo)}
                        stroke={isStateSelected(fips) ? '#1d4ed8' : '#fff'}
                        strokeWidth={isStateSelected(fips) ? 1.5 : 0.5}
                        style={{
                          default: { outline: 'none', cursor: onChartFilter ? 'pointer' : 'default' },
                          hover: { outline: 'none', filter: 'brightness(1.1)' },
                          pressed: { outline: 'none' }
                        }}
                        onMouseEnter={() => setTooltip({ stateName, val, fips })}
                        onMouseLeave={() => setTooltip(null)}
                        onClick={() => handleStateClick(fips)}
                      />
                    )
                  })}
                  {geographies.map((geo) => {
                    const fips = fipsToId(geo.id)
                    const rec = byFips.get(fips)
                    const val = rec ? (selectedNumeric ? rec.sum : rec.count) : 0
                    const coord = STATE_CENTROIDS[fips]
                    if (!coord) return null
                    const hasData = !!rec
                    return (
                      <Marker key={`label-${geo.rsmKey}`} coordinates={coord}>
                        <text
                          textAnchor="middle"
                          dominantBaseline="middle"
                          stroke={hasData ? '#1e3a8a' : '#374151'}
                          strokeWidth={1.5}
                          strokeLinejoin="round"
                          paintOrder="stroke fill"
                          style={{
                            fontFamily: 'system-ui, sans-serif',
                            fontSize: '13px',
                            fontWeight: 700,
                            fill: hasData ? '#ffffff' : '#e5e7eb',
                            pointerEvents: 'none',
                            userSelect: 'none'
                          }}
                        >
                          {formatVal(val)}
                        </text>
                      </Marker>
                    )
                  })}
                </>
              )}
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
      </div>
      {tooltip && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
          {tooltip.stateName}: {typeof tooltip.val === 'number' && tooltip.val % 1 !== 0 ? tooltip.val.toLocaleString(undefined, { maximumFractionDigits: 0 }) : Number(tooltip.val).toLocaleString()}
        </div>
      )}
      <div className="flex-shrink-0 text-xs text-gray-500 mt-1">
        {total.toLocaleString()} total · {onChartFilter ? 'Click a state to filter opportunities' : 'Counts shown on map'}
      </div>
    </div>
  )
}

export default ContractMapWidget
