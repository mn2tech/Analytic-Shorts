/**
 * RoomEditor - Side panel for editing selected room properties.
 */
const ROOM_TYPES = [
  { value: 'patient_room', label: 'Patient Room' },
  { value: 'treatment_room', label: 'Treatment Room' },
  { value: 'nurse_station', label: 'Nurse Station' },
  { value: 'storage', label: 'Storage' },
  { value: 'utility', label: 'Utility' },
  { value: 'other', label: 'Other' },
]
const UNITS = [
  { value: '', label: '— Select unit —' },
  { value: 'ER', label: 'Emergency Unit (ER)' },
  { value: 'General Ward', label: 'General Ward' },
  { value: 'ICU', label: 'Intensive Care Unit (ICU)' },
  { value: 'OR', label: 'Operating Suite (OR)' },
]
const ROOM_STATUSES = [
  { value: 'available', label: 'Available' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'reserved', label: 'Reserved' },
]

export default function RoomEditor({ room, onUpdate, onDelete }) {
  if (!room) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 bg-slate-50/50 rounded-lg border border-slate-200">
        <p className="text-sm">Select a room to edit</p>
      </div>
    )
  }

  const handleChange = (field, value) => onUpdate(room.room_id, { [field]: value })
  const handleBboxChange = (key, value) => {
    const n = parseFloat(value)
    if (Number.isNaN(n)) return
    const bbox = { ...room.bbox, [key]: n }
    const center = { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 }
    const polygon = [[bbox.x, bbox.y], [bbox.x + bbox.width, bbox.y], [bbox.x + bbox.width, bbox.y + bbox.height], [bbox.x, bbox.y + bbox.height]]
    onUpdate(room.room_id, { bbox, center, polygon })
  }
  const handleCenterChange = (key, value) => {
    const n = parseFloat(value)
    if (Number.isNaN(n)) return
    const center = { ...room.center, [key]: n }
    const w = room.bbox.width
    const h = room.bbox.height
    const bbox = { x: center.x - w / 2, y: center.y - h / 2, width: w, height: h }
    const polygon = [[bbox.x, bbox.y], [bbox.x + bbox.width, bbox.y], [bbox.x + bbox.width, bbox.y + bbox.height], [bbox.x, bbox.y + bbox.height]]
    onUpdate(room.room_id, { bbox, center, polygon })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Room Details</h3>
        <button type="button" onClick={() => onDelete(room.room_id)} className="text-xs px-2 py-1 rounded text-rose-600 hover:bg-rose-50 border border-rose-200">Delete</button>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Room ID</label>
        <input type="text" value={room.room_id} onChange={(e) => handleChange('room_id', e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Label</label>
        <input type="text" value={room.label} onChange={(e) => handleChange('label', e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Unit</label>
        <select value={room.unit || ''} onChange={(e) => handleChange('unit', e.target.value || null)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500">
          {UNITS.map((u) => <option key={u.value || 'none'} value={u.value}>{u.label}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
        <select value={room.type} onChange={(e) => handleChange('type', e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500">
          {ROOM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
        <select value={room.status} onChange={(e) => handleChange('status', e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500">
          {ROOM_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      <div className="pt-2 border-t border-slate-200">
        <h4 className="text-xs font-medium text-slate-600 mb-2">Bounding Box</h4>
        <div className="grid grid-cols-2 gap-2">
          {['x', 'y', 'width', 'height'].map((key) => (
            <div key={key}>
              <label className="block text-xs text-slate-500 mb-0.5">{key.charAt(0).toUpperCase() + key.slice(1)}</label>
              <input type="number" value={Math.round(room.bbox[key])} onChange={(e) => handleBboxChange(key, parseFloat(e.target.value))} className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded" />
            </div>
          ))}
        </div>
      </div>
      <div className="pt-2 border-t border-slate-200">
        <h4 className="text-xs font-medium text-slate-600 mb-2">Center Point</h4>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="block text-xs text-slate-500 mb-0.5">X</label><input type="number" value={Math.round(room.center.x)} onChange={(e) => handleCenterChange('x', parseFloat(e.target.value))} className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded" /></div>
          <div><label className="block text-xs text-slate-500 mb-0.5">Y</label><input type="number" value={Math.round(room.center.y)} onChange={(e) => handleCenterChange('y', parseFloat(e.target.value))} className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded" /></div>
        </div>
      </div>
    </div>
  )
}
