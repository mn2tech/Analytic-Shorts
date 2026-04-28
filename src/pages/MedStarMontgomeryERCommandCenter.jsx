import { useMemo, useState } from 'react'
import { MEDSTAR_MONTGOMERY_ER_LAYOUT } from '../data/medstarMontgomeryErLayout'

const STATUS_COLORS = {
  available: 'bg-emerald-500/30 border-emerald-300/70',
  occupied: 'bg-red-500/35 border-red-300/80',
  cleaning: 'bg-amber-500/35 border-amber-300/80',
  reserved: 'bg-cyan-500/35 border-cyan-300/80',
}

const STATUS_LABELS = {
  available: 'Available',
  occupied: 'Occupied',
  cleaning: 'Cleaning',
  reserved: 'Reserved',
}

const STATUS_SEQUENCE = ['available', 'occupied', 'cleaning', 'reserved']

function nextStatus(current) {
  const idx = STATUS_SEQUENCE.indexOf(current)
  return STATUS_SEQUENCE[(idx + 1) % STATUS_SEQUENCE.length]
}

export default function MedStarMontgomeryERCommandCenter() {
  const [imagePath, setImagePath] = useState('/medstar-montgomery-er.png')
  const [selectedRoomId, setSelectedRoomId] = useState(null)
  const [roomStatuses, setRoomStatuses] = useState(() => {
    const initial = {}
    MEDSTAR_MONTGOMERY_ER_LAYOUT.rooms.forEach((room) => {
      initial[room.room_id] = room.status || 'available'
    })
    return initial
  })

  const roomCount = MEDSTAR_MONTGOMERY_ER_LAYOUT.rooms.length
  const metrics = useMemo(() => {
    return MEDSTAR_MONTGOMERY_ER_LAYOUT.rooms.reduce(
      (acc, room) => {
        const status = roomStatuses[room.room_id] || 'available'
        acc.total += 1
        if (status === 'available') acc.available += 1
        if (status === 'occupied') acc.occupied += 1
        if (status === 'cleaning') acc.cleaning += 1
        if (status === 'reserved') acc.reserved += 1
        return acc
      },
      { total: 0, available: 0, occupied: 0, cleaning: 0, reserved: 0 }
    )
  }, [roomStatuses])

  const selectedRoom = useMemo(
    () => MEDSTAR_MONTGOMERY_ER_LAYOUT.rooms.find((room) => room.room_id === selectedRoomId) || null,
    [selectedRoomId]
  )

  const onRoomClick = (roomId) => {
    setSelectedRoomId(roomId)
    setRoomStatuses((prev) => ({ ...prev, [roomId]: nextStatus(prev[roomId] || 'available') }))
  }

  const width = MEDSTAR_MONTGOMERY_ER_LAYOUT.image_width
  const height = MEDSTAR_MONTGOMERY_ER_LAYOUT.image_height

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-[1600px] px-4 py-6 space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">MedStar Montgomery ER Command Center</h1>
            <p className="text-sm text-slate-400">Interactive floor-map operations view</p>
          </div>
          <div className="text-xs text-slate-400 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2">
            Click a room to cycle status
          </div>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <MetricCard label="Rooms" value={metrics.total} />
          <MetricCard label="Available" value={metrics.available} color="text-emerald-300" />
          <MetricCard label="Occupied" value={metrics.occupied} color="text-red-300" />
          <MetricCard label="Cleaning" value={metrics.cleaning} color="text-amber-300" />
          <MetricCard label="Reserved" value={metrics.reserved} color="text-cyan-300" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
          <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-2">
            <div className="relative overflow-auto rounded-lg border border-slate-700 bg-slate-950">
              <div className="relative min-w-[900px]" style={{ aspectRatio: `${width} / ${height}` }}>
                <img
                  src={imagePath}
                  alt="MedStar Montgomery ER blueprint"
                  className="absolute inset-0 h-full w-full object-contain"
                  onError={() => setImagePath('/best-western-blueprint.png')}
                />
                {MEDSTAR_MONTGOMERY_ER_LAYOUT.rooms.map((room, idx) => {
                  const status = roomStatuses[room.room_id] || 'available'
                  const bbox = room.bbox || { x: 0, y: 0, width: 0, height: 0 }
                  return (
                    <button
                      key={`${room.room_id}-${idx}`}
                      type="button"
                      onClick={() => onRoomClick(room.room_id)}
                      className={`absolute rounded border transition-all hover:opacity-100 ${STATUS_COLORS[status] || STATUS_COLORS.available} ${
                        selectedRoomId === room.room_id ? 'ring-2 ring-white/80 opacity-100' : 'opacity-70'
                      }`}
                      style={{
                        left: `${(bbox.x / width) * 100}%`,
                        top: `${(bbox.y / height) * 100}%`,
                        width: `${(bbox.width / width) * 100}%`,
                        height: `${(bbox.height / height) * 100}%`,
                      }}
                      title={`${room.room_id} • ${STATUS_LABELS[status]}`}
                    />
                  )
                })}
              </div>
            </div>
          </div>

          <aside className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Room Details</h2>
            {selectedRoom ? (
              <div className="space-y-2 text-sm">
                <p className="text-lg font-semibold text-white">{selectedRoom.room_id}</p>
                <DetailRow label="Type" value={selectedRoom.type || 'patient_room'} />
                <DetailRow label="Status" value={STATUS_LABELS[roomStatuses[selectedRoom.room_id] || 'available']} />
                <DetailRow label="Unit" value={selectedRoom.unit || '—'} />
                <DetailRow
                  label="Bounds"
                  value={`x:${selectedRoom.bbox.x}, y:${selectedRoom.bbox.y}, w:${selectedRoom.bbox.width}, h:${selectedRoom.bbox.height}`}
                />
              </div>
            ) : (
              <p className="text-sm text-slate-400">Select a room on the map to inspect and update status.</p>
            )}
            <div className="pt-2 border-t border-slate-700 text-xs text-slate-400">
              Loaded {roomCount} overlays from your MedStar ER floor-map JSON.
            </div>
          </aside>
        </div>
      </div>
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
      <span className="text-slate-400">{label}</span>
      <span className="text-right text-slate-100">{value}</span>
    </p>
  )
}

