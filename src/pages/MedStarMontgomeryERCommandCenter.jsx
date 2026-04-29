import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MEDSTAR_MONTGOMERY_ER_LAYOUT } from '../data/medstarMontgomeryErLayout'

const facilityConfig = {
  name: 'MedStar Montgomery ER',
  type: 'Emergency Department',
  mode: 'Command Center',
}

const OPERATIONAL_ZONES = [
  { id: 'TRIAGE', name: 'Triage Area' },
  { id: 'FAST_TRACK', name: 'Fast Track (F1-F5)' },
  { id: 'MAIN_ER', name: 'Main ER Rooms' },
  { id: 'IMAGING', name: 'Imaging / XRay' },
  { id: 'EMS', name: 'EMS Entrance' },
  { id: 'SUPPORT', name: 'Support / Nursing' },
]

const OCCUPANCY_TIMELINE = [
  { time: '08:00', occupancy: { ER: 40, WAITING: 5 } },
  { time: '12:00', occupancy: { ER: 85, WAITING: 10 } },
  { time: '14:00', occupancy: { ER: 95, WAITING: 12 } },
]

const OPERATIONAL_ALERTS = [
  { id: 'A1', type: 'critical', message: 'ER Capacity Critical', value: '92%', time: '14:02' },
  { id: 'A2', type: 'warning', message: 'Waiting Room Congestion', value: '8 patients', time: '14:01' },
  { id: 'A3', type: 'warning', message: 'Patient Waiting > 60 min', patient_id: 'P032', time: '14:00' },
]

const STATUS_COLORS = {
  available: 'bg-emerald-400/80 border-emerald-50 shadow-[0_0_24px_rgba(52,211,153,0.85)] ring-1 ring-inset ring-white/25',
  occupied: 'bg-rose-500/85 border-rose-100 shadow-[0_0_24px_rgba(244,63,94,0.85)] ring-1 ring-inset ring-white/20',
  reserved: 'bg-sky-400/80 border-sky-50 shadow-[0_0_24px_rgba(56,189,248,0.85)] ring-1 ring-inset ring-white/25',
  dirty: 'bg-amber-300/85 border-amber-50 shadow-[0_0_24px_rgba(251,191,36,0.9)] ring-1 ring-inset ring-white/25',
}

const STATUS_LABELS = {
  available: 'Available',
  occupied: 'Occupied',
  reserved: 'Reserved',
  dirty: 'Dirty',
}

const STATUS_SEQUENCE = ['available', 'occupied', 'reserved', 'dirty']

const SYNTHETIC_OCCUPIED_ROOM_IDS = new Set([
  'F5',
  'F3',
  'F1',
  'Room 8',
  'Room 11',
  'Room 13',
  'Room 18',
  'Room 21',
  'Room 23',
  'Room 28',
  'Room 31',
  'Room 33',
  'MDPA',
  'Triage 2',
])

const SYNTHETIC_DIRTY_ROOM_IDS = new Set([
  'Room 6',
  'Room 12',
  'Room 15',
  'Room 17',
  'Room 38',
  'Room 40',
])

const SYNTHETIC_RESERVED_ROOM_IDS = new Set([
  'Room 7',
  'Room 22',
  'Room 24',
  'Room 29',
])

const SYNTHETIC_DOCTORS = ['Dr. Nguyen', 'Dr. Patel', 'Dr. Carter', 'Dr. Rivera', 'Dr. Brooks', 'Dr. Ahmed']

const ER_STATUS_BY_ROOM_STATUS = {
  available: ['Ready for patient', 'Terminal clean complete', 'Open bed'],
  occupied: ['Waiting Provider', 'Awaiting Results', 'Consult Pending', 'Disposition Pending', 'Boarding Hold'],
  reserved: ['Reserved for inbound', 'Transfer pending', 'Assigned next patient'],
  dirty: ['EVS Dispatched', 'Cleaning in progress', 'Needs turnover'],
}

const SAVED_MAP_STORAGE_KEY = 'medstar-montgomery-er-command-center.saved-map'

function MedStarLogo() {
  const [logoMissing, setLogoMissing] = useState(false)

  if (logoMissing) {
    return (
      <div className="mr-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-[#1e3a5f] bg-[#0b1728] text-xs font-black text-cyan-200">
        MS
      </div>
    )
  }

  return (
    <img
      src="/assets/medstar-logo.png"
      alt="MedStar"
      className="mr-3 h-8 w-auto flex-shrink-0"
      onError={() => setLogoMissing(true)}
    />
  )
}

export default function MedStarMontgomeryERCommandCenter() {
  const importInputRef = useRef(null)
  const imageInputRef = useRef(null)
  const mapRef = useRef(null)
  const panelRef = useRef(null)
  const [lastUpdated, setLastUpdated] = useState(() => new Date())
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const [imagePath, setImagePath] = useState('/medstar-montgomery-er.png')
  const [uploadedImageDataUrl, setUploadedImageDataUrl] = useState(null)
  const [selectedRoomId, setSelectedRoomId] = useState(null)
  const [layout, setLayout] = useState(MEDSTAR_MONTGOMERY_ER_LAYOUT)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [hoveredRoom, setHoveredRoom] = useState(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [statusFilter, setStatusFilter] = useState(null)
  const [mapScale, setMapScale] = useState(1)
  const [roomStatuses, setRoomStatuses] = useState(() => buildSyntheticRoomStatuses(MEDSTAR_MONTGOMERY_ER_LAYOUT.rooms))

  const roomCount = layout.rooms.length
  const metrics = useMemo(() => {
    const next = layout.rooms.reduce(
      (acc, room) => {
        const status = roomStatuses[room.room_id] || 'available'
        const details = buildSyntheticRoomDetails(room, acc.total, status)
        acc.total += 1
        if (status === 'available') acc.available += 1
        if (status === 'occupied') acc.occupied += 1
        if (status === 'reserved') acc.reserved += 1
        if (status === 'dirty') acc.dirty += 1
        if (details.erStatus === 'Waiting Provider') acc.waitingProvider += 1
        if (details.pressure === 'High') acc.highPressure += 1
        if (status === 'occupied') {
          acc.losTotalMinutes += parseLosMinutes(details.los)
          acc.losCount += 1
        }
        return acc
      },
      { total: 0, available: 0, occupied: 0, reserved: 0, dirty: 0, waitingProvider: 0, highPressure: 0, losTotalMinutes: 0, losCount: 0 }
    )
    next.utilizationPct = next.total ? Math.round((next.occupied / next.total) * 100) : 0
    next.avgLos = next.losCount ? formatDuration(Math.round(next.losTotalMinutes / next.losCount)) : '0h 00m'
    return next
  }, [layout.rooms, roomStatuses])

  const selectedRoom = useMemo(
    () => layout.rooms.find((room) => room.room_id === selectedRoomId) || null,
    [layout.rooms, selectedRoomId]
  )

  const selectedRoomStatus = selectedRoom ? roomStatuses[selectedRoom.room_id] || 'available' : null
  const selectedRoomDetails = selectedRoom
    ? buildSyntheticRoomDetails(selectedRoom, layout.rooms.indexOf(selectedRoom), selectedRoomStatus)
    : null

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVED_MAP_STORAGE_KEY)
      if (!saved) return

      const parsed = JSON.parse(saved)
      if (parsed.imageDataUrl) {
        setUploadedImageDataUrl(parsed.imageDataUrl)
        setImagePath(parsed.imageDataUrl)
      }
      if (parsed.layout?.rooms?.length) {
        setLayout(parsed.layout)
        resetRoomStatuses(parsed.layout.rooms)
      }
      setLastUpdated(parsed.savedAt ? new Date(parsed.savedAt) : new Date())
    } catch (error) {
      console.warn('Unable to restore saved MedStar ER map', error)
    }
  }, [])

  const onRoomClick = (roomId) => {
    setSelectedRoomId(roomId)
  }

  const updateTooltipPosition = (event) => {
    setTooltipPosition({
      x: Math.min(event.clientX + 18, window.innerWidth - 270),
      y: Math.min(event.clientY + 18, window.innerHeight - 340),
    })
  }

  const resetRoomStatuses = (rooms = layout.rooms) => {
    setRoomStatuses(buildSyntheticRoomStatuses(rooms))
    setSelectedRoomId(null)
    setStatusFilter(null)
    setLastUpdated(new Date())
  }

  const handleRefresh = () => {
    resetRoomStatuses()
  }

  const handleLoadFloorMapClick = () => importInputRef.current?.click()

  const handleUploadImageClick = () => imageInputRef.current?.click()

  const handleUploadImageFile = (event) => {
    const file = event.target?.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please choose a valid image file.')
      event.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result || '')
      setUploadedImageDataUrl(dataUrl)
      setImagePath(dataUrl || URL.createObjectURL(file))
      setLastUpdated(new Date())
      event.target.value = ''
    }
    reader.readAsDataURL(file)
  }

  const handleLoadFloorMapFile = (event) => {
    const file = event.target?.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'))
        const nextRooms = normalizeImportedRooms(parsed)
        if (!nextRooms.length) {
          alert('No rooms found. Expected a FloorMap AI export with a "rooms" array.')
          return
        }

        const nextLayout = {
          ...layout,
          image_width: parsed.image_width || parsed.imageWidth || parsed.width || layout.image_width,
          image_height: parsed.image_height || parsed.imageHeight || parsed.height || layout.image_height,
          rooms: nextRooms,
        }

        setLayout(nextLayout)
        resetRoomStatuses(nextRooms)
        setLastUpdated(new Date())
      } catch (error) {
        console.error('Unable to load FloorMap AI export', error)
        alert('Unable to load that FloorMap AI export. Please choose a valid JSON file.')
      } finally {
        event.target.value = ''
      }
    }
    reader.readAsText(file)
  }

  const toggleFullscreen = (targetRef) => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {})
      return
    }

    targetRef.current?.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {})
  }

  const handleSaveMap = () => {
    try {
      localStorage.setItem(
        SAVED_MAP_STORAGE_KEY,
        JSON.stringify({
          imageDataUrl: uploadedImageDataUrl,
          layout,
          savedAt: new Date().toISOString(),
        })
      )
      setLastUpdated(new Date())
      alert('Map saved in this browser. It will stay after refresh.')
    } catch (error) {
      console.error('Unable to save MedStar ER map', error)
      alert('Unable to save this map. The image may be too large for browser storage.')
    }
  }

  const handleResetSavedMap = () => {
    localStorage.removeItem(SAVED_MAP_STORAGE_KEY)
    setUploadedImageDataUrl(null)
    setImagePath('/medstar-montgomery-er.png')
    setLayout(MEDSTAR_MONTGOMERY_ER_LAYOUT)
    resetRoomStatuses(MEDSTAR_MONTGOMERY_ER_LAYOUT.rooms)
    setLastUpdated(new Date())
  }

  const width = layout.image_width
  const height = layout.image_height
  const facilityName = facilityConfig.name
  const facilityTitle = `${facilityName} ${facilityConfig.mode}`
  const currentDateLabel = currentTime.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const currentTimeLabel = currentTime.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  return (
    <div className="min-h-screen bg-[#020817] text-[#e5f0ff]">
      <header className="border-b border-[#1e3a5f] bg-[#020817] px-4 py-3 sm:px-5">
        <div className="grid items-center gap-3 lg:grid-cols-[1fr_auto_1fr]">
          <div className="text-sm font-medium uppercase tracking-[0.18em] text-[#8aa4c2]">
            Hospital Command Center
          </div>

          <div className="flex min-w-0 items-center justify-start lg:justify-center">
            <MedStarLogo />
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-semibold leading-tight text-[#e5f0ff]">{facilityTitle}</h1>
                <span className="rounded-full border border-emerald-300/40 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200">
                  Demo Mode
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[#8aa4c2]">{facilityConfig.type} - Interactive Real-Time Operations Dashboard</p>
            </div>
          </div>

          <div className="flex items-center justify-start gap-3 lg:justify-end">
            <div className="text-left leading-tight sm:text-right">
              <p className="text-xs font-semibold text-[#e5f0ff]">{currentDateLabel}</p>
              <p className="text-sm font-bold text-[#e5f0ff]">{currentTimeLabel}</p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-green-500 bg-green-500/10 px-3 py-1">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.95)]" />
              <span className="text-sm font-semibold text-green-400">LIVE</span>
            </div>
            <button
              type="button"
              className="hidden h-9 items-center justify-center rounded-lg border border-[#1e3a5f] bg-[#0b1728] px-3 text-xs font-semibold text-[#8aa4c2] hover:text-[#e5f0ff] sm:flex"
              aria-label="Open command center menu"
              title="Menu"
            >
              Menu
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1900px] px-3 py-4 sm:px-4 space-y-4">
        <div className="flex flex-wrap items-center justify-end gap-3">
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
            <button
              type="button"
              onClick={handleUploadImageClick}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-cyan-300/30 bg-cyan-900/20 hover:bg-cyan-900/30 text-sm font-semibold transition-colors"
              title="Upload a blueprint image for this session"
            >
              <span>🖼️</span>
              Upload Image
            </button>
            <input ref={imageInputRef} type="file" accept="image/*" onChange={handleUploadImageFile} className="hidden" />
            <button
              type="button"
              onClick={handleSaveMap}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-300/30 bg-emerald-900/20 hover:bg-emerald-900/30 text-sm font-semibold transition-colors"
              title="Save uploaded image and floor-map JSON in this browser"
            >
              <span>💾</span>
              Save Map
            </button>
            <button
              type="button"
              onClick={handleResetSavedMap}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 bg-slate-900/70 hover:bg-slate-800 text-sm font-semibold transition-colors"
              title="Clear saved map and return to the default MedStar map"
            >
              Reset Saved
            </button>
            <Link
              to="/publish/link?template=medstar-er-command-center"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              <span>📤</span>
              Add to Feed
            </Link>
            <Link
              to="/publish/link?template=medstar-er-causation-poll"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              <span>🗳️</span>
              ER Poll
            </Link>
            <button
              type="button"
              onClick={handleRefresh}
              className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-sm font-semibold transition-colors"
              title="Reset room statuses"
            >
              Refresh
            </button>
            {isFullscreen ? (
              <button
                type="button"
                onClick={() => document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {})}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/20 bg-slate-800 hover:bg-slate-700 text-sm font-semibold transition-colors"
                title="Exit full screen"
              >
                ✕ Exit full screen
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => toggleFullscreen(mapRef)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/20 bg-slate-800 hover:bg-slate-700 text-sm font-semibold transition-colors"
                  title="Full screen map only"
                >
                  ⛶ Map
                </button>
                <button
                  type="button"
                  onClick={() => toggleFullscreen(panelRef)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/20 bg-slate-800 hover:bg-slate-700 text-sm font-semibold transition-colors"
                  title="Full screen entire panel"
                >
                  ⛶ Panel
                </button>
              </>
            )}
        </div>

        <div className="space-y-2">
          <MedStarKpiPanels metrics={metrics} statusFilter={statusFilter} onFilterChange={setStatusFilter} />
          {statusFilter && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[#8aa4c2]">Filter:</span>
              <span className="px-3 py-1.5 rounded-lg bg-[#0b1728] border border-[#1e3a5f] font-medium text-[#e5f0ff] capitalize">
                {statusFilter === 'waitingProvider' ? 'Waiting Provider' : statusFilter === 'highPressure' ? 'High Pressure' : statusFilter}
              </span>
              <button
                type="button"
                onClick={() => setStatusFilter(null)}
                className="text-[#8aa4c2] hover:text-white px-2 py-1 rounded hover:bg-[#0b1728]"
                title="Clear filter"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        <div ref={panelRef} className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_380px] gap-4 bg-[#020817]">
          <div ref={mapRef} className="relative rounded-2xl border border-[#1e3a5f] bg-[#07111f] p-2 shadow-2xl shadow-blue-950/30">
            <div className="relative overflow-auto rounded-xl border border-[#1e3a5f] bg-[#020817]">
              <div
                className="relative transition-[width,min-width] duration-200 ease-out"
                style={{
                  aspectRatio: `${width} / ${height}`,
                  width: `${mapScale * 100}%`,
                  minWidth: `${900 * mapScale}px`,
                }}
              >
                <img
                  src={imagePath}
                  alt="MedStar Montgomery ER blueprint"
                  className="absolute inset-0 h-full w-full object-contain"
                  onError={() => setImagePath('/best-western-blueprint.png')}
                />
                {layout.rooms.map((room, idx) => {
                  const status = roomStatuses[room.room_id] || 'available'
                  const details = buildSyntheticRoomDetails(room, idx, status)
                  const bbox = room.bbox || { x: 0, y: 0, width: 0, height: 0 }
                  const matchesFilter = !statusFilter ||
                    statusFilter === status ||
                    (statusFilter === 'waitingProvider' && details.erStatus === 'Waiting Provider') ||
                    (statusFilter === 'highPressure' && details.pressure === 'High')
                  return (
                    <button
                      key={`${room.room_id}-${idx}`}
                      type="button"
                      onClick={() => onRoomClick(room.room_id)}
                      onMouseEnter={(event) => {
                        updateTooltipPosition(event)
                        setHoveredRoom({ room, index: idx })
                      }}
                      onMouseMove={updateTooltipPosition}
                      onMouseLeave={() => setHoveredRoom(null)}
                      className={`absolute rounded border transition-all hover:opacity-100 ${STATUS_COLORS[status] || STATUS_COLORS.available} ${
                        selectedRoomId === room.room_id ? 'ring-2 ring-white/80 opacity-100' : 'opacity-70'
                      }`}
                      style={{
                        left: `${(bbox.x / width) * 100}%`,
                        top: `${(bbox.y / height) * 100}%`,
                        width: `${(bbox.width / width) * 100}%`,
                        height: `${(bbox.height / height) * 100}%`,
                        opacity: matchesFilter ? undefined : 0.12,
                      }}
                      aria-label={`${room.room_id} • ${STATUS_LABELS[status] || STATUS_LABELS.available}`}
                    />
                  )
                })}
              </div>
            </div>
            <div className="absolute bottom-5 right-5 z-30 flex flex-col overflow-hidden rounded-xl border border-[#1e3a5f] bg-[#0b1728]/95 shadow-xl shadow-slate-950/40 backdrop-blur">
              <button
                type="button"
                onClick={() => setMapScale((scale) => Math.min(2.5, Number((scale + 0.2).toFixed(2))))}
                className="flex h-12 w-12 items-center justify-center border-b border-[#1e3a5f] text-xl font-bold text-[#e5f0ff] hover:bg-[#10243d]"
                title="Zoom in"
                aria-label="Zoom in"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setMapScale((scale) => Math.max(0.8, Number((scale - 0.2).toFixed(2))))}
                className="flex h-12 w-12 items-center justify-center border-b border-[#1e3a5f] text-2xl font-bold text-[#e5f0ff] hover:bg-[#10243d]"
                title="Zoom out"
                aria-label="Zoom out"
              >
                −
              </button>
              <button
                type="button"
                onClick={() => toggleFullscreen(mapRef)}
                className="flex h-12 w-12 items-center justify-center text-lg font-bold text-[#e5f0ff] hover:bg-[#10243d]"
                title={isFullscreen ? 'Exit full screen' : 'Full screen map'}
                aria-label={isFullscreen ? 'Exit full screen' : 'Full screen map'}
              >
                {isFullscreen ? '✕' : '⛶'}
              </button>
            </div>
          </div>

          <aside className="rounded-2xl border border-[#1e3a5f] bg-[#07111f] p-4 space-y-4 shadow-2xl shadow-blue-950/20">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#e5f0ff]">Room Details</h2>
              <p className="text-[11px] text-[#8aa4c2] mt-1">Hospital Bed-style operational context</p>
            </div>
            {selectedRoom ? (
              <div className="space-y-2 text-sm">
                <p className="text-lg font-semibold text-white">{selectedRoom.room_id}</p>
                <DetailRow label="Zone" value={getZoneName(getRoomZoneId(selectedRoom.room_id))} />
                <DetailRow label="Type" value={getRoomType(selectedRoom.room_id, selectedRoom.type)} />
                <DetailRow label="Status" value={STATUS_LABELS[selectedRoomStatus] || STATUS_LABELS.available} />
                <DetailRow label="Patient" value={selectedRoomDetails.patient} />
                <DetailRow label="Doctor" value={selectedRoomDetails.doctor} />
                <DetailRow label="LOS" value={selectedRoomDetails.los} />
                <DetailRow label="ER status" value={selectedRoomDetails.erStatus} />
                <DetailRow label="Predicted" value={selectedRoomDetails.predicted} />
                <DetailRow label="Pressure" value={selectedRoomDetails.pressure} />
              </div>
            ) : (
              <p className="text-sm text-[#8aa4c2]">Select a room on the map to inspect and update status.</p>
            )}
            <OperationalAlertsPanel alerts={OPERATIONAL_ALERTS} />
            <OccupancyTimelinePanel timeline={OCCUPANCY_TIMELINE} />
            <ZoneSummaryPanel rooms={layout.rooms} roomStatuses={roomStatuses} />
            <div className="pt-2 border-t border-[#1e3a5f] text-xs text-[#8aa4c2]">Loaded {roomCount} overlays from your MedStar ER floor-map JSON.</div>
          </aside>
        </div>
      </div>
      {hoveredRoom && (
        <RoomHoverCard
          room={hoveredRoom.room}
          roomIndex={hoveredRoom.index}
          status={roomStatuses[hoveredRoom.room.room_id] || 'available'}
          position={tooltipPosition}
        />
      )}
    </div>
  )
}

function normalizeImportedRooms(exportData) {
  if (!Array.isArray(exportData.rooms)) return []

  return exportData.rooms
    .map((room, index) => {
      const bbox = room.bbox || room.bounds || {
        x: room.x,
        y: room.y,
        width: room.width,
        height: room.height,
      }

      if (
        !bbox ||
        !Number.isFinite(Number(bbox.x)) ||
        !Number.isFinite(Number(bbox.y)) ||
        !Number.isFinite(Number(bbox.width)) ||
        !Number.isFinite(Number(bbox.height))
      ) {
        return null
      }

      return {
        room_id: String(room.room_id || room.id || room.label || `Room ${index + 1}`),
        type: room.type || 'patient_room',
        status: normalizeRoomStatus(room.status),
        unit: room.unit || null,
        bbox: {
          x: Number(bbox.x),
          y: Number(bbox.y),
          width: Number(bbox.width),
          height: Number(bbox.height),
        },
      }
    })
    .filter(Boolean)
}

function normalizeRoomStatus(status) {
  if (status === 'cleaning') return 'dirty'
  return STATUS_SEQUENCE.includes(status) ? status : 'available'
}

function buildSyntheticRoomStatuses(rooms) {
  return rooms.reduce((acc, room) => {
    const explicitStatus = normalizeRoomStatus(room.status)
    if (explicitStatus !== 'available') {
      acc[room.room_id] = explicitStatus
    } else if (SYNTHETIC_OCCUPIED_ROOM_IDS.has(room.room_id)) {
      acc[room.room_id] = 'occupied'
    } else if (SYNTHETIC_RESERVED_ROOM_IDS.has(room.room_id)) {
      acc[room.room_id] = 'reserved'
    } else if (SYNTHETIC_DIRTY_ROOM_IDS.has(room.room_id)) {
      acc[room.room_id] = 'dirty'
    } else {
      acc[room.room_id] = 'available'
    }
    return acc
  }, {})
}

function getRoomZoneId(roomId) {
  if (/^F[1-5]$/.test(roomId)) return 'FAST_TRACK'
  if (roomId.toLowerCase().includes('triage')) return 'TRIAGE'
  if (roomId === 'XRAY') return 'IMAGING'
  if (roomId === 'EMS Entrance') return 'EMS'
  if (
    roomId.toLowerCase().includes('stairs') ||
    roomId.toLowerCase().includes('stairwell') ||
    roomId.toLowerCase().includes('storage') ||
    roomId.toLowerCase().includes('soiled') ||
    roomId.toLowerCase().includes('supplies') ||
    roomId.toLowerCase().includes('nursing') ||
    roomId === 'Unit Clerk' ||
    roomId === 'ELEVATOR' ||
    roomId === 'OFFICE' ||
    roomId === 'DECON' ||
    roomId === 'CEU'
  ) {
    return 'SUPPORT'
  }
  return 'MAIN_ER'
}

function getZoneName(zoneId) {
  return OPERATIONAL_ZONES.find((zone) => zone.id === zoneId)?.name || zoneId
}

function getRoomType(roomId, fallbackType) {
  if (/^F[1-5]$/.test(roomId)) return 'fast_track'
  if (roomId.toLowerCase().includes('triage')) return 'triage'
  if (roomId === 'XRAY') return 'imaging'
  if (roomId === 'EMS Entrance') return 'entry'
  if (getRoomZoneId(roomId) === 'SUPPORT') return 'support'
  return fallbackType || 'treatment'
}

function getRoomSeed(room, roomIndex) {
  return Array.from(room.room_id).reduce((sum, char) => sum + char.charCodeAt(0), roomIndex * 17)
}

function buildSyntheticRoomDetails(room, roomIndex, status) {
  const seed = getRoomSeed(room, roomIndex)
  const erStatuses = ER_STATUS_BY_ROOM_STATUS[status] || ER_STATUS_BY_ROOM_STATUS.available
  const isAvailable = status === 'available'
  const isDirty = status === 'dirty'
  const isReserved = status === 'reserved'
  const hours = status === 'occupied' ? 1 + (seed % 7) : 0
  const minutes = status === 'occupied' ? (seed * 13) % 60 : isDirty ? 20 + (seed % 35) : isReserved ? 10 + (seed % 30) : 0
  const admitHour = 7 + (seed % 9)
  const admitMinute = (seed * 7) % 60
  const admitSuffix = admitHour >= 12 ? 'PM' : 'AM'
  const displayHour = admitHour > 12 ? admitHour - 12 : admitHour

  return {
    patient: isAvailable || isDirty ? 'Unassigned' : isReserved ? `Inbound-${100 + (seed % 90)}` : `PT-${15300 + (seed % 700)}`,
    doctor: isAvailable || isDirty || isReserved ? 'Unassigned' : SYNTHETIC_DOCTORS[seed % SYNTHETIC_DOCTORS.length],
    admitted: isAvailable ? 'Open' : isDirty ? 'Turnover' : isReserved ? 'Pending' : `${displayHour}:${String(admitMinute).padStart(2, '0')} ${admitSuffix}`,
    los: status === 'occupied' ? `${hours}h ${String(minutes).padStart(2, '0')}m` : isDirty || isReserved ? `${minutes}m` : '0h 00m',
    erStatus: erStatuses[seed % erStatuses.length],
    predicted: status === 'available' ? 'Avail now' : status === 'dirty' ? `Avail ~${20 + (seed % 35)}m` : isReserved ? `Hold ~${10 + (seed % 30)}m` : `Avail ~${1 + (seed % 4)}h`,
    pressure: status === 'occupied' && hours >= 5 ? 'High' : status === 'occupied' || status === 'dirty' || status === 'reserved' ? 'Medium' : 'Low',
  }
}

function parseLosMinutes(los) {
  const hoursMatch = String(los).match(/(\d+)h/)
  const minutesMatch = String(los).match(/(\d+)m/)
  return (hoursMatch ? Number(hoursMatch[1]) * 60 : 0) + (minutesMatch ? Number(minutesMatch[1]) : 0)
}

function formatDuration(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${String(minutes).padStart(2, '0')}m`
}

function RoomHoverCard({ room, roomIndex, status, position }) {
  const details = buildSyntheticRoomDetails(room, roomIndex, status)
  const pressureClass = {
    High: 'text-orange-300',
    Medium: 'text-yellow-300',
    Low: 'text-emerald-300',
  }[details.pressure]

  return (
    <div
      className="fixed z-[1000] w-64 rounded-lg border border-cyan-300/40 bg-slate-950/95 text-white shadow-2xl shadow-cyan-950/40 backdrop-blur pointer-events-none"
      style={{ left: position.x, top: position.y }}
    >
      <div className="border-b border-slate-700/80 px-4 py-3">
        <p className="text-base font-bold">Room: {room.room_id}</p>
      </div>
      <div className="space-y-2 px-4 py-4 text-sm">
        <HoverDetailRow label="Patient" value={details.patient} />
        <HoverDetailRow label="Doctor" value={details.doctor} />
        <HoverDetailRow label="Status" value={STATUS_LABELS[status] || STATUS_LABELS.available} />
        <HoverDetailRow label="Admitted" value={details.admitted} />
        <HoverDetailRow label="LOS" value={details.los} valueClass="text-cyan-300" />
        <HoverDetailRow label="ER status" value={details.erStatus} badgeClass="bg-amber-400 text-slate-950" />
        <HoverDetailRow label="Predicted" value={details.predicted} badgeClass="bg-emerald-400 text-white" />
        <div className="border-t border-slate-700/80 pt-2">
          <HoverDetailRow label="Pressure" value={details.pressure} valueClass={pressureClass} />
        </div>
      </div>
    </div>
  )
}

function HoverDetailRow({ label, value, valueClass = 'text-slate-50', badgeClass = null }) {
  return (
    <p className="flex items-center justify-between gap-4">
      <span className="text-slate-400">{label}</span>
      {badgeClass ? (
        <span className={`rounded px-2 py-1 text-xs font-bold ${badgeClass}`}>{value}</span>
      ) : (
        <span className={`text-right font-semibold ${valueClass}`}>{value}</span>
      )}
    </p>
  )
}

function MedStarKpiPanels({ metrics, statusFilter, onFilterChange }) {
  const latestWaiting = OCCUPANCY_TIMELINE.at(-1)?.occupancy.WAITING ?? 0
  const cards = [
    { label: 'ER Occupancy', value: `${metrics.utilizationPct ?? 0}%`, accent: 'from-cyan-400 to-blue-500' },
    { label: 'Available Rooms', value: metrics.available, filterKey: 'available', accent: 'from-emerald-300 to-emerald-500' },
    { label: 'Occupied Rooms', value: metrics.occupied, filterKey: 'occupied', accent: 'from-rose-400 to-red-500' },
    { label: 'Cleaning / Dirty', value: metrics.dirty, filterKey: 'dirty', accent: 'from-amber-300 to-orange-500' },
    { label: 'Reserved Rooms', value: metrics.reserved, filterKey: 'reserved', accent: 'from-sky-300 to-cyan-500' },
    { label: 'Avg LOS', value: metrics.avgLos, accent: 'from-violet-300 to-indigo-500' },
    { label: 'Waiting Patients', value: latestWaiting, filterKey: 'waitingProvider', accent: 'from-yellow-300 to-amber-500' },
    { label: 'Transfers Pending', value: metrics.reserved, filterKey: 'reserved', accent: 'from-fuchsia-300 to-purple-500' },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
      {cards.map((card) => {
        const isActive = card.filterKey && statusFilter === card.filterKey
        const content = (
          <>
            <div className={`mb-3 h-1 w-12 rounded-full bg-gradient-to-r ${card.accent}`} />
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8aa4c2]">{card.label}</p>
            <p className="mt-1 text-2xl font-black text-[#e5f0ff]">{card.value}</p>
          </>
        )

        const className = `min-h-[104px] rounded-2xl border bg-[#0b1728] p-3 text-left shadow-lg shadow-slate-950/20 transition ${
          isActive
            ? 'border-cyan-300/80 ring-2 ring-cyan-300/30'
            : 'border-[#1e3a5f] hover:border-cyan-300/50'
        }`

        if (card.filterKey) {
          return (
            <button
              key={card.label}
              type="button"
              onClick={() => onFilterChange(isActive ? null : card.filterKey)}
              className={className}
              title={`Filter by ${card.label}`}
            >
              {content}
            </button>
          )
        }

        return (
          <div key={card.label} className={className}>
            {content}
          </div>
        )
      })}
    </div>
  )
}

function OperationalAlertsPanel({ alerts }) {
  return (
    <div className="rounded-xl border border-[#1e3a5f] bg-[#0b1728] p-3 space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-wide text-[#e5f0ff]">Operational Alerts</h3>
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`rounded-md border px-3 py-2 text-xs ${
            alert.type === 'critical'
              ? 'border-red-400/40 bg-red-500/10'
              : 'border-amber-300/40 bg-amber-400/10'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold text-white">{alert.message}</span>
            <span className="text-[#8aa4c2]">{alert.time}</span>
          </div>
          <p className={alert.type === 'critical' ? 'mt-1 text-red-200' : 'mt-1 text-amber-200'}>
            {alert.value || alert.patient_id}
          </p>
        </div>
      ))}
    </div>
  )
}

function OccupancyTimelinePanel({ timeline }) {
  const maxEr = Math.max(...timeline.map((point) => point.occupancy.ER))

  return (
    <div className="rounded-xl border border-[#1e3a5f] bg-[#0b1728] p-3 space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wide text-[#e5f0ff]">Occupancy Timeline</h3>
      {timeline.map((point) => (
        <div key={point.time} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#8aa4c2]">{point.time}</span>
            <span className="font-semibold text-white">{point.occupancy.ER}% ER</span>
          </div>
          <div className="h-2 rounded-full bg-[#07111f] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-red-400"
              style={{ width: `${Math.max(8, (point.occupancy.ER / maxEr) * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-[#8aa4c2]">Waiting: {point.occupancy.WAITING} patients</p>
        </div>
      ))}
    </div>
  )
}

function ZoneSummaryPanel({ rooms, roomStatuses }) {
  const zoneCounts = rooms.reduce((acc, room) => {
    const zoneId = getRoomZoneId(room.room_id)
    const status = roomStatuses[room.room_id] || 'available'
    acc[zoneId] = acc[zoneId] || { total: 0, occupied: 0, dirty: 0 }
    acc[zoneId].total += 1
    if (status === 'occupied') acc[zoneId].occupied += 1
    if (status === 'dirty') acc[zoneId].dirty += 1
    return acc
  }, {})

  return (
    <div className="rounded-xl border border-[#1e3a5f] bg-[#0b1728] p-3 space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-wide text-[#e5f0ff]">Zones</h3>
      {OPERATIONAL_ZONES.map((zone) => {
        const counts = zoneCounts[zone.id] || { total: 0, occupied: 0, dirty: 0 }
        return (
          <div key={zone.id} className="flex items-center justify-between gap-3 text-xs">
            <span className="text-[#8aa4c2]">{zone.name}</span>
            <span className="font-semibold text-slate-100">
              {counts.occupied}/{counts.total}
              {counts.dirty ? <span className="text-amber-300"> · {counts.dirty} dirty</span> : null}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function MetricCard({ label, value, color = 'text-white' }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-xl font-semibold ${color}`}>{value}</p>
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <p className="flex items-start justify-between gap-4">
      <span className="text-[#8aa4c2]">{label}</span>
      <span className="text-right text-[#e5f0ff]">{value}</span>
    </p>
  )
}

