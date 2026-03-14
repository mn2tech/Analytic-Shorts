/**
 * Motel Command Center - Blueprint floor plan for motel operations.
 * Displays the motel blueprint with room status overlays.
 */
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ROOM_OVERLAY_COORDINATES,
  BLUEPRINT_OVERLAY_VIEWBOX,
  BLUEPRINT_DEFAULT_WIDTH,
  BLUEPRINT_DEFAULT_HEIGHT,
  STATUS_LABELS,
  STATUS_FILL_COLORS,
  INFRASTRUCTURE_ROOM_IDS,
  NON_GUEST_ROOM_TYPES,
  isInfrastructureByLabel,
  computeRoomMetrics,
  addMockPredictions,
  assignUnitFromPosition,
} from '../config/motelData'
import { getRoomDisplayLabel } from '../config/motelRoomDisplayLabels'
import { calculateLOS } from '../utils/losPressure'
import { roomStatusHistory, timelineTimes } from '../data/motelRoomStatusHistory'
import LiveStatus from '../components/LiveStatus'
import KpiGroupCard from '../components/KpiGroupCard'
import TimelinePlayback from '../components/TimelinePlayback'
import MotelOperationalAlerts from '../components/MotelOperationalAlerts'
import MotelRotatingMetricsPanel from '../components/MotelRotatingMetricsPanel'

const STATUS_SHORT = { available: 'Avail', occupied: 'Occ', dirty: 'Dirty', reserved: 'Res' }
const STATUS_COLORS = ['#2ECC71', '#E74C3C', '#F1C40F', '#3498DB']

const BLUEPRINT_PATHS = ['/motel-blueprint.png', '/images/motel-blueprint.png']

const MOCK_GUESTS = [
  'J. Smith', 'M. Johnson', 'R. Williams', 'A. Brown', 'K. Davis', 'T. Miller',
  'S. Wilson', 'L. Moore', 'P. Taylor', 'C. Anderson', 'J. Thomas', 'D. Jackson',
]

function pickGuestForRoom(roomId, i) {
  return MOCK_GUESTS[(roomId?.length || 0 + i) % MOCK_GUESTS.length]
}

function roomsToOverlays(rooms, imageHeight = 1024) {
  if (!Array.isArray(rooms)) return []
  const withUnits = assignUnitFromPosition(rooms, imageHeight)
  return withUnits.map((r) => ({
    id: r.room_id,
    x: r.bbox?.x ?? 0,
    y: r.bbox?.y ?? 0,
    width: r.bbox?.width ?? 50,
    height: r.bbox?.height ?? 50,
    unit: r.unit,
    type: r.type || null,
    label: r.label || getRoomDisplayLabel(r.room_id),
  }))
}

function formatAvgLOS(mins) {
  if (mins == null) return '—'
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}
function formatPredictionMins(mins) {
  if (mins >= 60) return `${Math.floor(mins / 60)}h`
  return `${mins}m`
}

function RoomTooltip({ roomData, tooltipPos, unit, roomOverlays = [] }) {
  if (!roomData) return null
  const statusLabel = STATUS_LABELS[roomData.status] || roomData.status
  const x = tooltipPos?.x ?? 0
  const y = tooltipPos?.y ?? 0
  const admitted = roomData.admitted_at_iso ?? roomData.patient?.admitted_at
  const los = calculateLOS(admitted)
  const losLabel = los?.losLabel ?? null
  const predMins = roomData.predictedInMinutes ?? roomData.predicted_in_minutes
  return (
    <div
      className="fixed z-50 pointer-events-none min-w-[200px] max-w-[280px] rounded-lg shadow-2xl overflow-hidden border border-white/20 bg-slate-900/95 backdrop-blur-sm text-white"
      style={{ left: x + 16, top: y - 8 }}
    >
      <div className="px-4 py-2.5 bg-slate-800/90 border-b border-white/10">
        <span className="font-bold text-sm">Room: {getRoomDisplayLabel(roomData.room, roomOverlays.find((o) => o.id === roomData.room))}</span>
        {unit && <span className="ml-2 text-xs text-slate-400">({unit})</span>}
      </div>
      <div className="p-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Guest</span>
          <span className="font-medium text-right">{roomData.guest_name || roomData.patient_name || '—'}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Status</span>
          <span className="font-semibold">{statusLabel}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Check-in</span>
          <span className="font-medium text-right">{roomData.check_in || roomData.admitted_at || '—'}</span>
        </div>
        {losLabel && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Stay</span>
            <span className="font-semibold text-cyan-400">{losLabel}</span>
          </div>
        )}
        {predMins != null && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Predicted Avail</span>
            <span className="font-semibold text-emerald-400">~{formatPredictionMins(predMins)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function BlueprintImage({
  roomOverlays,
  roomStatusMap,
  onRoomHover,
  onRoomClick,
  hoveredRoom,
  statusFilter,
  imageDimensions: jsonImageDimensions,
  manualDimensions,
  defaultDimensions,
}) {
  const [imageError, setImageError] = useState(false)
  const [pathIndex, setPathIndex] = useState(0)
  const [loadedDimensions, setLoadedDimensions] = useState(null)
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '') || ''
  const imageSrc = `${base}${BLUEPRINT_PATHS[pathIndex]}?v=1`

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

  // Use dimensions that match overlay coordinates. Prefer manual > custom JSON > default (never loaded - overlays in fixed coord space)
  const effectiveDimensions = manualDimensions ?? jsonImageDimensions ?? defaultDimensions ?? { width: BLUEPRINT_DEFAULT_WIDTH, height: BLUEPRINT_DEFAULT_HEIGHT }
  const viewBox = `0 0 ${effectiveDimensions.width} ${effectiveDimensions.height}`

  const aspectRatio = `${effectiveDimensions.width} / ${effectiveDimensions.height}`

  const hasOverlays = Array.isArray(roomOverlays) && roomOverlays.length > 0
  const isFiltered = !!statusFilter

  return (
    <div
      className="relative w-full h-full min-h-[400px] max-w-full select-none"
      style={{ aspectRatio }}
    >
      <div
        className="absolute inset-0 bg-no-repeat bg-center bg-contain"
        style={{
          backgroundImage: imageError ? 'none' : `url(${imageSrc})`,
          backgroundSize: 'contain',
          opacity: isFiltered ? 0.55 : 1,
          transition: 'opacity 0.25s ease',
        }}
      />
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
            const isInfrastructure =
              INFRASTRUCTURE_ROOM_IDS.has(r.id) ||
              NON_GUEST_ROOM_TYPES.has((r.type || '').toLowerCase()) ||
              isInfrastructureByLabel(r.label)
            const roomData = roomStatusMap[r.id]
            const status = roomData?.status ?? ['available', 'occupied', 'dirty', 'reserved'][idx % 4]
            const fill = isInfrastructure
              ? 'rgba(148, 163, 184, 0.2)'
              : STATUS_FILL_COLORS[status] || STATUS_COLORS[idx % 4]
            const dotFill = isInfrastructure
              ? null
              : STATUS_FILL_COLORS[status] || STATUS_COLORS[idx % 4]
            const statusLabel = STATUS_SHORT[status] || status || '—'
            const isHovered = hoveredRoom === r.id
            const roomH = r.height ?? 50
            const roomW = r.width ?? 50
            const showStatus = !isInfrastructure && roomH >= 28
            const predMins = roomData?.predictedInMinutes ?? roomData?.predicted_in_minutes
            const predText = predMins != null ? (predMins >= 60 ? `${Math.floor(predMins / 60)}h` : `${predMins}m`) : null
            const matchesStatus = isInfrastructure ? true : !statusFilter ? true : statusFilter === 'predicted' ? predMins != null : status === statusFilter
            const matchesFilter = matchesStatus
            const opacity = matchesFilter ? 1 : 0.06

            return (
              <g
                key={r.id}
                data-room-id={r.id}
                style={{ opacity, cursor: 'pointer', transition: 'opacity 0.25s ease' }}
                clipPath={!isInfrastructure ? `url(#clip-${r.id})` : undefined}
                onMouseEnter={(e) => onRoomHover?.(r.id, true, e)}
                onMouseLeave={(e) => onRoomHover?.(r.id, false, e)}
                onClick={(e) => {
                  e.stopPropagation()
                  onRoomClick?.(r.id, e)
                }}
              >
                {!isInfrastructure && (
                  <defs>
                    <clipPath id={`clip-${r.id}`}>
                      <rect x={r.x} y={r.y} width={r.width ?? 50} height={r.height ?? 50} />
                    </clipPath>
                  </defs>
                )}
                <rect
                  x={r.x}
                  y={r.y}
                  width={r.width ?? 50}
                  height={r.height ?? 50}
                  fill={fill}
                  fillOpacity={isInfrastructure ? 0.25 : 0.5}
                  stroke={isHovered ? '#fff' : isInfrastructure ? 'rgba(148,163,184,0.4)' : 'rgba(15,23,42,0.6)'}
                  strokeWidth={isHovered ? 2.5 : 1}
                  style={{ transition: 'fill 0.35s ease, stroke 0.2s ease' }}
                />
                {!isInfrastructure && (
                  <circle
                    cx={r.x + 8}
                    cy={r.y + 8}
                    r={5}
                    fill={dotFill || '#94A3B8'}
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
                  {getRoomDisplayLabel(r.id, r)}
                </text>
                {showStatus && (
                  <text
                    x={r.x + (r.width ?? 50) / 2}
                    y={r.y + (r.height ?? 50) / 2 + 6}
                    textAnchor="middle"
                    className="select-none pointer-events-none"
                    style={{ fontSize: roomH < 50 ? 7 : 8, fill: fill, fontWeight: 700 }}
                  >
                    {statusLabel}
                  </text>
                )}
                {!isInfrastructure && predText && roomH >= 50 && (
                  <text
                    x={r.x + (r.width ?? 50) / 2}
                    y={r.y + (r.height ?? 50) / 2 + (showStatus ? 14 : 8)}
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
            <p className="font-semibold mb-2">Motel blueprint not found</p>
            <p className="text-xs">
              Place your motel blueprint at <code className="bg-slate-700 px-1 rounded">public/motel-blueprint.png</code>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function KpiPanels({ metrics, statusFilter, onFilterChange }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
      <KpiGroupCard
        title="CAPACITY"
        metrics={[
          { label: 'Total Rooms', value: metrics.total },
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
          { label: 'Dirty', value: metrics.dirty, filterKey: 'dirty' },
          { label: 'Reserved', value: metrics.reserved, filterKey: 'reserved' },
          { label: 'Predicted Avail', value: metrics.predictedAvailable, filterKey: 'predicted' },
          { label: 'Avg Stay', value: formatAvgLOS(metrics.avgLOS) },
        ]}
        onMetricClick={onFilterChange}
        activeFilter={statusFilter}
      />
    </div>
  )
}

function MotelCommandCenter() {
  const [roomData, setRoomData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(() => new Date())
  const [hoveredRoom, setHoveredRoom] = useState(null)
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [statusFilter, setStatusFilter] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  // Load persisted floor map data from localStorage
  const [customOverlays, setCustomOverlays] = useState(() => {
    try {
      const saved = localStorage.getItem('motel-floormap-overlays')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [customImageDimensions, setCustomImageDimensions] = useState(() => {
    try {
      const saved = localStorage.getItem('motel-floormap-dimensions')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [manualDimensions, setManualDimensions] = useState(() => {
    try {
      const saved = localStorage.getItem('motel-floormap-manual-dimensions')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [hideAlignmentMessage, setHideAlignmentMessage] = useState(() => {
    try {
      return localStorage.getItem('motel-floormap-hide-alignment') === 'true'
    } catch {
      return false
    }
  })
  const [roomSearch, setRoomSearch] = useState('')
  const [selectedTime, setSelectedTime] = useState(null)
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false)
  const [commandCenterMode, setCommandCenterMode] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [liveTime, setLiveTime] = useState(() => new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false }))
  const importInputRef = useRef(null)
  const containerRef = useRef(null)
  const fullscreenRef = useRef(null)
  const isDragging = useRef(false)
  const lastPan = useRef({ x: 0, y: 0 })

  const roomOverlays = useMemo(() => customOverlays ?? ROOM_OVERLAY_COORDINATES, [customOverlays])

  const mapDimensions = useMemo(
    () => ({
      width: manualDimensions?.width ?? customImageDimensions?.width ?? BLUEPRINT_DEFAULT_WIDTH,
      height: manualDimensions?.height ?? customImageDimensions?.height ?? BLUEPRINT_DEFAULT_HEIGHT,
    }),
    [manualDimensions, customImageDimensions]
  )

  // Fit to viewport function - fills entire window without padding
  const fitToViewport = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const vw = rect.width
    const vh = rect.height
    if (vw <= 0 || vh <= 0) return
    const { width: mapW, height: mapH } = mapDimensions
    
    // Calculate scale to fill the entire viewport (no padding)
    const scaleX = vw / mapW
    const scaleY = vh / mapH
    const newScale = Math.min(scaleX, scaleY) // Use the smaller scale to fit entirely
    
    // With transform-origin: center center, pan of (0,0) centers the content
    setScale(newScale)
    setPan({ x: 0, y: 0 })
  }, [mapDimensions])

  // Initial fit-to-viewport and when container resizes
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const applyFit = () => {
      fitToViewport()
    }
    // Delay initial fit to ensure container is fully rendered
    const timeoutId = setTimeout(() => {
      requestAnimationFrame(applyFit)
    }, 100)
    const ro = new ResizeObserver(applyFit)
    ro.observe(el)
    return () => {
      clearTimeout(timeoutId)
      ro.disconnect()
    }
  }, [mapDimensions, fitToViewport])

  // Fit to viewport when command center mode is enabled or component mounts
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fitToViewport()
    }, 200) // Increased delay to ensure layout is complete
    return () => clearTimeout(timeoutId)
  }, [commandCenterMode, fitToViewport, roomOverlays])

  const zoomToRoom = useCallback(
    (roomId) => {
      const room = roomOverlays.find((r) => r.id === roomId)
      if (!room) return
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const vw = rect.width
      const vh = rect.height
      if (vw <= 0 || vh <= 0) return
      const mapW = mapDimensions.width
      const mapH = mapDimensions.height
      const w = room.width ?? 50
      const h = room.height ?? 50
      const cx = room.x + w / 2
      const cy = room.y + h / 2
      const pad = 80
      const newScale = Math.min(3, Math.max(1.2, Math.min(vw / (w + pad), vh / (h + pad))))
      const contentScale = Math.min(vw / mapW, vh / mapH)
      const contentW = mapW * contentScale
      const contentH = mapH * contentScale
      setScale(newScale)
      setPan({
        x: -contentW * (cx / mapW - 0.5) * newScale,
        y: -contentH * (cy / mapH - 0.5) * newScale,
      })
      setSelectedRoom(roomId)
    },
    [roomOverlays, mapDimensions]
  )

  const roomSearchMatches = useMemo(() => {
    const q = roomSearch.trim()
    if (!q) return []
    const qLower = q.toLowerCase()
    return roomOverlays.filter((r) => {
      if (r.id.toLowerCase().includes(qLower)) return true
      const displayLabel = getRoomDisplayLabel(r.id, r)
      if (displayLabel.toLowerCase().includes(qLower)) return true
      return false
    })
  }, [roomOverlays, roomSearch])

  const handleRoomSearch = useCallback(() => {
    if (roomSearchMatches.length >= 1) zoomToRoom(roomSearchMatches[0].id)
    setRoomSearch('')
  }, [roomSearchMatches, zoomToRoom])

  function getFallbackRoomData(overlays) {
    const statuses = ['available', 'occupied', 'dirty', 'reserved']
    return overlays.map((r, i) => {
      if (INFRASTRUCTURE_ROOM_IDS.has(r.id) || NON_GUEST_ROOM_TYPES.has((r.type || '').toLowerCase()) || isInfrastructureByLabel(r.label)) {
        return { room: r.id, status: 'available', guest_name: null, check_in: null }
      }
      const status = statuses[i % 4]
      const isOccupied = status === 'occupied'
      const isReserved = status === 'reserved'
      const daysAgo = i % 3
      const checkInDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
      const checkIn = isOccupied || isReserved ? checkInDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : null
      const admitted_at_iso = isOccupied || isReserved ? checkInDate.toISOString() : null
      return {
        room: r.id,
        status,
        guest_name: isOccupied ? pickGuestForRoom(r.id, i) : isReserved ? 'Incoming' : null,
        check_in: checkIn,
        admitted_at_iso,
      }
    })
  }

  const fetchRoomStatus = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      let rooms = getFallbackRoomData(roomOverlays)
      try {
        const res = await fetch('/api/motel/rooms/status')
        if (res.ok) {
          const json = await res.json()
          const data = json?.data ?? json
          if (Array.isArray(data) && data.length > 0) rooms = data
        }
      } catch (_) {
        // Use fallback when API unavailable
      }
      setRoomData(addMockPredictions(Array.isArray(rooms) ? rooms : []))
      setLastUpdated(new Date())
    } catch {
      setRoomData(addMockPredictions(getFallbackRoomData(roomOverlays)))
      setLastUpdated(new Date())
    } finally {
      setLoading(false)
    }
  }, [roomOverlays])

  useEffect(() => {
    fetchRoomStatus()
    const interval = setInterval(fetchRoomStatus, 15000)
    return () => clearInterval(interval)
  }, [fetchRoomStatus])

  const roomStatusMap = useMemo(() => {
    const map = {}
    roomData.forEach((r) => { map[r.room] = r })
    return map
  }, [roomData])

  const roomStatusMapWithTimeline = useMemo(() => {
    const time = selectedTime ?? timelineTimes[0]
    const merged = { ...roomStatusMap }
    if (selectedTime) {
      const snapshot = roomStatusHistory.find((s) => s.time === selectedTime)
      if (snapshot?.rooms) {
        Object.entries(snapshot.rooms).forEach(([roomId, status]) => {
          merged[roomId] = { ...(merged[roomId] || { room: roomId }), status }
        })
      }
    }
    return merged
  }, [roomStatusMap, selectedTime])

  const roomsForMetrics = useMemo(() => {
    if (!selectedTime) return roomData
    return roomData.map((r) => ({
      ...r,
      status: roomStatusMapWithTimeline[r.room]?.status ?? r.status,
    }))
  }, [roomData, selectedTime, roomStatusMapWithTimeline])

  const roomIdToUnit = useMemo(
    () => new Map((roomOverlays || []).filter((r) => r.unit).map((r) => [r.id, r.unit])),
    [roomOverlays]
  )

  const metrics = useMemo(
    () => computeRoomMetrics(roomsForMetrics, { roomIdToUnit }),
    [roomsForMetrics, roomIdToUnit]
  )

  const displayTime = selectedTime ?? timelineTimes[0]
  const activeRoomId = selectedRoom ?? hoveredRoom
  const hoveredRoomData = activeRoomId
    ? (roomStatusMapWithTimeline[activeRoomId] ?? { room: activeRoomId, status: '—', guest_name: null, check_in: null })
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

  useEffect(() => {
    const t = setInterval(() => setLiveTime(new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (commandCenterMode) {
      setSelectedTime(timelineTimes[0])
      setIsTimelinePlaying(true)
      setStatusFilter(null)
    } else setIsTimelinePlaying(false)
  }, [commandCenterMode])

  const toggleFullscreenMap = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {})
    } else {
      const el = containerRef.current
      if (el) el.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {})
    }
  }, [])

  const toggleFullscreenPanel = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {})
    } else {
      const el = fullscreenRef.current
      if (el) el.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {})
    }
  }, [])
  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  // Persist custom overlays to localStorage
  useEffect(() => {
    if (customOverlays) {
      try {
        localStorage.setItem('motel-floormap-overlays', JSON.stringify(customOverlays))
      } catch (err) {
        console.warn('Failed to save overlays to localStorage:', err)
      }
    } else {
      localStorage.removeItem('motel-floormap-overlays')
    }
  }, [customOverlays])

  // Persist image dimensions to localStorage
  useEffect(() => {
    if (customImageDimensions) {
      try {
        localStorage.setItem('motel-floormap-dimensions', JSON.stringify(customImageDimensions))
      } catch (err) {
        console.warn('Failed to save dimensions to localStorage:', err)
      }
    } else {
      localStorage.removeItem('motel-floormap-dimensions')
    }
  }, [customImageDimensions])

  // Persist manual dimensions to localStorage
  useEffect(() => {
    if (manualDimensions) {
      try {
        localStorage.setItem('motel-floormap-manual-dimensions', JSON.stringify(manualDimensions))
      } catch (err) {
        console.warn('Failed to save manual dimensions to localStorage:', err)
      }
    } else {
      localStorage.removeItem('motel-floormap-manual-dimensions')
    }
  }, [manualDimensions])

  // Persist hide alignment message preference
  useEffect(() => {
    try {
      if (hideAlignmentMessage) {
        localStorage.setItem('motel-floormap-hide-alignment', 'true')
      } else {
        localStorage.removeItem('motel-floormap-hide-alignment')
      }
    } catch (err) {
      console.warn('Failed to save alignment message preference:', err)
    }
  }, [hideAlignmentMessage])

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
          const imgH = json.image_height ?? json.imageHeight ?? 1024
          setCustomOverlays(roomsToOverlays(rooms, imgH))
          const w = json.image_width ?? json.imageWidth
          const h = imgH
          setCustomImageDimensions(w && h ? { width: w, height: h } : null)
        } else {
          alert('No rooms found. Expected a FloorMap export with a "rooms" array.')
        }
      } catch (err) {
        alert('Invalid JSON: ' + (err.message || 'Could not parse file.'))
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className={`bg-slate-900 text-white flex flex-col flex-1 min-h-0 overflow-hidden`} data-testid="motel-command-center">
      <div
        ref={fullscreenRef}
        className={`w-full flex flex-col flex-1 min-h-0 overflow-hidden ${commandCenterMode && !isFullscreen ? 'px-3 pt-1 gap-1' : 'px-4 py-4 gap-4'} ${isFullscreen ? 'h-screen min-h-0 bg-slate-900 px-3 py-3 gap-3' : ''}`}
      >
        {commandCenterMode ? (
          <div className="flex items-center justify-between gap-4 shrink-0 py-1 px-1">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setCommandCenterMode(false)} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors bg-slate-700/60 text-slate-400 hover:bg-slate-700 hover:text-white">Normal Mode</button>
              <button type="button" onClick={() => setCommandCenterMode(true)} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors bg-teal-600 text-white">Command Center Mode</button>
              {isFullscreen ? (
                <button type="button" onClick={() => document.exitFullscreen?.().then(() => setIsFullscreen(false))} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-700/80 hover:bg-slate-600 text-white border border-white/20">✕ Exit</button>
              ) : (
                <>
                  <button type="button" onClick={toggleFullscreenMap} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-700/80 hover:bg-slate-600 text-white border border-white/20" title="Full screen map only">⛶ Map</button>
                  <button type="button" onClick={toggleFullscreenPanel} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-700/80 hover:bg-slate-600 text-white border border-white/20" title="Full screen panel">⛶ Panel</button>
                </>
              )}
            </div>
            <MotelRotatingMetricsPanel selectedTime={displayTime} metrics={metrics} />
          </div>
        ) : (
        <div className="flex items-center justify-center gap-2 shrink-0">
          <button type="button" onClick={() => setCommandCenterMode(false)} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors bg-teal-600 text-white">Normal Mode</button>
          <button type="button" onClick={() => setCommandCenterMode(true)} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors bg-slate-700/60 text-slate-400 hover:bg-slate-700 hover:text-white">Command Center Mode</button>
        </div>
        )}

        {!commandCenterMode && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center text-2xl border border-white/10">🏨</div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Motel Command Center</h1>
              <p className="text-sm text-slate-400 mt-0.5">Operations floor map</p>
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
            <button type="button" onClick={fetchRoomStatus} disabled={loading} className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-sm font-semibold transition-colors disabled:opacity-50">{loading ? 'Refreshing…' : 'Refresh'}</button>
            <LiveStatus lastUpdated={lastUpdated} className="px-3 py-2 rounded-lg border border-white/10 bg-slate-800/80" />
            {isFullscreen ? (
              <button type="button" onClick={() => document.exitFullscreen?.().then(() => setIsFullscreen(false))} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/20 bg-slate-800 hover:bg-slate-700 text-sm font-semibold">✕ Exit full screen</button>
            ) : (
              <>
                <button type="button" onClick={toggleFullscreenMap} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/20 bg-slate-800 hover:bg-slate-700 text-sm font-semibold" title="Full screen map only">⛶ Map</button>
                <button type="button" onClick={toggleFullscreenPanel} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/20 bg-slate-800 hover:bg-slate-700 text-sm font-semibold" title="Full screen entire panel">⛶ Panel</button>
              </>
            )}
          </div>
        </div>
        )}

        {!commandCenterMode && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <KpiPanels metrics={metrics} statusFilter={statusFilter} onFilterChange={setStatusFilter} />
            <div className="flex flex-wrap items-center gap-3 shrink-0 ml-auto">
              <div className="flex items-center gap-2 sm:border-r sm:border-white/20 sm:pr-3">
                <div className="relative">
                  <input
                    type="text"
                    value={roomSearch}
                    onChange={(e) => setRoomSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRoomSearch()}
                    placeholder="Search room (e.g. 201, 203)"
                    className="w-36 sm:w-44 px-2.5 py-1.5 pl-8 rounded border border-white/20 bg-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500/50"
                    aria-label="Search room"
                  />
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs" aria-hidden="true">🔍</span>
                </div>
                <button
                  type="button"
                  onClick={handleRoomSearch}
                  disabled={roomSearchMatches.length === 0}
                  className="px-2.5 py-1.5 rounded border border-white/20 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
                >
                  Go
                </button>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-slate-500">Click a metric to filter map</p>
        </div>
        )}

        {!commandCenterMode && statusFilter && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">Filter:</span>
            <span className="px-3 py-1.5 rounded-lg bg-slate-700/90 border border-white/20 font-medium text-white capitalize">{statusFilter === 'predicted' ? 'Predicted available' : statusFilter}</span>
            <button type="button" onClick={() => setStatusFilter(null)} className="text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-700" title="Clear filter">✕ Clear</button>
          </div>
        )}

        {!commandCenterMode && customOverlays && !hideAlignmentMessage && !customImageDimensions && !manualDimensions && (
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-200 flex flex-wrap items-center gap-4">
            <span><strong>Floor map loaded.</strong> Enter manual dimensions if overlays don&apos;t align:</span>
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
              <button type="button" onClick={() => setManualDimensions(null)} className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600">Reset</button>
              <button
                type="button"
                onClick={() => setHideAlignmentMessage(true)}
                className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600"
                title="Hide this message"
              >
                ✕ Hide
              </button>
            </div>
          </div>
        )}

        <div className={`flex flex-col flex-1 min-h-0 w-full ${commandCenterMode ? 'lg:flex-row gap-3 lg:gap-4' : 'lg:flex-row gap-4'}`}>
        <div
          ref={containerRef}
          className={`relative rounded-xl border border-white/10 overflow-hidden bg-slate-900 flex-1 min-w-0 min-h-[400px] flex flex-col ${commandCenterMode ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
          onMouseDown={commandCenterMode ? undefined : handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={commandCenterMode ? undefined : (e) => { if (!e.target.closest('[data-room-id]')) setSelectedRoom(null) }}
        >
          {selectedTime && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-lg bg-slate-800/95 border border-white/20 text-sm font-medium shadow-lg">
              Motel Status at: <span className="text-teal-400">{selectedTime}</span>
            </div>
          )}
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: 'center center',
              minHeight: 400,
            }}
          >
            {error ? (
              <div className="text-center py-16 text-red-400">
                <p className="font-semibold">{error}</p>
                <button type="button" onClick={fetchRoomStatus} className="mt-4 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600">Retry</button>
              </div>
            ) : loading && roomData.length === 0 ? (
              <div className="text-slate-400">Loading floor map…</div>
            ) : (
              <div className="w-full h-full min-h-0 flex items-center justify-center">
                <BlueprintImage
                  roomOverlays={roomOverlays}
                  roomStatusMap={roomStatusMapWithTimeline}
                  onRoomHover={handleRoomHover}
                  onRoomClick={commandCenterMode ? undefined : handleRoomClick}
                  hoveredRoom={hoveredRoom}
                  statusFilter={statusFilter}
                  imageDimensions={customImageDimensions}
                  manualDimensions={manualDimensions}
                  defaultDimensions={{ width: BLUEPRINT_DEFAULT_WIDTH, height: BLUEPRINT_DEFAULT_HEIGHT }}
                />
              </div>
            )}
          </div>
          {!commandCenterMode && (
          <div className="absolute bottom-4 right-4 flex flex-col gap-1">
            <button type="button" onClick={() => setScale((s) => Math.min(3, s + 0.2))} className="w-10 h-10 rounded-lg bg-slate-800/90 border border-white/10 flex items-center justify-center text-lg hover:bg-slate-700">+</button>
            <button type="button" onClick={() => setScale((s) => Math.max(0.5, s - 0.2))} className="w-10 h-10 rounded-lg bg-slate-800/90 border border-white/10 flex items-center justify-center text-lg hover:bg-slate-700">−</button>
            <button type="button" onClick={toggleFullscreenMap} className="w-10 h-10 rounded-lg bg-slate-800/90 border border-white/10 flex items-center justify-center text-sm hover:bg-slate-700" title={isFullscreen ? 'Exit full screen (Esc)' : 'Full screen map'}>
              {isFullscreen ? '✕' : '⛶'}
            </button>
          </div>
          )}
          {hoveredRoomData && !commandCenterMode && (
            <RoomTooltip
              roomData={hoveredRoomData}
              tooltipPos={tooltipPos}
              unit={activeRoomId ? roomIdToUnit.get(activeRoomId) : null}
              roomOverlays={roomOverlays}
            />
          )}
        </div>

        <div className={`flex flex-col gap-3 shrink-0 order-first lg:order-last ${commandCenterMode ? 'w-full lg:w-56 min-w-0' : 'w-full lg:w-72'}`}>
          <MotelOperationalAlerts selectedTime={displayTime} roomOverlays={roomOverlays} roomStatusMap={roomStatusMapWithTimeline} roomIdToUnit={roomIdToUnit} highlightAlerts={commandCenterMode} />
        </div>
        </div>

        <div className={`shrink-0 ${commandCenterMode ? 'py-1' : 'space-y-2'}`}>
          <TimelinePlayback
            times={timelineTimes}
            selectedTime={selectedTime ?? timelineTimes[0]}
            onTimeChange={setSelectedTime}
            isPlaying={isTimelinePlaying}
            onPlayPause={() => { if (!selectedTime) setSelectedTime(timelineTimes[0]); setIsTimelinePlaying((p) => !p) }}
            onBackToLive={() => { setSelectedTime(null); setIsTimelinePlaying(false) }}
            isLive={!selectedTime}
            compact={commandCenterMode}
            playbackIntervalMs={commandCenterMode ? 5000 : 2000}
          />
          {!commandCenterMode && (
          <div className="flex flex-wrap items-center gap-4">
            <button type="button" onClick={() => { setSelectedTime(null); setIsTimelinePlaying(false) }} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${!selectedTime ? 'bg-emerald-600/80 text-white' : 'bg-slate-700/60 text-slate-400 hover:bg-slate-600 hover:text-white'}`} title={!selectedTime ? 'Viewing live data' : 'Click to switch to live'}>Live{!selectedTime ? ` ${liveTime}` : ''}</button>
          </div>
          )}
        </div>

        {!commandCenterMode && (
        <div className="rounded-lg border border-white/10 bg-slate-800/40 px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-x-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</span>
            <div className="flex items-center gap-x-3">
              <span className="flex items-center gap-1.5 text-xs text-slate-400"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_FILL_COLORS.available }} />Avail</span>
              <span className="flex items-center gap-1.5 text-xs text-slate-400"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_FILL_COLORS.occupied }} />Occ</span>
              <span className="flex items-center gap-1.5 text-xs text-slate-400"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_FILL_COLORS.dirty }} />Dirty</span>
              <span className="flex items-center gap-1.5 text-xs text-slate-400"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_FILL_COLORS.reserved }} />Res</span>
              <span className="flex items-center gap-1.5 text-xs text-slate-400"><span className="w-2.5 h-2.5 rounded bg-emerald-500/80 shrink-0" />Pred</span>
            </div>
          </div>
          <span className="text-[10px] text-slate-500 ml-auto">Scroll zoom • Drag pan</span>
        </div>
        )}
      </div>
    </div>
  )
}

export default MotelCommandCenter
