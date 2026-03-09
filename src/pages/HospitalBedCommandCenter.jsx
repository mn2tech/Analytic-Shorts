/**
 * Hospital Bed Command Center - Blueprint floor plan image.
 * Displays the hospital blueprint with zoom and pan.
 */
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../config/api'
import {
  ROOM_OVERLAY_COORDINATES,
  BLUEPRINT_OVERLAY_VIEWBOX,
  STATUS_LABELS,
  STATUS_FILL_COLORS,
  DEFAULT_ROOM_FILL,
  INFRASTRUCTURE_ROOM_IDS,
  NON_PATIENT_ROOM_TYPES,
  isInfrastructureByLabel,
  addMockPredictions,
  computeRoomMetrics,
  formatD2PMinutes,
} from '../config/hospitalBedData'
import { pickPatientForRoom, pickDoctorForRoom, getAdmittedAtIsoForRoom } from '../data/hospitalMockData'
import {
  getRoomPressureLevel,
  getPressureStyle,
  PRESSURE_LABELS,
} from '../utils/losPressure'
import LiveStatus from '../components/LiveStatus'
import KpiGroupCard from '../components/KpiGroupCard'

/** Short status labels for room overlays (fit in small rooms) */
const STATUS_SHORT = {
  available: 'Avail',
  occupied: 'Occ',
  cleaning: 'Clean',
  reserved: 'Res',
}

/** Status colors - used for dot so it's never gray */
const STATUS_COLORS = ['#2ECC71', '#E74C3C', '#F1C40F', '#3498DB']

/** Convert FloorMap export rooms to overlay format */
function roomsToOverlay(rooms) {
  if (!Array.isArray(rooms)) return []
  return rooms.map((r) => ({
    id: r.room_id,
    x: r.bbox?.x ?? 0,
    y: r.bbox?.y ?? 0,
    width: r.bbox?.width ?? 50,
    height: r.bbox?.height ?? 50,
    unit: r.unit || null,
  }))
}

const WAITING_ROOM_ID = 'ROOM_011' // WAITING AREA on blueprint

function toAdmittedAtIso(losMinutes) {
  return new Date(Date.now() - losMinutes * 60_000).toISOString()
}

/** Fallback mock data when API is unavailable */
function getFallbackRoomData(overlayCoords = ROOM_OVERLAY_COORDINATES) {
  const statuses = ['available', 'occupied', 'cleaning', 'reserved']
  return overlayCoords.map((r, i) => {
    if (r.id === 'ROOM_006') {
      const minsAgo = DEMO_LOS.ROOM_006
      const iso = toAdmittedAtIso(minsAgo)
      return { room: 'ROOM_006', status: 'occupied', patient_name: pickPatientForRoom('ROOM_006', 6), doctor: pickDoctorForRoom('ROOM_006', 6), admitted_at: new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), admitted_at_iso: iso }
    }
    if (r.id === 'ROOM_009') {
      const minsAgo = DEMO_LOS.ROOM_009
      const iso = toAdmittedAtIso(minsAgo)
      return { room: 'ROOM_009', status: 'occupied', patient_name: pickPatientForRoom('ROOM_009', 9), doctor: pickDoctorForRoom('ROOM_009', 9), admitted_at: new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), admitted_at_iso: iso }
    }
    if (r.id === 'ROOM_010') {
      const iso = getAdmittedAtIsoForRoom('ROOM_010', 10)
      return { room: 'ROOM_010', status: 'occupied', patient_name: pickPatientForRoom('ROOM_010', 10), doctor: pickDoctorForRoom('ROOM_010', 10), admitted_at: new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), admitted_at_iso: iso }
    }
    if (r.id === 'ROOM_027') {
      const minsAgo = DEMO_LOS.ROOM_027
      const iso = toAdmittedAtIso(minsAgo)
      return { room: 'ROOM_027', status: 'occupied', patient_name: pickPatientForRoom('ROOM_027', 27), doctor: pickDoctorForRoom('ROOM_027', 27), admitted_at: new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), admitted_at_iso: iso }
    }
    if (r.id === 'ROOM_023') {
      const minsAgo = DEMO_LOS.ROOM_023
      const iso = toAdmittedAtIso(minsAgo)
      return { room: 'ROOM_023', status: 'occupied', patient_name: pickPatientForRoom('ROOM_023', 23), doctor: pickDoctorForRoom('ROOM_023', 23), admitted_at: new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), admitted_at_iso: iso }
    }
    if (r.id === 'ROOM_038') {
      const minsAgo = DEMO_LOS.ROOM_038
      const iso = toAdmittedAtIso(minsAgo)
      return { room: 'ROOM_038', status: 'occupied', patient_name: pickPatientForRoom('ROOM_038', 38), doctor: pickDoctorForRoom('ROOM_038', 38), admitted_at: new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), admitted_at_iso: iso }
    }
    const status = r.id === WAITING_ROOM_ID ? 'available' : statuses[i % 4]
    const isOccupied = status === 'occupied'
    const isReserved = status === 'reserved'
    const iso = (isOccupied || isReserved) ? getAdmittedAtIsoForRoom(r.id, i) : null
    const base = {
      room: r.id,
      status,
      patient_name: isOccupied ? pickPatientForRoom(r.id, i) : (isReserved ? 'Incoming' : null),
      doctor: isOccupied || isReserved ? pickDoctorForRoom(r.id, i) : null,
      admitted_at: iso ? new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : null,
      ...(iso && { admitted_at_iso: iso }),
    }
    return r.id === WAITING_ROOM_ID ? { ...base, waitingCount: 12 } : base
  })
}

const BLUEPRINT_PATHS = [
  '/hospital-blueprint.png',
  '/images/hospital-blueprint.png',
]

/** Dot radius in viewBox units - larger for visibility on all rooms */
const DOT_RADIUS = 18
/** Horizontal offset to center dots on rooms (coords may not match blueprint exactly) */
const DOT_OFFSET_X = -50

function formatAvgLOS(mins) {
  if (mins == null) return '—'
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function KpiPanels({ metrics, statusFilter, onFilterChange }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
      <KpiGroupCard
        title="CAPACITY"
        metrics={[
          { label: 'Total Beds', value: metrics.total },
          { label: 'Occupied', value: metrics.occupied, filterKey: 'occupied' },
          { label: 'Available', value: metrics.available, filterKey: 'available' },
          { label: 'Utilization', value: `${metrics.utilizationPct ?? 0}%` },
        ]}
        onMetricClick={onFilterChange}
        activeFilter={statusFilter}
      />
      <KpiGroupCard
        title="TURNOVER"
        metrics={[
          { label: 'Cleaning', value: metrics.cleaning, filterKey: 'cleaning' },
          { label: 'Reserved', value: metrics.reserved, filterKey: 'reserved' },
          { label: 'Predicted Available', value: metrics.predictedAvailable, filterKey: 'predicted' },
        ]}
        onMetricClick={onFilterChange}
        activeFilter={statusFilter}
      />
      <KpiGroupCard
        title="FLOW PRESSURE"
        metrics={[
          { label: 'Avg LOS', value: formatAvgLOS(metrics.avgLOS) },
          { label: 'Door-to-Provider', value: formatD2PMinutes(metrics.avgD2P) },
          { label: 'Waiting Provider', value: metrics.waitingForProvider ?? 0, valueColor: metrics.waitingForProvider > 0 ? '#f59e0b' : undefined },
          { label: 'High Pressure', value: metrics.highPressureRooms ?? 0, filterKey: 'highPressure', valueColor: '#ff9800' },
          { label: 'Critical', value: metrics.criticalRooms ?? 0, filterKey: 'critical', valueColor: '#e53935' },
        ]}
        onMetricClick={onFilterChange}
        activeFilter={statusFilter}
      />
    </div>
  )
}

function formatPredictionMins(mins) {
  if (mins >= 60) return `${Math.floor(mins / 60)}h`
  return `${mins}m`
}

/** Minutes ago for demo LOS - LOS derived dynamically from admitted_at_iso */
const DEMO_LOS = { ROOM_006: 25, ROOM_009: 95, ROOM_027: 220, ROOM_023: 320, ROOM_038: 360 }

function RoomTooltip({ roomData, tooltipPos, showPressureLabel = true, unit }) {
  if (!roomData) return null
  const statusLabel = STATUS_LABELS[roomData.status] || roomData.status
  const waitingProvider = unit === 'ER' && roomData.status === 'occupied' && !roomData.provider_seen_time
  const admittedDisplay = roomData.admitted_at ?? (roomData.admitted_at_iso ? new Date(roomData.admitted_at_iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : null)
  const { level: pressureLevel, losLabel } = getRoomPressureLevel(roomData)
  const pressureLabel = PRESSURE_LABELS[pressureLevel]
  const x = tooltipPos?.x ?? 0
  const y = tooltipPos?.y ?? 0
  return (
    <div
      className="fixed z-50 pointer-events-none min-w-[220px] max-w-[280px] rounded-lg shadow-2xl overflow-hidden
        border border-white/20 bg-slate-900/95 backdrop-blur-sm text-white"
      style={{ left: x + 16, top: y - 8 }}
    >
      <div className="px-4 py-2.5 bg-slate-800/90 border-b border-white/10">
        <span className="font-bold text-sm">Room: {roomData.room}</span>
      </div>
      <div className="p-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Patient</span>
          <span className="font-medium text-right">{roomData.patient_name || '—'}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Doctor</span>
          <span className="font-medium text-right">{roomData.doctor || '—'}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Status</span>
          <span className="font-semibold">{statusLabel}</span>
        </div>
        {(roomData.waitingCount != null || roomData.waiting_count != null) && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Patients waiting</span>
            <span className="font-semibold text-amber-400">{roomData.waitingCount ?? roomData.waiting_count}</span>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Admitted</span>
          <span className="font-medium text-right">{admittedDisplay || '—'}</span>
        </div>
        {losLabel && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">LOS</span>
            <span className="font-semibold text-cyan-400">{losLabel}</span>
          </div>
        )}
        {waitingProvider && (
          <div className="flex justify-between gap-4 items-center">
            <span className="text-slate-400">ER status</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/90 text-slate-900">
              Waiting Provider
            </span>
          </div>
        )}
        {(roomData.predictedInMinutes != null || roomData.predicted_in_minutes != null) && (
          <div className="flex justify-between gap-4 items-center">
            <span className="text-slate-400">Predicted</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/90 text-white border border-emerald-400/50">
              Avail ~{formatPredictionMins(roomData.predictedInMinutes ?? roomData.predicted_in_minutes)}
            </span>
          </div>
        )}
        {showPressureLabel && pressureLabel && (
          <div className="flex justify-between gap-4 items-center pt-1 border-t border-white/10 mt-2">
            <span className="text-slate-400">Pressure</span>
            <span className={`text-xs font-semibold ${
              pressureLevel === 'critical' ? 'text-red-400' :
              pressureLevel === 'high' ? 'text-orange-400' :
              'text-amber-400'
            }`}>
              {pressureLabel}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function BlueprintImage({ roomOverlays, roomStatusMap, onRoomHover, onRoomClick, hoveredRoom, statusFilter, unitFilters = new Set(), imageDimensions: jsonImageDimensions, manualDimensions, showPressureLayer = true }) {
  const [imageError, setImageError] = useState(false)
  const [pathIndex, setPathIndex] = useState(0)
  const [loadedDimensions, setLoadedDimensions] = useState(null)
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '') || ''
  const imageSrc = `${base}${BLUEPRINT_PATHS[pathIndex]}?v=2`

  const handleImageError = () => {
    if (pathIndex < BLUEPRINT_PATHS.length - 1) {
      setPathIndex((i) => i + 1)
    } else {
      setImageError(true)
    }
  }

  const handleImageLoad = (e) => {
    const img = e.target
    if (img?.naturalWidth && img?.naturalHeight) {
      setLoadedDimensions({ width: img.naturalWidth, height: img.naturalHeight })
    }
  }

  // Use dimensions from: 1) manual calibration, 2) loaded FloorMap JSON, 3) actual image on load, 4) fallback
  const viewBox = (() => {
    if (manualDimensions?.width && manualDimensions?.height) {
      return `0 0 ${manualDimensions.width} ${manualDimensions.height}`
    }
    if (jsonImageDimensions?.width && jsonImageDimensions?.height) {
      return `0 0 ${jsonImageDimensions.width} ${jsonImageDimensions.height}`
    }
    if (loadedDimensions?.width && loadedDimensions?.height) {
      return `0 0 ${loadedDimensions.width} ${loadedDimensions.height}`
    }
    return BLUEPRINT_OVERLAY_VIEWBOX
  })()
  const hasOverlays = Array.isArray(roomOverlays) && roomOverlays.length > 0

  // Match container aspect ratio to image so img and SVG overlay align exactly
  const aspectRatio = (() => {
    if (manualDimensions?.width && manualDimensions?.height) {
      return `${manualDimensions.width} / ${manualDimensions.height}`
    }
    if (jsonImageDimensions?.width && jsonImageDimensions?.height) {
      return `${jsonImageDimensions.width} / ${jsonImageDimensions.height}`
    }
    if (loadedDimensions?.width && loadedDimensions?.height) {
      return `${loadedDimensions.width} / ${loadedDimensions.height}`
    }
    return '1320 / 720' // fallback to default viewBox
  })()

  const isFiltered = !!statusFilter || unitFilters.size > 0
  return (
    <div
      className="relative w-full h-full min-h-[400px] max-w-full select-none"
      style={{ aspectRatio }}
    >
      {/* Background layer - dim when filter active so matching rooms pop */}
      <div
        className="absolute inset-0 bg-no-repeat bg-center bg-contain"
        style={{
          backgroundImage: imageError ? 'none' : `url(${imageSrc})`,
          opacity: isFiltered ? 0.55 : 1,
          transition: 'opacity 0.25s ease',
        }}
      />
      {/* Hidden img to get natural dimensions and trigger onLoad for dimensions */}
      <img
        key={pathIndex}
        src={imageSrc}
        alt=""
        className="sr-only"
        onError={handleImageError}
        onLoad={handleImageLoad}
      />
      {hasOverlays && !imageError && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none [&>*]:pointer-events-auto"
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          style={{ objectFit: 'contain' }}
        >
          {roomOverlays.map((r, idx) => {
            const isInfrastructure = INFRASTRUCTURE_ROOM_IDS.has(r.id) || NON_PATIENT_ROOM_TYPES.has(r.type) || isInfrastructureByLabel(r.label)
            const roomData = roomStatusMap[r.id]
            const status = roomData?.status ?? ['available', 'occupied', 'cleaning', 'reserved'][idx % 4]
            const fill = isInfrastructure ? 'rgba(148, 163, 184, 0.2)' : (STATUS_FILL_COLORS[status] || STATUS_COLORS[idx % 4])
            const waitingProvider = r.unit === 'ER' && status === 'occupied' && !roomData?.provider_seen_time
            // Dot always uses a status color (never gray) - cycle through colors if status unknown. No dot for infrastructure.
            const dotFill = isInfrastructure ? null : (STATUS_FILL_COLORS[status] || ['#2ECC71', '#E74C3C', '#F1C40F', '#3498DB'][idx % 4])
            const statusLabel = STATUS_SHORT[status] || status || '—'
            const predMins = roomData?.predictedInMinutes ?? roomData?.predicted_in_minutes
            const predText = predMins != null ? (predMins >= 60 ? `${Math.floor(predMins / 60)}h` : `${predMins}m`) : null
            const isHovered = hoveredRoom === r.id
            const { level: pressureLevel } = isInfrastructure ? { level: 'normal' } : (showPressureLayer ? getRoomPressureLevel(roomData) : { level: 'normal' })
            const pressureStyle = pressureLevel !== 'normal' ? getPressureStyle(pressureLevel) : {}
            const cx = r.x + (r.width ?? 50) / 2
            const cy = r.y + (r.height ?? 50) / 2
            const roomH = r.height ?? 50
            const roomW = r.width ?? 50
            const showStatus = !isInfrastructure && roomH >= 28
            const showPred = !isInfrastructure && predText && roomH >= 50
            const dotColor = dotFill || '#94A3B8'
            const matchesStatus = isInfrastructure ? true : !statusFilter
              ? true
              : statusFilter === 'predicted'
                ? predMins != null
                : statusFilter === 'highPressure'
                  ? pressureLevel === 'high'
                  : statusFilter === 'critical'
                    ? pressureLevel === 'critical'
                    : status === statusFilter
            const matchesUnit = unitFilters.size === 0 || (r.unit && unitFilters.has(r.unit))
            const matchesFilter = matchesStatus && matchesUnit
            const opacity = matchesFilter ? 1 : 0.06
            const isFilterActive = (!!statusFilter && matchesStatus) || (unitFilters.size > 0 && matchesUnit)
            return (
              <g
                key={r.id}
                data-room-id={r.id}
                style={{
                  opacity,
                  cursor: 'pointer',
                  transition: 'opacity 0.25s ease',
                }}
                onMouseEnter={(e) => onRoomHover?.(r.id, true, e)}
                onMouseLeave={(e) => onRoomHover?.(r.id, false, e)}
                onClick={(e) => { e.stopPropagation(); onRoomClick?.(r.id, e) }}
                title={pressureLevel !== 'normal' ? `Pressure: ${PRESSURE_LABELS[pressureLevel]}` : undefined}
              >
                {pressureLevel === 'critical' && (
                  <rect
                    x={r.x - 2}
                    y={r.y - 2}
                    width={(r.width ?? 50) + 4}
                    height={(r.height ?? 50) + 4}
                    fill="none"
                    stroke="#FCA5A5"
                    strokeWidth={4}
                    className="animate-pressure-pulse pointer-events-none"
                  />
                )}
                {waitingProvider && (
                  <>
                    <rect
                      x={r.x - 1}
                      y={r.y - 1}
                      width={(r.width ?? 50) + 2}
                      height={(r.height ?? 50) + 2}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="4 2"
                      className="pointer-events-none"
                    />
                    <text
                      x={r.x + 4}
                      y={r.y + roomH - 4}
                      textAnchor="start"
                      className="pointer-events-none"
                      style={{ fontSize: 7, fill: '#f59e0b', fontWeight: 700 }}
                    >
                      WP
                    </text>
                  </>
                )}
                <rect
                  x={r.x}
                  y={r.y}
                  width={r.width ?? 50}
                  height={r.height ?? 50}
                  fill={fill}
                  fillOpacity={isInfrastructure ? 0.25 : 0.5}
                  stroke={isHovered ? '#fff' : (isInfrastructure ? 'rgba(148,163,184,0.4)' : (pressureLevel !== 'normal' ? pressureStyle.stroke : (isFilterActive ? fill : 'rgba(15,23,42,0.6)')))}
                  strokeWidth={isHovered ? 2.5 : (isInfrastructure ? 1 : (pressureLevel !== 'normal' ? pressureStyle.strokeWidth : (isFilterActive ? 2 : 1)))}
                  className={!isInfrastructure && pressureLevel === 'critical' ? pressureStyle.className : undefined}
                  style={{ transition: 'stroke 0.2s ease, stroke-width 0.2s ease' }}
                />
                {!isInfrastructure && (
                <circle
                  cx={r.x + 8}
                  cy={r.y + 8}
                  r={5}
                  fill={dotColor}
                  stroke="#fff"
                  strokeWidth={1}
                  className="pointer-events-none"
                />
                )}
                <text
                  x={r.x + roomW - 4}
                  y={r.y + roomH * 0.35}
                  textAnchor="end"
                  className="select-none pointer-events-none"
                  style={{ fontSize: roomW < 45 ? 8 : 10, fill: '#0f172a', fontWeight: 700 }}
                >
                  {r.id.replace('ROOM_', '')}
                </text>
                {showStatus && (
                  <text
                    x={cx}
                    y={cy + 6}
                    textAnchor="middle"
                    className="select-none pointer-events-none"
                    style={{ fontSize: roomH < 50 ? 7 : 8, fill: fill, fontWeight: 700 }}
                  >
                    {statusLabel}
                  </text>
                )}
                {showPred && (
                  <text
                    x={cx}
                    y={cy + (showStatus ? 14 : 8)}
                    textAnchor="middle"
                    className="select-none pointer-events-none"
                    style={{ fontSize: 7, fill: '#059669', fontWeight: 600 }}
                  >
                    ~{predText}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      )}
      {imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800/90 text-slate-400 text-sm p-6 text-center">
          <div>
            <p className="font-semibold mb-2">Blueprint image not found</p>
            <p className="text-xs">
              Place your hospital blueprint at <code className="bg-slate-700 px-1 rounded">public/hospital-blueprint.png</code>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/** Convert FloorMap AI rooms to overlay format { id, x, y, width, height } */
function roomsToOverlays(rooms) {
  if (!Array.isArray(rooms)) return []
  return rooms.map((r) => ({
    id: r.room_id,
    x: r.bbox?.x ?? 0,
    y: r.bbox?.y ?? 0,
    width: r.bbox?.width ?? 50,
    height: r.bbox?.height ?? 50,
    unit: r.unit || null,
    type: r.type || null,
    label: r.label || null,
  }))
}

function HospitalBedCommandCenter() {
  const [roomData, setRoomData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(() => new Date())
  const [hoveredRoom, setHoveredRoom] = useState(null)
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [statusFilter, setStatusFilter] = useState(null) // 'available' | 'occupied' | 'cleaning' | 'reserved' | 'predicted' | null
  const [unitFilters, setUnitFilters] = useState(new Set()) // Set of 'ER' | 'General Ward' | 'OR' | 'ICU'
  const [showPressureLayer, setShowPressureLayer] = useState(true)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [customOverlays, setCustomOverlays] = useState(null)
  const [customImageDimensions, setCustomImageDimensions] = useState(null)
  const [manualDimensions, setManualDimensions] = useState(null) // { width, height } for calibration
  const importInputRef = useRef(null)
  const containerRef = useRef(null)
  const isDragging = useRef(false)
  const lastPan = useRef({ x: 0, y: 0 })

  const roomOverlays = customOverlays ?? ROOM_OVERLAY_COORDINATES

  // Bounding box of rooms matching unit filter (for zoom-to-fit)
  const unitFilterBbox = useMemo(() => {
    if (unitFilters.size === 0) return null
    const matching = roomOverlays.filter((r) => r.unit && unitFilters.has(r.unit))
    if (matching.length === 0) return null
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    matching.forEach((r) => {
      const w = r.width ?? 50
      const h = r.height ?? 50
      minX = Math.min(minX, r.x)
      minY = Math.min(minY, r.y)
      maxX = Math.max(maxX, r.x + w)
      maxY = Math.max(maxY, r.y + h)
    })
    const pad = 30
    return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad, w: maxX - minX + 2 * pad, h: maxY - minY + 2 * pad }
  }, [roomOverlays, unitFilters])

  // Zoom to fit selected unit's rooms when unit filter changes
  useEffect(() => {
    if (!unitFilterBbox) {
      setScale(1)
      setPan({ x: 0, y: 0 })
      return
    }
    const applyZoomToFit = () => {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const vw = rect.width
      const vh = rect.height
      if (vw <= 0 || vh <= 0) return
      const { minX, minY, w, h } = unitFilterBbox
      const cx = minX + w / 2
      const cy = minY + h / 2
      const mapW = manualDimensions?.width ?? customImageDimensions?.width ?? 1320
      const mapH = manualDimensions?.height ?? customImageDimensions?.height ?? 720
      const scaleX = mapW / w
      const scaleY = mapH / h
      const newScale = Math.min(3, Math.max(1, Math.max(scaleX, scaleY)))
      const contentScale = Math.min(vw / mapW, vh / mapH)
      const contentW = mapW * contentScale
      const contentH = mapH * contentScale
      const panX = -contentW * (cx / mapW - 0.5) * newScale
      const panY = -contentH * (cy / mapH - 0.5) * newScale
      setScale(newScale)
      setPan({ x: panX, y: panY })
    }
    const id = requestAnimationFrame(applyZoomToFit)
    return () => cancelAnimationFrame(id)
  }, [unitFilterBbox])

  const getFallbackRoomDataForOverlays = useCallback((overlays) => {
    const statuses = ['available', 'occupied', 'cleaning', 'reserved']
    return overlays.map((r, i) => {
      if ((INFRASTRUCTURE_ROOM_IDS.has(r.id) || NON_PATIENT_ROOM_TYPES.has(r.type) || isInfrastructureByLabel(r.label)) && r.id !== WAITING_ROOM_ID) {
        return { room: r.id, status: 'available', patient_name: null, doctor: null, admitted_at: null }
      }
      if (r.id === 'ROOM_006') {
        const iso = toAdmittedAtIso(DEMO_LOS.ROOM_006)
        const providerSeen = new Date(new Date(iso).getTime() + 28 * 60_000).toISOString()
        return { room: 'ROOM_006', status: 'occupied', patient_name: pickPatientForRoom('ROOM_006', 6), doctor: pickDoctorForRoom('ROOM_006', 6), admitted_at: new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), admitted_at_iso: iso, arrival_time: iso, provider_seen_time: providerSeen }
      }
      if (r.id === 'ROOM_009') {
        const iso = toAdmittedAtIso(DEMO_LOS.ROOM_009)
        const providerSeen = new Date(new Date(iso).getTime() + 35 * 60_000).toISOString()
        return { room: 'ROOM_009', status: 'occupied', patient_name: pickPatientForRoom('ROOM_009', 9), doctor: pickDoctorForRoom('ROOM_009', 9), admitted_at: new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), admitted_at_iso: iso, arrival_time: iso, provider_seen_time: providerSeen }
      }
      if (r.id === 'ROOM_010') {
        const iso = getAdmittedAtIsoForRoom('ROOM_010', 10)
        return { room: 'ROOM_010', status: 'occupied', patient_name: pickPatientForRoom('ROOM_010', 10), doctor: pickDoctorForRoom('ROOM_010', 10), admitted_at: new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), admitted_at_iso: iso, arrival_time: iso }
      }
      if (r.id === 'ROOM_027') {
        const iso = toAdmittedAtIso(DEMO_LOS.ROOM_027)
        return { room: 'ROOM_027', status: 'occupied', patient_name: pickPatientForRoom('ROOM_027', 27), doctor: pickDoctorForRoom('ROOM_027', 27), admitted_at: new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), admitted_at_iso: iso, arrival_time: iso }
      }
      if (r.id === 'ROOM_023') {
        const iso = toAdmittedAtIso(DEMO_LOS.ROOM_023)
        return { room: 'ROOM_023', status: 'occupied', patient_name: pickPatientForRoom('ROOM_023', 23), doctor: pickDoctorForRoom('ROOM_023', 23), admitted_at: new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), admitted_at_iso: iso, arrival_time: iso }
      }
      if (r.id === 'ROOM_038') {
        const iso = toAdmittedAtIso(DEMO_LOS.ROOM_038)
        return { room: 'ROOM_038', status: 'occupied', patient_name: pickPatientForRoom('ROOM_038', 38), doctor: pickDoctorForRoom('ROOM_038', 38), admitted_at: new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), admitted_at_iso: iso }
      }
      const status = r.id === WAITING_ROOM_ID ? 'available' : statuses[i % 4]
      const isOccupied = status === 'occupied'
      const isReserved = status === 'reserved'
      const iso = (isOccupied || isReserved) ? getAdmittedAtIsoForRoom(r.id, i) : null
      const isER = r.unit === 'ER'
      const d2pFields = iso && isOccupied && isER
        ? {
            arrival_time: iso,
            ...(i % 3 !== 1 && { provider_seen_time: new Date(new Date(iso).getTime() + (20 + (i % 15)) * 60_000).toISOString() }),
          }
        : {}
      const base = {
        room: r.id,
        status,
        patient_name: isOccupied ? pickPatientForRoom(r.id, i) : (isReserved ? 'Incoming' : null),
        doctor: isOccupied || isReserved ? pickDoctorForRoom(r.id, i) : null,
        admitted_at: iso ? new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : null,
        ...(iso && { admitted_at_iso: iso }),
        ...d2pFields,
      }
      return r.id === WAITING_ROOM_ID ? { ...base, waitingCount: 12 } : base
    })
  }, [])

  const fetchRoomStatus = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const { data } = await apiClient.get('/api/hospital/rooms/status', { timeout: 8000 })
      setRoomData(addMockPredictions(Array.isArray(data) ? data : []))
      setLastUpdated(new Date())
    } catch (err) {
      setRoomData(addMockPredictions(getFallbackRoomDataForOverlays(roomOverlays)))
      setLastUpdated(new Date())
    } finally {
      setLoading(false)
    }
  }, [roomOverlays, getFallbackRoomDataForOverlays])

  useEffect(() => {
    fetchRoomStatus()
    const interval = setInterval(fetchRoomStatus, 10000)
    return () => clearInterval(interval)
  }, [fetchRoomStatus])

  const roomStatusMap = useMemo(() => {
    const map = {}
    roomData.forEach((r) => { map[r.room] = r })
    return map
  }, [roomData])

  const roomIdToUnit = useMemo(
    () => new Map((roomOverlays || []).filter((r) => r.unit).map((r) => [r.id, r.unit])),
    [roomOverlays]
  )
  const metrics = useMemo(
    () => computeRoomMetrics(roomData, { unitFilters, roomIdToUnit }),
    [roomData, unitFilters, roomIdToUnit]
  )

  const activeRoomId = selectedRoom ?? hoveredRoom
  const hoveredRoomData = activeRoomId
    ? (roomStatusMap[activeRoomId] ?? { room: activeRoomId, status: '—', patient_name: null, doctor: null, admitted_at: null })
    : null

  const handleRoomHover = useCallback((roomId, entering, e) => {
    setHoveredRoom(entering ? roomId : null)
    if (entering && e) setTooltipPos({ x: e.clientX, y: e.clientY })
  }, [])

  const handleRoomClick = useCallback((roomId, e) => {
    setSelectedRoom(roomId)
    if (e) setTooltipPos({ x: e.clientX, y: e.clientY })
  }, [])

  const handleWheel = useCallback((e) => {
    if (!containerRef.current) return
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setScale((s) => Math.min(3, Math.max(0.5, s + delta)))
  }, [])

  const handleMouseDown = useCallback((e) => {
    if (e.button === 0 && !e.target.closest('[data-room-id]')) {
      isDragging.current = true
      lastPan.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
    }
  }, [pan])

  const handleMouseMove = useCallback((e) => {
    if (isDragging.current) {
      setPan({ x: e.clientX - lastPan.current.x, y: e.clientY - lastPan.current.y })
    } else if (hoveredRoom) {
      setTooltipPos({ x: e.clientX, y: e.clientY })
    }
  }, [hoveredRoom])

  const handleMouseUp = useCallback(() => {
    isDragging.current = false
  }, [])

  useEffect(() => {
    const c = containerRef.current
    if (!c) return
    c.addEventListener('wheel', handleWheel, { passive: false })
    return () => c.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }, [])

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const handleLoadFloorMapClick = () => importInputRef.current?.click()
  const handleLoadFloorMapFile = (e) => {
    const file = e.target?.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result)
        const rooms = json.rooms ?? json.map?.rooms ?? []
        if (Array.isArray(rooms) && rooms.length > 0) {
          setCustomOverlays(roomsToOverlays(rooms))
          // Use image dimensions from export so overlays align (coordinates are in that image's pixel space)
          const w = json.image_width ?? json.imageWidth
          const h = json.image_height ?? json.imageHeight
          setCustomImageDimensions(w && h ? { width: w, height: h } : null)
        } else {
          alert('No rooms found. Expected a FloorMap AI export with a "rooms" array.')
        }
      } catch (err) {
        alert('Invalid JSON: ' + (err.message || 'Could not parse file.'))
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white" data-testid="hospital-command-center">
      <div className="max-w-[1800px] mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center text-2xl border border-white/10">
              🏥
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Hospital Command Center
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Blueprint floor map
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/floormap-ai"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-sm font-semibold transition-colors"
            >
              <span>🗺️</span>
              FloorMap AI
            </Link>
            <button
              type="button"
              onClick={handleLoadFloorMapClick}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/20 bg-slate-800 hover:bg-slate-700 text-sm font-semibold transition-colors"
              title="Load a FloorMap AI export (JSON)"
            >
              <span>📂</span>
              Load Floor Map
            </button>
            <input ref={importInputRef} type="file" accept=".json,application/json" onChange={handleLoadFloorMapFile} className="hidden" />
            <Link
              to="/publish/link?template=hospital-bed"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              <span>📤</span>
              Add to Feed
            </Link>
            <button
              type="button"
              onClick={fetchRoomStatus}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <KpiPanels
              metrics={metrics}
              statusFilter={statusFilter}
              onFilterChange={setStatusFilter}
            />
            <div className="flex flex-wrap items-center gap-3 shrink-0 ml-auto">
              <LiveStatus lastUpdated={lastUpdated} className="px-3 py-2 rounded-lg border border-white/10 bg-slate-800/80" />
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-xs">Layer:</span>
                <button
                  type="button"
                  onClick={() => setShowPressureLayer((v) => !v)}
                  className={`px-2.5 py-1 rounded border transition-colors text-xs font-medium ${
                    showPressureLayer
                      ? 'border-amber-500/50 bg-amber-500/20 text-amber-300'
                      : 'border-white/10 bg-slate-800/60 text-slate-400 hover:bg-slate-700/80'
                  }`}
                  title={showPressureLayer ? 'Hide pressure overlay' : 'Show pressure overlay'}
                >
                  {showPressureLayer ? 'Pressure On' : 'Pressure Off'}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:border-l sm:border-white/20 sm:pl-3">
                <span className="text-slate-400 text-xs">Unit:</span>
              {[
                { value: 'ER', label: 'ER' },
                { value: 'General Ward', label: 'GW' },
                { value: 'OR', label: 'OR' },
                { value: 'ICU', label: 'ICU' },
              ].map(({ value, label }) => {
                const isActive = unitFilters.has(value)
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setUnitFilters((prev) => {
                        const next = new Set(prev)
                        if (next.has(value)) next.delete(value)
                        else next.add(value)
                        return next
                      })
                    }}
                    className={`px-2.5 py-1 rounded border transition-colors text-xs ${
                      isActive
                        ? 'border-white/40 bg-slate-700/90 text-white'
                        : 'border-white/10 bg-slate-800/60 text-slate-400 hover:bg-slate-700/80 hover:text-slate-300'
                    }`}
                    title={value === 'General Ward' ? 'General Ward' : undefined}
                  >
                    {label}
                  </button>
                )
              })}
              {unitFilters.size > 0 && (
                <button
                  type="button"
                  onClick={() => setUnitFilters(new Set())}
                  className="text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-700 text-xs"
                  title="Clear unit filter"
                >
                  ✕
                </button>
              )}
              </div>
            </div>
          </div>
          <p className="text-[10px] text-slate-500">
            Click a metric to filter map • Unit filters zoom to section
          </p>
        </div>

        {statusFilter && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">Filter:</span>
            <span className="px-3 py-1.5 rounded-lg bg-slate-700/90 border border-white/20 font-medium text-white capitalize">
              {statusFilter === 'predicted' ? 'Predicted available' : statusFilter === 'highPressure' ? 'High pressure' : statusFilter === 'critical' ? 'Critical' : statusFilter}
            </span>
            <button
              type="button"
              onClick={() => setStatusFilter(null)}
              className="text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-700"
              title="Clear filter"
            >
              ✕ Clear
            </button>
          </div>
        )}

        {customOverlays && (
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-200 flex flex-wrap items-center gap-4">
            <span>
              <strong>Floor map loaded.</strong> Overlays not aligning? Try re-exporting from FloorMap AI (new exports include image dimensions), or enter dimensions manually:
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Width"
                className="w-20 px-2 py-1 rounded bg-slate-800 border border-white/20 text-sm"
                min={100}
                max={5000}
                value={manualDimensions?.width ?? ''}
                onChange={(e) => {
                  const w = e.target.value ? Number(e.target.value) : null
                  setManualDimensions((prev) => (w != null ? { ...prev, width: w } : prev ? { ...prev, width: undefined } : null))
                }}
              />
              <span className="text-slate-400">×</span>
              <input
                type="number"
                placeholder="Height"
                className="w-20 px-2 py-1 rounded bg-slate-800 border border-white/20 text-sm"
                min={100}
                max={5000}
                value={manualDimensions?.height ?? ''}
                onChange={(e) => {
                  const h = e.target.value ? Number(e.target.value) : null
                  setManualDimensions((prev) => (h != null ? { ...prev, height: h } : prev ? { ...prev, height: undefined } : null))
                }}
              />
              <button
                type="button"
                onClick={() => setManualDimensions(null)}
                className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Blueprint image with Zoom/Pan */}
        <div
          ref={containerRef}
          className="relative rounded-2xl border border-white/10 overflow-hidden bg-slate-900 cursor-grab active:cursor-grabbing"
          style={{ minHeight: 500 }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={(e) => { if (!e.target.closest('[data-room-id]')) setSelectedRoom(null) }}
        >
          <div
            className="w-full flex items-stretch justify-center"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: 'center center',
              minHeight: 480,
              height: 'min(80vh, 800px)',
            }}
          >
            {error ? (
              <div className="text-center py-16 text-red-400">
                <p className="font-semibold">{error}</p>
                <button
                  type="button"
                  onClick={fetchRoomStatus}
                  className="mt-4 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600"
                >
                  Retry
                </button>
              </div>
            ) : loading && roomData.length === 0 ? (
              <div className="text-slate-400">Loading floor map…</div>
            ) : (
              <div className="w-full h-full min-h-[400px] flex items-center justify-center">
                <BlueprintImage
                  roomOverlays={roomOverlays}
                  roomStatusMap={roomStatusMap}
                  onRoomHover={handleRoomHover}
                  onRoomClick={handleRoomClick}
                  hoveredRoom={hoveredRoom}
                  statusFilter={statusFilter}
                  unitFilters={unitFilters}
                  imageDimensions={customImageDimensions}
                  manualDimensions={manualDimensions}
                  showPressureLayer={showPressureLayer}
                />
              </div>
            )}
          </div>
          {/* Zoom controls */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(3, s + 0.2))}
              className="w-10 h-10 rounded-lg bg-slate-800/90 border border-white/10 flex items-center justify-center text-lg hover:bg-slate-700"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
              className="w-10 h-10 rounded-lg bg-slate-800/90 border border-white/10 flex items-center justify-center text-lg hover:bg-slate-700"
            >
              −
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="w-10 h-10 rounded-lg bg-slate-800/90 border border-white/10 flex items-center justify-center text-sm hover:bg-slate-700"
              title={isFullscreen ? 'Exit full screen (Esc)' : 'Full screen'}
              aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
            >
              {isFullscreen ? '✕' : '⛶'}
            </button>
          </div>
          {hoveredRoomData && (
            <RoomTooltip roomData={hoveredRoomData} tooltipPos={tooltipPos} unit={activeRoomId ? roomIdToUnit.get(activeRoomId) : null} />
          )}
        </div>

        <div className="rounded-lg border border-white/10 bg-slate-800/40 px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-x-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</span>
            <div className="flex items-center gap-x-3">
              <span className="flex items-center gap-1.5 text-xs text-slate-400"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_FILL_COLORS.available }} />Avail</span>
              <span className="flex items-center gap-1.5 text-xs text-slate-400"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_FILL_COLORS.occupied }} />Occ</span>
              <span className="flex items-center gap-1.5 text-xs text-slate-400"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_FILL_COLORS.cleaning }} />Clean</span>
              <span className="flex items-center gap-1.5 text-xs text-slate-400"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_FILL_COLORS.reserved }} />Res</span>
              <span className="flex items-center gap-1.5 text-xs text-slate-400"><span className="w-2.5 h-2.5 rounded bg-emerald-500/80 shrink-0" />Pred</span>
            </div>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-x-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pressure</span>
            <div className="flex items-center gap-x-3">
              <span className="flex items-center gap-1.5 text-xs text-slate-400" title="LOS 60–179m"><span className="w-2.5 h-2.5 rounded border-2 border-amber-400 shrink-0 bg-transparent" />Warn</span>
              <span className="flex items-center gap-1.5 text-xs text-slate-400" title="LOS 180–299m"><span className="w-2.5 h-2.5 rounded border-2 border-orange-500 shrink-0 bg-transparent" />High</span>
              <span className="flex items-center gap-1.5 text-xs text-slate-400" title="LOS 300m+"><span className="w-2.5 h-2.5 rounded border-2 border-red-400 shrink-0 bg-transparent animate-pressure-pulse" />Crit</span>
            </div>
          </div>
          <span className="text-[10px] text-slate-500 ml-auto">Scroll zoom • Drag pan</span>
        </div>
      </div>
    </div>
  )
}

export default HospitalBedCommandCenter
