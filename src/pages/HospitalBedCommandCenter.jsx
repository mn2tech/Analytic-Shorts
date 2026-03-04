/**
 * Hospital Bed Command Center - Visual blueprint of hospital rooms with color-coded bed status.
 * Extensible for real-time updates, alerts, room timers, and predictive availability.
 */
import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  SAMPLE_ROOMS,
  STATUS_LABELS,
  STATUS_COLORS,
  ROOM_STATUS,
  computeBedMetrics,
} from '../config/hospitalBedData'

function RoomTile({ room, colors, index, onRoomClick }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const isOccupied = room.status === ROOM_STATUS.occupied
  const isDirty = room.status === ROOM_STATUS.dirty

  return (
    <div
      className="relative group cursor-pointer"
      onMouseEnter={() => isOccupied && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={() => onRoomClick?.(room)}
      onKeyDown={(e) => e.key === 'Enter' && onRoomClick?.(room)}
      role="button"
      tabIndex={0}
      aria-label={`Room ${room.room_id}, ${STATUS_LABELS[room.status]}. Click for details`}
    >
      {/* Room tile: floor plan view with door + bed */}
      <div
        style={{ animationDelay: `${index * 40}ms` }}
        className={`
          relative min-w-[90px] max-w-[115px] aspect-[4/5]
          rounded-lg overflow-hidden
          transition-all duration-300 ease-out
          shadow-lg hover:shadow-xl hover:-translate-y-0.5 hover:scale-[1.02]
          animate-scale-in border-2
          ${colors.bg} ${colors.bgHover} ${colors.border} ${colors.text}
          ${isDirty ? 'animate-pulse-soft' : ''}
        `}
      >
        {/* Door (left wall - corridor side) */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-6 rounded-r bg-slate-500/60 border-r border-slate-600/70 shadow-inner" />
        {/* Room number plaque */}
        <div className="absolute top-2 left-0 right-0 flex justify-center">
          <span className="px-2 py-1 rounded font-bold text-sm bg-white/50 border border-white/70 shadow">
            {room.room_id}
          </span>
        </div>
        {/* Bed in room center */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-2 w-10 h-6 rounded flex items-center justify-center bg-white/40 border border-white/60 shadow-inner">
          {isOccupied ? <span className="text-sm">🛏️</span> : isDirty ? <span className="text-xs">🧹</span> : <span className="text-xs font-bold">✓</span>}
        </div>
        {/* Status */}
        <div className="absolute bottom-2 left-1 right-1">
          <span className="text-[9px] font-bold uppercase tracking-wider block truncate text-center opacity-95">
            {STATUS_LABELS[room.status] || room.status}
          </span>
        </div>
      </div>
      {isOccupied && showTooltip && room.patient_name && (
        <div
          className="absolute z-30 left-1/2 -translate-x-1/2 bottom-full mb-3 w-64 animate-fade-in
            backdrop-blur-xl bg-slate-900/95 text-white rounded-xl shadow-2xl
            border border-white/10 overflow-hidden pointer-events-none"
          role="tooltip"
        >
          <div className="bg-gradient-to-r from-rose-600/80 to-rose-500/60 px-4 py-2.5">
            <span className="font-bold text-sm">Room {room.room_id}</span>
          </div>
          <div className="p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Patient</span>
              <span className="font-medium text-white">{room.patient_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Age</span>
              <span>{room.age}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Reason</span>
              <span>{room.reason_for_visit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">LOS</span>
              <span className="font-medium">{room.length_of_stay}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Doctor</span>
              <span className="text-rose-300">{room.doctor}</span>
            </div>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0
            border-l-[10px] border-r-[10px] border-t-[10px]
            border-l-transparent border-r-transparent border-t-slate-900/95" />
        </div>
      )}
    </div>
  )
}

function RoomDetailModal({ room, onClose }) {
  if (!room) return null
  const colors = STATUS_COLORS[room.status] || STATUS_COLORS[ROOM_STATUS.available]
  const isOccupied = room.status === ROOM_STATUS.occupied

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" aria-hidden="true" onClick={onClose} />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="room-detail-title"
      >
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`px-5 py-4 ${colors.bg} ${colors.text}`}>
            <div className="flex items-center justify-between">
              <h2 id="room-detail-title" className="text-xl font-bold">Room {room.room_id}</h2>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm font-semibold mt-1 opacity-90">{STATUS_LABELS[room.status]}</p>
            <p className="text-xs mt-0.5 opacity-80">{room.wing} Wing</p>
          </div>
          <div className="p-5 space-y-4">
            {isOccupied && room.patient_name ? (
              <>
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase">Patient</span>
                  <p className="font-medium text-slate-900">{room.patient_name}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase">Age</span>
                  <p className="font-medium text-slate-900">{room.age}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase">Reason for Visit</span>
                  <p className="font-medium text-slate-900">{room.reason_for_visit}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase">Length of Stay</span>
                  <p className="font-medium text-slate-900">{room.length_of_stay}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase">Doctor</span>
                  <p className="font-medium text-slate-900">{room.doctor}</p>
                </div>
              </>
            ) : (
              <p className="text-slate-600">
                {room.status === ROOM_STATUS.available
                  ? 'This room is available and ready for the next patient.'
                  : 'This room needs cleaning before it can be assigned to a new patient.'}
              </p>
            )}
          </div>
          <div className="px-5 pb-5">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function WingSection({ title, rooms, onRoomClick }) {
  const sorted = useMemo(
    () => [...rooms].sort((a, b) => Number(a.room_id) - Number(b.room_id)),
    [rooms]
  )

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-sm
      p-6 shadow-lg shadow-slate-200/50 hover:shadow-xl transition-shadow duration-300
      bg-gradient-to-b from-white to-slate-50/30">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-bold text-slate-800 uppercase tracking-widest">
          {title}
        </h3>
        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
          {sorted.length} room{sorted.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="flex flex-wrap gap-4">
        {sorted.map((room, i) => (
          <RoomTile
            key={room.room_id}
            room={room}
            colors={STATUS_COLORS[room.status] || STATUS_COLORS[ROOM_STATUS.available]}
            index={i}
            onRoomClick={onRoomClick}
          />
        ))}
      </div>
    </div>
  )
}

function HospitalBedCommandCenter() {
  const [rooms] = useState(SAMPLE_ROOMS)
  const [statusFilter, setStatusFilter] = useState('all')
  const [roomSearch, setRoomSearch] = useState('')
  const [selectedRoom, setSelectedRoom] = useState(null)

  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && setSelectedRoom(null)
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const filteredRooms = useMemo(() => {
    let list = rooms
    if (statusFilter !== 'all') list = list.filter((r) => r.status === statusFilter)
    if (roomSearch.trim()) {
      const q = roomSearch.trim().toLowerCase()
      list = list.filter((r) => r.room_id.toLowerCase().includes(q))
    }
    return list
  }, [rooms, statusFilter, roomSearch])

  const metrics = useMemo(() => computeBedMetrics(rooms), [rooms])
  const northRooms = useMemo(
    () => filteredRooms.filter((r) => r.wing === 'North'),
    [filteredRooms]
  )
  const southRooms = useMemo(
    () => filteredRooms.filter((r) => r.wing === 'South'),
    [filteredRooms]
  )

  const kpiCards = [
    { label: 'Occupied Beds', value: metrics.occupied, icon: '🛏️', gradient: 'from-rose-500 to-rose-600', bg: 'bg-rose-50', text: 'text-rose-800' },
    { label: 'Available Beds', value: metrics.available, icon: '✓', gradient: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50', text: 'text-emerald-800' },
    { label: 'Dirty / Needs Cleaning', value: metrics.dirty, icon: '🧹', gradient: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', text: 'text-amber-800' },
    { label: 'Capacity', value: `${metrics.capacityPct}%`, icon: '📊', gradient: 'from-slate-600 to-slate-700', bg: 'bg-slate-50', text: 'text-slate-800', isPct: true },
    { label: 'Max Capacity', value: metrics.maxCapacity, icon: '🏥', gradient: 'from-indigo-500 to-indigo-600', bg: 'bg-indigo-50', text: 'text-indigo-800' },
  ]

  const filters = [
    { id: 'all', label: 'All Rooms' },
    { id: ROOM_STATUS.available, label: 'Available' },
    { id: ROOM_STATUS.occupied, label: 'Occupied' },
    { id: ROOM_STATUS.dirty, label: 'Dirty' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-slide-up">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-white text-2xl shadow-lg shadow-rose-200">
                🏥
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Hospital Bed Command Center
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  Live floor map • Click any room for details
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/publish/link?template=hospital-bed"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-md"
            >
              <span>📤</span>
              Add to Feed
            </Link>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
            <span className="text-xs text-slate-400">Updated 2m ago</span>
          </div>
        </div>

        {/* KPI Cards - Glassmorphism */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
          {kpiCards.map((kpi, i) => (
            <div
              key={kpi.label}
              className="group rounded-2xl border border-white/80 bg-white/90 backdrop-blur-sm
                p-5 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-0.5
                transition-all duration-300 overflow-hidden"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${kpi.gradient} opacity-0 group-hover:opacity-5 transition-opacity`} />
              <div className="relative flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{kpi.label}</div>
                  <div className={`text-2xl sm:text-3xl font-black mt-1 ${kpi.text}`}>{kpi.value}</div>
                </div>
                <span className="text-2xl opacity-60">{kpi.icon}</span>
              </div>
              {kpi.isPct && (
                <div className="mt-3 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${kpi.gradient} transition-all duration-500`}
                    style={{ width: `${Math.min(metrics.capacityPct, 100)}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Filters + Search */}
        <div className="flex flex-col sm:flex-row gap-3 animate-slide-up" style={{ animationDelay: '150ms' }}>
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200
                  ${statusFilter === f.id
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex-1 max-w-xs">
            <input
              type="search"
              placeholder="Search room (e.g. 112)"
              value={roomSearch}
              onChange={(e) => setRoomSearch(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm
                focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400 outline-none transition-all"
            />
          </div>
        </div>

        {/* Floor Layout */}
        <div className="space-y-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <WingSection title="North Wing" rooms={northRooms} onRoomClick={setSelectedRoom} />
          <WingSection title="South Wing" rooms={southRooms} onRoomClick={setSelectedRoom} />
        </div>

        {/* Room detail modal */}
        {selectedRoom && (
          <RoomDetailModal room={selectedRoom} onClose={() => setSelectedRoom(null)} />
        )}

        {filteredRooms.length === 0 && (
          <div className="text-center py-12 text-slate-500 text-sm">
            No rooms match your filters. Try changing the filter or search.
          </div>
        )}

        {/* Legend */}
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-sm
          px-6 py-4 flex flex-wrap items-center gap-6 shadow-sm animate-fade-in">
          <span className="text-sm font-bold text-slate-700 uppercase tracking-wider">Legend</span>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-500 shadow-md shadow-emerald-200" />
            <span className="text-sm text-slate-600 font-medium">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-rose-500 shadow-md shadow-rose-200" />
            <span className="text-sm text-slate-600 font-medium">Occupied</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-400 shadow-md shadow-amber-200 animate-pulse-soft" />
            <span className="text-sm text-slate-600 font-medium">Dirty / Needs Cleaning</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HospitalBedCommandCenter