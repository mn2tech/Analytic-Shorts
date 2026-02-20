import { useMemo, useState } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
  Marker
} from 'react-simple-maps'

const WORLD_TOPOLOGY_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'
const MAX_MARKERS = 800
const DEFAULT_CENTER = [0, 20]
const DEFAULT_ZOOM = 1
const MARKER_SIZE = 20

// Normalize vessel_type for lookup (lowercase, trim)
function normalizeVesselType(v) {
  if (v === null || v === undefined) return 'default'
  return String(v).toLowerCase().trim() || 'default'
}

// Map vessel type (normalized) to icon key
const VESSEL_TYPE_TO_ICON = {
  cargo: 'cargo',
  tanker: 'tanker',
  passenger: 'passenger',
  fishing: 'fishing',
  tug: 'tug',
  sail: 'sail',
  pleasure: 'pleasure',
  default: 'default'
}

function getIconKey(vesselType) {
  const n = normalizeVesselType(vesselType)
  for (const [key] of Object.entries(VESSEL_TYPE_TO_ICON)) {
    if (key !== 'default' && n.includes(key)) return key
  }
  return 'default'
}

const VESSEL_ICON_BASE = '/icons/vessels'

// Image icon per vessel type (SVG from public/icons/vessels). Rotated by COG.
function VesselMarkerImage({ iconKey, cog = 0 }) {
  const rot = Number.isFinite(cog) ? cog : 0
  const href = `${VESSEL_ICON_BASE}/${iconKey || 'default'}.svg`
  return (
    <g transform={`translate(${MARKER_SIZE / 2},${MARKER_SIZE / 2}) rotate(${rot}) translate(${-MARKER_SIZE / 2},${-MARKER_SIZE / 2})`}>
      <image
        href={href}
        x={0}
        y={0}
        width={MARKER_SIZE}
        height={MARKER_SIZE}
        preserveAspectRatio="xMidYMid meet"
      />
    </g>
  )
}

function VesselMapWidget({
  data = [],
  latCol = 'lat',
  lonCol = 'lon',
  vesselTypeCol = 'vessel_type',
  tooltipFields = ['mmsi', 'vessel_type', 'sog', 'cog']
}) {
  const [tooltip, setTooltip] = useState(null)

  const points = useMemo(() => {
    const rows = Array.isArray(data) ? data : []
    const out = []
    for (let i = 0; i < rows.length && out.length < MAX_MARKERS; i++) {
      const row = rows[i]
      const lat = Number(row[latCol])
      const lon = Number(row[lonCol])
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) continue
      const vesselType = row[vesselTypeCol]
      const iconKey = getIconKey(vesselType)
      out.push({
        coordinates: [lon, lat],
        row,
        tooltipFields,
        iconKey,
        cog: Number(row.cog)
      })
    }
    return out
  }, [data, latCol, lonCol, vesselTypeCol, tooltipFields])

  const buildTooltip = (row) => {
    if (!row) return ''
    const parts = []
    const fields = Array.isArray(tooltipFields) ? tooltipFields : ['mmsi', 'vessel_type', 'sog', 'cog']
    for (const f of fields) {
      const v = row[f]
      if (v !== null && v !== undefined && v !== '') parts.push(`${f}: ${v}`)
    }
    return parts.length ? parts.join(' · ') : 'Vessel position'
  }

  return (
    <div className="flex flex-col relative min-h-[360px]">
      <div className="flex-shrink-0 text-xs text-gray-600 mb-1">
        Vessel positions (lat/lon)
      </div>
      <div className="flex-1 min-h-[320px]">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 120 }}
          width={800}
          height={400}
          style={{ width: '100%', height: '100%', minHeight: '320px', maxWidth: '100%' }}
        >
          <ZoomableGroup center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM}>
            <Geographies geography={WORLD_TOPOLOGY_URL}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#e5e7eb"
                    stroke="#94a3b8"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: 'none' },
                      hover: { outline: 'none', fill: '#d1d5db' },
                      pressed: { outline: 'none' }
                    }}
                  />
                ))
              }
            </Geographies>
            {points.map((p, idx) => (
              <Marker key={idx} coordinates={p.coordinates}>
                <g
                  transform={`translate(${-MARKER_SIZE / 2},${-MARKER_SIZE / 2})`}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setTooltip({ content: buildTooltip(p.row), row: p.row })}
                  onMouseLeave={() => setTooltip(null)}
                >
                  <VesselMarkerImage iconKey={p.iconKey} cog={p.cog} />
                </g>
              </Marker>
            ))}
          </ZoomableGroup>
        </ComposableMap>
      </div>
      {tooltip && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10 max-w-[90%]">
          {tooltip.content}
        </div>
      )}
      <div className="flex-shrink-0 text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-x-2">
        <span>
          {points.length} position{points.length !== 1 ? 's' : ''} shown
          {Array.isArray(data) && data.length > MAX_MARKERS && ` (sampled from ${data.length})`}
        </span>
        <span className="text-gray-400">
          Vessel icons: <a href="https://icons8.com/icons/set/ship" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Icons8</a>
        </span>
      </div>
    </div>
  )
}

export default VesselMapWidget
