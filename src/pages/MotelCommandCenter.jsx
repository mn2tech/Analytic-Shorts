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
  computeRoomMetrics as defaultComputeRoomMetrics,
  addMockPredictions as defaultAddMockPredictions,
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
import { normalizeInnsoftRows, parseInnsoftFile } from '../utils/innsoftIngestion'
import { gatewayInnDemoRows } from '../data/gatewayInnDemoDataset'
import { supabase } from '../lib/supabase'
import { useNotification } from '../contexts/NotificationContext'

const STATUS_COLORS = ['#2ECC71', '#E74C3C', '#F1C40F', '#3498DB']
const STATUS_VISUALS = {
  available: { label: 'AVL', icon: 'OK', textColor: '#052E16', badgeBg: 'rgba(220, 252, 231, 0.95)' },
  occupied: { label: 'OCC', icon: 'BED', textColor: '#7F1D1D', badgeBg: 'rgba(254, 226, 226, 0.95)' },
  dirty: { label: 'DRT', icon: 'CLN', textColor: '#713F12', badgeBg: 'rgba(254, 243, 199, 0.95)' },
  reserved: { label: 'RSV', icon: 'IN', textColor: '#1E3A8A', badgeBg: 'rgba(219, 234, 254, 0.95)' },
  maintenance: { label: 'MNT', icon: 'FIX', textColor: '#111827', badgeBg: 'rgba(229, 231, 235, 0.95)' },
}
const MOCK_GUESTS = [
  'J. Smith', 'M. Johnson', 'R. Williams', 'A. Brown', 'K. Davis', 'T. Miller',
  'S. Wilson', 'L. Moore', 'P. Taylor', 'C. Anderson', 'J. Thomas', 'D. Jackson',
]

function pickGuestForRoom(roomId, i) {
  const numericRoom = Number.parseInt(String(roomId || '').replace(/\D/g, ''), 10)
  const roomSeed = Number.isFinite(numericRoom) ? numericRoom : String(roomId || '').length
  return MOCK_GUESTS[(roomSeed + i) % MOCK_GUESTS.length]
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
  if (mins >= 1440) {
    const days = mins / 1440
    return Number.isInteger(days) ? `${days}d` : `${days.toFixed(1)}d`
  }
  if (mins >= 60) return `${Math.floor(mins / 60)}h`
  return `${mins}m`
}

function canonicalRoomKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function toDateInputValue(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateDiffNights(checkInDate, checkOutDate) {
  if (!checkInDate || !checkOutDate) return 0
  const inDate = new Date(`${checkInDate}T12:00:00`)
  const outDate = new Date(`${checkOutDate}T12:00:00`)
  const diffMs = outDate.getTime() - inDate.getTime()
  if (Number.isNaN(diffMs) || diffMs <= 0) return 0
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

function NewReservationPanel({ isOpen, roomOverlay, roomData, onClose, onSave }) {
  const [formValues, setFormValues] = useState(() => ({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    idType: 'Passport',
    idNumber: '',
    checkInDate: toDateInputValue(new Date()),
    checkOutDate: '',
    adults: 1,
    children: 0,
    ratePerNight: roomData?.rate_per_night ?? roomData?.ratePerNight ?? 0,
    depositCollected: 0,
    paymentMethod: 'Cash',
    source: 'Walk-in',
    specialRequests: '',
  }))
  const [errors, setErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setFormValues({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      idType: 'Passport',
      idNumber: '',
      checkInDate: toDateInputValue(new Date()),
      checkOutDate: '',
      adults: 1,
      children: 0,
      ratePerNight: roomData?.rate_per_night ?? roomData?.ratePerNight ?? 0,
      depositCollected: 0,
      paymentMethod: 'Cash',
      source: 'Walk-in',
      specialRequests: '',
    })
    setErrors({})
    setIsSaving(false)
  }, [isOpen, roomData?.rate_per_night, roomData?.ratePerNight, roomOverlay?.id])

  const nights = useMemo(
    () => dateDiffNights(formValues.checkInDate, formValues.checkOutDate),
    [formValues.checkInDate, formValues.checkOutDate]
  )
  const totalAmount = useMemo(() => {
    const rate = Number(formValues.ratePerNight) || 0
    return nights * rate
  }, [formValues.ratePerNight, nights])
  const balanceDue = useMemo(() => {
    const deposit = Number(formValues.depositCollected) || 0
    return Math.max(0, totalAmount - deposit)
  }, [formValues.depositCollected, totalAmount])

  const roomTypeLabel = roomOverlay?.label || roomOverlay?.type || roomData?.room_type || 'Room'
  const roomDisplay = roomOverlay ? getRoomDisplayLabel(roomOverlay.id, roomOverlay) : roomData?.room || '—'

  const updateValue = (field, value) => {
    setFormValues((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined, form: undefined }))
  }

  const validate = () => {
    const nextErrors = {}
    if (!String(formValues.firstName || '').trim()) nextErrors.firstName = 'First name is required.'
    if (!String(formValues.lastName || '').trim()) nextErrors.lastName = 'Last name is required.'
    if (!String(formValues.email || '').trim()) nextErrors.email = 'Email is required.'
    if (!String(formValues.phone || '').trim()) nextErrors.phone = 'Phone is required.'
    if (!formValues.checkInDate) nextErrors.checkInDate = 'Check-in date is required.'
    if (!formValues.checkOutDate) nextErrors.checkOutDate = 'Check-out date is required.'
    if (formValues.checkInDate && formValues.checkOutDate && nights <= 0) {
      nextErrors.checkOutDate = 'Check-out must be after check-in.'
    }
    if ((Number(formValues.ratePerNight) || 0) < 0) nextErrors.ratePerNight = 'Rate cannot be negative.'
    if ((Number(formValues.depositCollected) || 0) < 0) nextErrors.depositCollected = 'Deposit cannot be negative.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setIsSaving(true)
    try {
      await onSave({
        ...formValues,
        nights,
        totalAmount,
        balanceDue,
      })
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        form: err?.message || 'Unable to save reservation.',
      }))
      setIsSaving(false)
      return
    }
    setIsSaving(false)
  }

  const sectionLabelClass = 'text-xs font-semibold tracking-wide uppercase text-slate-400'
  const inputClass = 'w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/70'
  const labelClass = 'text-xs text-slate-400'
  const required = <span className="text-red-500 ml-0.5">*</span>

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/65 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-xl bg-slate-900 border-l border-white/10 shadow-2xl transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        aria-hidden={!isOpen}
      >
        <form className="h-full flex flex-col" onSubmit={handleSubmit}>
          <div className="px-5 py-4 border-b border-white/10 bg-slate-900/95">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">New Reservation</h2>
                <p className="text-sm text-slate-300 mt-1">
                  Room {roomDisplay} — {roomTypeLabel}
                </p>
              </div>
              <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">
                ×
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
            <section className="space-y-3">
              <h3 className={sectionLabelClass}>Guest Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>First Name{required}</label>
                  <input className={inputClass} value={formValues.firstName} onChange={(e) => updateValue('firstName', e.target.value)} />
                  {errors.firstName && <p className="mt-1 text-xs text-red-400">{errors.firstName}</p>}
                </div>
                <div>
                  <label className={labelClass}>Last Name{required}</label>
                  <input className={inputClass} value={formValues.lastName} onChange={(e) => updateValue('lastName', e.target.value)} />
                  {errors.lastName && <p className="mt-1 text-xs text-red-400">{errors.lastName}</p>}
                </div>
                <div>
                  <label className={labelClass}>Email{required}</label>
                  <input className={inputClass} type="email" value={formValues.email} onChange={(e) => updateValue('email', e.target.value)} />
                  {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
                </div>
                <div>
                  <label className={labelClass}>Phone{required}</label>
                  <input className={inputClass} value={formValues.phone} onChange={(e) => updateValue('phone', e.target.value)} />
                  {errors.phone && <p className="mt-1 text-xs text-red-400">{errors.phone}</p>}
                </div>
                <div>
                  <label className={labelClass}>ID Type</label>
                  <select className={inputClass} value={formValues.idType} onChange={(e) => updateValue('idType', e.target.value)}>
                    <option>Passport</option>
                    <option>Driver&apos;s License</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>ID Number</label>
                  <input className={inputClass} value={formValues.idNumber} onChange={(e) => updateValue('idNumber', e.target.value)} />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className={sectionLabelClass}>Booking Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Check-in Date{required}</label>
                  <input className={inputClass} type="date" value={formValues.checkInDate} onChange={(e) => updateValue('checkInDate', e.target.value)} />
                  {errors.checkInDate && <p className="mt-1 text-xs text-red-400">{errors.checkInDate}</p>}
                </div>
                <div>
                  <label className={labelClass}>Check-out Date{required}</label>
                  <input className={inputClass} type="date" value={formValues.checkOutDate} onChange={(e) => updateValue('checkOutDate', e.target.value)} />
                  {errors.checkOutDate && <p className="mt-1 text-xs text-red-400">{errors.checkOutDate}</p>}
                </div>
                <div>
                  <label className={labelClass}>Number of nights</label>
                  <input className={inputClass} value={nights} readOnly />
                </div>
                <div>
                  <label className={labelClass}>Adults</label>
                  <input className={inputClass} type="number" min="1" value={formValues.adults} onChange={(e) => updateValue('adults', Number(e.target.value))} />
                </div>
                <div>
                  <label className={labelClass}>Children</label>
                  <input className={inputClass} type="number" min="0" value={formValues.children} onChange={(e) => updateValue('children', Number(e.target.value))} />
                </div>
                <div>
                  <label className={labelClass}>Rate per night</label>
                  <input className={inputClass} type="number" min="0" step="0.01" value={formValues.ratePerNight} onChange={(e) => updateValue('ratePerNight', e.target.value)} />
                  {errors.ratePerNight && <p className="mt-1 text-xs text-red-400">{errors.ratePerNight}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Total Amount</label>
                  <input className={inputClass} value={totalAmount.toFixed(2)} readOnly />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className={sectionLabelClass}>Payment</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Deposit Collected</label>
                  <input className={inputClass} type="number" min="0" step="0.01" value={formValues.depositCollected} onChange={(e) => updateValue('depositCollected', e.target.value)} />
                  {errors.depositCollected && <p className="mt-1 text-xs text-red-400">{errors.depositCollected}</p>}
                </div>
                <div>
                  <label className={labelClass}>Payment Method</label>
                  <select className={inputClass} value={formValues.paymentMethod} onChange={(e) => updateValue('paymentMethod', e.target.value)}>
                    <option>Cash</option>
                    <option>Credit Card</option>
                    <option>Debit Card</option>
                    <option>Online</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Balance Due</label>
                  <input className={inputClass} value={balanceDue.toFixed(2)} readOnly />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className={sectionLabelClass}>Extras</h3>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className={labelClass}>Booking Source</label>
                  <select className={inputClass} value={formValues.source} onChange={(e) => updateValue('source', e.target.value)}>
                    <option>Walk-in</option>
                    <option>Phone</option>
                    <option>Booking.com</option>
                    <option>Expedia</option>
                    <option>Airbnb</option>
                    <option>Website</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Special Requests</label>
                  <textarea className={`${inputClass} min-h-[100px]`} value={formValues.specialRequests} onChange={(e) => updateValue('specialRequests', e.target.value)} />
                </div>
              </div>
            </section>
            {errors.form && <p className="text-sm text-red-400">{errors.form}</p>}
          </div>

          <div className="px-5 py-4 border-t border-white/10 flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md border border-white/20 bg-slate-800 text-slate-200 hover:bg-slate-700">
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-semibold disabled:opacity-60">
              {isSaving ? 'Saving...' : 'Save Reservation'}
            </button>
          </div>
        </form>
      </aside>
    </>
  )
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
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Check-out</span>
          <span className="font-medium text-right">{roomData.checkOut || roomData.check_out || '—'}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Priority</span>
          <span className="font-semibold text-right">{roomData.priority || 'LOW'}</span>
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
  blueprintBaseName = 'motel-blueprint.png',
  showRoomNumbers = true,
  showStatusAbbrev = true,
  showStatusDot = true,
  roomFillOpacity = 0.5,
  isInfrastructureCheck,
}) {
  const [imageError, setImageError] = useState(false)
  const [pathIndex, setPathIndex] = useState(0)
  const [loadedDimensions, setLoadedDimensions] = useState(null)
  const BLUEPRINT_PATHS = [`/${blueprintBaseName}`, `/images/${blueprintBaseName}`]
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
            const isInfrastructure = isInfrastructureCheck
              ? isInfrastructureCheck(r)
              : INFRASTRUCTURE_ROOM_IDS.has(r.id) ||
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
            const statusVisual = STATUS_VISUALS[status] || STATUS_VISUALS.available
            const isHovered = hoveredRoom === r.id
            const roomH = r.height ?? 50
            const roomW = r.width ?? 50
            const showStatus = !isInfrastructure && roomH >= 28
            const predMins = roomData?.predictedInMinutes ?? roomData?.predicted_in_minutes
            const predText = predMins != null ? formatPredictionMins(predMins) : null
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
                    <pattern id={`room-pattern-${r.id}`} patternUnits="userSpaceOnUse" width="8" height="8">
                      {status === 'dirty' && (
                        <>
                          <rect width="8" height="8" fill="rgba(255,255,255,0.06)" />
                          <path d="M-2,8 l4,-4 M0,10 l10,-10 M6,10 l4,-4" stroke="rgba(120,53,15,0.45)" strokeWidth="1.2" />
                        </>
                      )}
                      {status === 'reserved' && (
                        <>
                          <rect width="8" height="8" fill="rgba(255,255,255,0.04)" />
                          <circle cx="2" cy="2" r="1.1" fill="rgba(30,58,138,0.45)" />
                          <circle cx="6" cy="6" r="1.1" fill="rgba(30,58,138,0.45)" />
                        </>
                      )}
                      {status === 'maintenance' && (
                        <>
                          <rect width="8" height="8" fill="rgba(17,24,39,0.05)" />
                          <path d="M0,0 L8,8 M8,0 L0,8" stroke="rgba(17,24,39,0.38)" strokeWidth="1" />
                        </>
                      )}
                    </pattern>
                  </defs>
                )}
                <rect
                  x={r.x}
                  y={r.y}
                  width={r.width ?? 50}
                  height={r.height ?? 50}
                  fill={fill}
                  fillOpacity={isInfrastructure ? 0.22 : roomFillOpacity}
                  stroke={isHovered ? '#fff' : isInfrastructure ? 'rgba(148,163,184,0.4)' : 'rgba(15,23,42,0.6)'}
                  strokeWidth={isHovered ? 2.5 : 1}
                  style={{ transition: 'fill 0.35s ease, stroke 0.2s ease' }}
                />
                {!isInfrastructure && (status === 'dirty' || status === 'reserved' || status === 'maintenance') && (
                  <rect
                    x={r.x}
                    y={r.y}
                    width={r.width ?? 50}
                    height={r.height ?? 50}
                    fill={`url(#room-pattern-${r.id})`}
                    fillOpacity={0.9}
                    className="pointer-events-none"
                  />
                )}
                {!isInfrastructure && showStatusDot && (
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
                {showRoomNumbers && (
                  <text
                    x={r.x + roomW - 4}
                    y={r.y + roomH * 0.35}
                    textAnchor="end"
                    className="select-none pointer-events-none"
                    style={{ fontSize: roomW < 45 ? 8 : 10, fill: '#000000', fontWeight: 700 }}
                  >
                    {getRoomDisplayLabel(r.id, r)}
                  </text>
                )}
                {showStatus && showStatusAbbrev && !isInfrastructure && (
                  <>
                    <rect
                      x={r.x + 6}
                      y={r.y + roomH - 18}
                      rx={4}
                      ry={4}
                      width={Math.min(roomW - 10, roomW < 54 ? 26 : 34)}
                      height={12}
                      fill={statusVisual.badgeBg}
                      stroke="rgba(15, 23, 42, 0.35)"
                      strokeWidth={0.7}
                      className="pointer-events-none"
                    />
                    <text
                      x={r.x + 8}
                      y={r.y + roomH - 9}
                      textAnchor="start"
                      className="select-none pointer-events-none"
                      style={{ fontSize: roomH < 50 ? 6.2 : 7, fill: statusVisual.textColor, fontWeight: 800, letterSpacing: 0.2 }}
                    >
                      {statusVisual.label}
                    </text>
                    {roomW >= 54 && (
                      <text
                        x={r.x + roomW - 8}
                        y={r.y + roomH - 9}
                        textAnchor="end"
                        className="select-none pointer-events-none"
                        style={{ fontSize: 6.2, fill: statusVisual.textColor, fontWeight: 700 }}
                      >
                        {statusVisual.icon}
                      </text>
                    )}
                  </>
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
      {!imageError && (
        <div className="absolute top-3 left-3 z-20 rounded-lg bg-slate-900/92 border border-white/15 px-3 py-2 shadow-lg">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Quick Status Key</div>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-100/90 text-emerald-900 font-semibold">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_FILL_COLORS.available }} />
              AVL
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-red-100/90 text-red-900 font-semibold">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_FILL_COLORS.occupied }} />
              OCC
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-amber-100/90 text-amber-900 font-semibold">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_FILL_COLORS.dirty }} />
              DRT
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-blue-100/90 text-blue-900 font-semibold">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_FILL_COLORS.reserved }} />
              RSV
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-200/90 text-slate-900 font-semibold">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_FILL_COLORS.maintenance }} />
              MNT
            </span>
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
          { label: 'Occupancy Rate', value: `${metrics.occupancyRatePct ?? metrics.utilizationPct ?? 0}%` },
        ]}
        onMetricClick={onFilterChange}
        activeFilter={statusFilter}
      />
      <KpiGroupCard
        title="TURNOVER"
        metrics={[
          { label: 'Dirty', value: metrics.dirty, filterKey: 'dirty' },
          { label: 'Reserved', value: metrics.reserved, filterKey: 'reserved' },
          { label: 'Maintenance', value: metrics.maintenance ?? 0, filterKey: 'maintenance' },
          { label: 'Turning Over Today', value: metrics.turningOverToday ?? 0 },
        ]}
        onMetricClick={onFilterChange}
        activeFilter={statusFilter}
      />
    </div>
  )
}

function MotelCommandCenter({
  brandName = 'Gateway Inn - Live Command Center',
  brandSubtitle = 'Real-time operations floor map',
  brandIcon = '🏨',
  storagePrefix = 'motel-floormap',
  blueprintBaseName = 'motel-blueprint.png',
  apiEndpoint = '/api/motel/rooms/status',
  defaultRoomOverlays = ROOM_OVERLAY_COORDINATES,
  defaultBlueprintWidth = BLUEPRINT_DEFAULT_WIDTH,
  defaultBlueprintHeight = BLUEPRINT_DEFAULT_HEIGHT,
  showRoomNumbers = false,
  showStatusAbbrev = true,
  showStatusDot = true,
  roomFillOpacity = 0.5,
  initialCommandCenterMode = false,
  timelineHistory = roomStatusHistory,
  timelineTimeOptions = timelineTimes,
  SidePanelComponent = MotelOperationalAlerts,
  isInfrastructureOverlayFn = null,
  computeRoomMetricsFn = null,
  addMockPredictionsFn = null,
}) {
  const addMock = addMockPredictionsFn ?? defaultAddMockPredictions
  const computeMetrics = computeRoomMetricsFn ?? defaultComputeRoomMetrics

  const checkInfrastructureOverlay = useCallback(
    (overlay) => {
      if (isInfrastructureOverlayFn) return isInfrastructureOverlayFn(overlay)
      return (
        INFRASTRUCTURE_ROOM_IDS.has(overlay.id) ||
        NON_GUEST_ROOM_TYPES.has((overlay.type || '').toLowerCase()) ||
        isInfrastructureByLabel(overlay.label)
      )
    },
    [isInfrastructureOverlayFn]
  )

  const overlaysStorageKey = `${storagePrefix}-overlays`
  const dimensionsStorageKey = `${storagePrefix}-dimensions`
  const manualDimensionsStorageKey = `${storagePrefix}-manual-dimensions`
  const hideAlignmentStorageKey = `${storagePrefix}-hide-alignment`
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
      const saved = localStorage.getItem(overlaysStorageKey)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [customImageDimensions, setCustomImageDimensions] = useState(() => {
    try {
      const saved = localStorage.getItem(dimensionsStorageKey)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [manualDimensions, setManualDimensions] = useState(() => {
    try {
      const saved = localStorage.getItem(manualDimensionsStorageKey)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [hideAlignmentMessage, setHideAlignmentMessage] = useState(() => {
    try {
      return localStorage.getItem(hideAlignmentStorageKey) === 'true'
    } catch {
      return false
    }
  })
  const [roomSearch, setRoomSearch] = useState('')
  const [selectedTime, setSelectedTime] = useState(null)
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false)
  const [dataSourceMode, setDataSourceMode] = useState('api')
  const [commandCenterMode, setCommandCenterMode] = useState(initialCommandCenterMode)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [liveTime, setLiveTime] = useState(() => new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false }))
  const [reservationPanelRoomId, setReservationPanelRoomId] = useState(null)
  const importInputRef = useRef(null)
  const innsoftInputRef = useRef(null)
  const containerRef = useRef(null)
  const fullscreenRef = useRef(null)
  const isDragging = useRef(false)
  const lastPan = useRef({ x: 0, y: 0 })
  const { notify } = useNotification()

  const roomOverlays = useMemo(() => customOverlays ?? defaultRoomOverlays, [customOverlays, defaultRoomOverlays])

  const mapDimensions = useMemo(
    () => ({
      width: manualDimensions?.width ?? customImageDimensions?.width ?? defaultBlueprintWidth,
      height: manualDimensions?.height ?? customImageDimensions?.height ?? defaultBlueprintHeight,
    }),
    [manualDimensions, customImageDimensions, defaultBlueprintHeight, defaultBlueprintWidth]
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

  const resolveOverlayRoomId = useCallback(
    (roomNumber) => {
      const target = canonicalRoomKey(roomNumber)
      if (!target) return roomNumber
      const match = roomOverlays.find((overlay) => {
        const idKey = canonicalRoomKey(overlay.id)
        const labelKey = canonicalRoomKey(getRoomDisplayLabel(overlay.id, overlay))
        return target === idKey || target === labelKey
      })
      return match?.id || roomNumber
    },
    [roomOverlays]
  )

  const handleRoomSearch = useCallback(() => {
    if (roomSearchMatches.length >= 1) zoomToRoom(roomSearchMatches[0].id)
    setRoomSearch('')
  }, [roomSearchMatches, zoomToRoom])

  function getFallbackRoomData(overlays) {
    const statuses = ['available', 'occupied', 'dirty', 'reserved']
    return overlays.map((r, i) => {
      if (checkInfrastructureOverlay(r)) {
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
        roomNumber: r.id,
        status,
        guest_name: isOccupied ? pickGuestForRoom(r.id, i) : isReserved ? 'Incoming' : null,
        guestName: isOccupied ? pickGuestForRoom(r.id, i) : isReserved ? 'Incoming' : null,
        check_in: checkIn,
        checkIn: admitted_at_iso,
        checkOut: null,
        admitted_at_iso,
        priority: status === 'dirty' ? 'HIGH' : 'LOW',
        priorityScore: status === 'dirty' ? 3 : 1,
        updatedAt: new Date().toISOString(),
      }
    })
  }

  const fetchRoomStatus = useCallback(async () => {
    if (dataSourceMode !== 'api') return
    try {
      setLoading(true)
      setError(null)
      let rooms = getFallbackRoomData(roomOverlays)
      try {
        const res = await fetch(apiEndpoint)
        if (res.ok) {
          const json = await res.json()
          const data = json?.data ?? json
          if (Array.isArray(data) && data.length > 0) rooms = data
        }
      } catch (_) {
        // Use fallback when API unavailable
      }
      setRoomData(addMock(Array.isArray(rooms) ? rooms : []).map((r) => ({
        ...r,
        roomNumber: r.roomNumber || r.room,
        guestName: r.guestName || r.guest_name || null,
        checkIn: r.checkIn || r.check_in || null,
        checkOut: r.checkOut || r.check_out || null,
        updatedAt: r.updatedAt || new Date().toISOString(),
      })))
      setLastUpdated(new Date())
    } catch {
      setRoomData(addMock(getFallbackRoomData(roomOverlays)))
      setLastUpdated(new Date())
    } finally {
      setLoading(false)
    }
  }, [apiEndpoint, roomOverlays, dataSourceMode, addMock, checkInfrastructureOverlay])

  useEffect(() => {
    if (dataSourceMode !== 'api') return undefined
    fetchRoomStatus()
    const interval = setInterval(fetchRoomStatus, 15000)
    return () => clearInterval(interval)
  }, [fetchRoomStatus, dataSourceMode])

  const roomStatusMap = useMemo(() => {
    const map = {}
    roomData.forEach((r) => {
      const roomKey = r.room || r.roomNumber
      const numberKey = r.roomNumber || r.room
      if (roomKey) map[roomKey] = r
      if (numberKey) map[numberKey] = r
      const canonicalRoom = canonicalRoomKey(roomKey)
      const canonicalNumber = canonicalRoomKey(numberKey)
      if (canonicalRoom) map[canonicalRoom] = r
      if (canonicalNumber) map[canonicalNumber] = r
    })
    return map
  }, [roomData])

  const roomStatusMapWithTimeline = useMemo(() => {
    const time = selectedTime ?? timelineTimeOptions[0]
    const merged = { ...roomStatusMap }
    if (selectedTime) {
      const snapshot = timelineHistory.find((s) => s.time === selectedTime)
      if (snapshot?.rooms) {
        Object.entries(snapshot.rooms).forEach(([roomId, status]) => {
          merged[roomId] = { ...(merged[roomId] || { room: roomId }), status }
        })
      }
    }
    return merged
  }, [roomStatusMap, selectedTime, timelineHistory, timelineTimeOptions])
  const reservationRoomOverlay = useMemo(
    () => roomOverlays.find((room) => room.id === reservationPanelRoomId) || null,
    [roomOverlays, reservationPanelRoomId]
  )
  const reservationRoomData = reservationPanelRoomId
    ? (
      roomStatusMap[reservationPanelRoomId] ??
      roomStatusMap[canonicalRoomKey(reservationPanelRoomId)] ??
      null
    )
    : null

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
    () => computeMetrics(roomsForMetrics, { roomIdToUnit }),
    [roomsForMetrics, roomIdToUnit, computeMetrics]
  )

  const displayTime = selectedTime ?? timelineTimeOptions[0]
  const activeRoomId = selectedRoom ?? hoveredRoom
  const hoveredRoomData = activeRoomId
    ? (
      roomStatusMapWithTimeline[activeRoomId] ??
      roomStatusMapWithTimeline[canonicalRoomKey(activeRoomId)] ??
      { room: activeRoomId, status: '—', guest_name: null, check_in: null }
    )
    : null
  const handleRoomHover = useCallback((roomId, entering, e) => {
    setHoveredRoom(entering ? roomId : null)
    if (entering && e) setTooltipPos({ x: e.clientX, y: e.clientY })
  }, [])

  const handleRoomClick = useCallback((roomId, e) => {
    setSelectedRoom(roomId)
    if (e) setTooltipPos({ x: e.clientX, y: e.clientY })
    const clickedRoom = roomStatusMap[roomId] ?? roomStatusMap[canonicalRoomKey(roomId)]
    const overlay = roomOverlays.find((r) => r.id === roomId)
    if (!clickedRoom || !overlay) return
    if (checkInfrastructureOverlay(overlay)) return
    if (clickedRoom.status === 'available') {
      setReservationPanelRoomId(roomId)
    }
  }, [checkInfrastructureOverlay, roomOverlays, roomStatusMap])

  const handleSaveReservation = useCallback(async (values) => {
    if (!reservationPanelRoomId) throw new Error('No room selected.')
    const roomNumber = getRoomDisplayLabel(reservationPanelRoomId, reservationRoomOverlay)
    const cleanEmail = String(values.email || '').trim().toLowerCase()
    const cleanFirstName = String(values.firstName || '').trim()
    const cleanLastName = String(values.lastName || '').trim()
    const cleanPhone = String(values.phone || '').trim()
    const cleanSpecialRequests = String(values.specialRequests || '').trim() || null

    const { data: existingGuest, error: guestLookupError } = await supabase
      .from('guests')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle()
    if (guestLookupError) throw guestLookupError

    let guestId = existingGuest?.id
    if (!guestId) {
      const { data: createdGuest, error: createGuestError } = await supabase
        .from('guests')
        .insert({
          first_name: cleanFirstName,
          last_name: cleanLastName,
          email: cleanEmail,
          phone: cleanPhone,
        })
        .select('id')
        .single()
      if (createGuestError) throw createGuestError
      guestId = createdGuest.id
    }

    let { data: roomRecord, error: roomLookupError } = await supabase
      .from('rooms')
      .select('id')
      .eq('room_number', String(roomNumber))
      .single()
    if (roomLookupError || !roomRecord?.id) {
      // Fallback for environments where rooms are keyed by overlay id.
      const fallback = await supabase
        .from('rooms')
        .select('id')
        .eq('room_number', String(reservationPanelRoomId))
        .single()
      roomRecord = fallback.data
      roomLookupError = fallback.error
    }
    if (roomLookupError || !roomRecord?.id) {
      throw new Error(`Room ${roomNumber} was not found in rooms table.`)
    }

    const reservationPayload = {
      room_id: roomRecord.id,
      guest_id: guestId,
      check_in_date: values.checkInDate,
      check_out_date: values.checkOutDate,
      status: 'reserved',
      rate_per_night: Number(values.ratePerNight) || 0,
      total_amount: values.totalAmount,
      paid_amount: Number(values.depositCollected) || 0,
      balance_due: values.balanceDue,
      source: values.source,
      special_requests: cleanSpecialRequests,
    }

    const { error: createReservationError } = await supabase
      .from('reservations')
      .insert(reservationPayload)
    if (createReservationError) throw createReservationError

    const { error: updateRoomError } = await supabase
      .from('rooms')
      .update({ status: 'reserved' })
      .eq('id', roomRecord.id)
    if (updateRoomError) throw updateRoomError

    const guestName = `${cleanFirstName} ${cleanLastName}`.trim()
    setRoomData((prev) => prev.map((room) => {
      if (room.room === reservationPanelRoomId || room.roomNumber === reservationPanelRoomId) {
        return {
          ...room,
          status: 'reserved',
          guest_name: guestName,
          guestName,
          check_in: values.checkInDate,
          checkIn: values.checkInDate,
          check_out: values.checkOutDate,
          checkOut: values.checkOutDate,
          rate_per_night: Number(values.ratePerNight) || 0,
        }
      }
      return room
    }))
    setReservationPanelRoomId(null)
    notify(`Reservation created for ${guestName}!`, 'success')
  }, [notify, reservationPanelRoomId, reservationRoomOverlay])

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
      setSelectedTime(timelineTimeOptions[0])
      setIsTimelinePlaying(true)
      setStatusFilter(null)
    } else setIsTimelinePlaying(false)
  }, [commandCenterMode, timelineTimeOptions])

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
        localStorage.setItem(overlaysStorageKey, JSON.stringify(customOverlays))
      } catch (err) {
        console.warn('Failed to save overlays to localStorage:', err)
      }
    } else {
      localStorage.removeItem(overlaysStorageKey)
    }
  }, [customOverlays, overlaysStorageKey])

  // Persist image dimensions to localStorage
  useEffect(() => {
    if (customImageDimensions) {
      try {
        localStorage.setItem(dimensionsStorageKey, JSON.stringify(customImageDimensions))
      } catch (err) {
        console.warn('Failed to save dimensions to localStorage:', err)
      }
    } else {
      localStorage.removeItem(dimensionsStorageKey)
    }
  }, [customImageDimensions, dimensionsStorageKey])

  // Persist manual dimensions to localStorage
  useEffect(() => {
    if (manualDimensions) {
      try {
        localStorage.setItem(manualDimensionsStorageKey, JSON.stringify(manualDimensions))
      } catch (err) {
        console.warn('Failed to save manual dimensions to localStorage:', err)
      }
    } else {
      localStorage.removeItem(manualDimensionsStorageKey)
    }
  }, [manualDimensions, manualDimensionsStorageKey])

  // Persist hide alignment message preference
  useEffect(() => {
    try {
      if (hideAlignmentMessage) {
        localStorage.setItem(hideAlignmentStorageKey, 'true')
      } else {
        localStorage.removeItem(hideAlignmentStorageKey)
      }
    } catch (err) {
      console.warn('Failed to save alignment message preference:', err)
    }
  }, [hideAlignmentMessage, hideAlignmentStorageKey])

  const handleLoadFloorMapClick = () => importInputRef.current?.click()
  const handleLoadInnsoftClick = () => innsoftInputRef.current?.click()
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

  const handleLoadInnsoftFile = async (e) => {
    const file = e.target?.files?.[0]
    if (!file) return
    try {
      setLoading(true)
      const rows = await parseInnsoftFile(file)
      const normalized = normalizeInnsoftRows(rows, { now: new Date() })
      if (normalized.length === 0) {
        alert('No valid rooms found in file. Please include a "Room Number" column.')
      } else {
        const mappedRows = normalized.map((row) => ({
          ...row,
          room: resolveOverlayRoomId(row.roomNumber),
        }))
        setDataSourceMode('innsoft')
        setRoomData(addMock(mappedRows))
        setLastUpdated(new Date())
      }
    } catch (err) {
      alert(`Could not parse Innsoft file: ${err?.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
      if (e.target) e.target.value = ''
    }
  }

  const handleLoadGatewayDemo = () => {
    const normalized = normalizeInnsoftRows(gatewayInnDemoRows, { now: new Date() })
    const mappedRows = normalized.map((row) => ({
      ...row,
      room: resolveOverlayRoomId(row.roomNumber),
    }))
    setDataSourceMode('demo')
    setRoomData(addMock(mappedRows))
    setLastUpdated(new Date())
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
            <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center text-2xl border border-white/10">{brandIcon}</div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{brandName}</h1>
              <p className="text-sm text-slate-400 mt-0.5">{brandSubtitle}</p>
              <p className="text-xs text-slate-500 mt-1">Data Source: Innsoft Export</p>
              <p className="text-xs text-slate-500">Update Mode: Near Real-Time (CSV / Scheduled)</p>
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
              onClick={handleLoadInnsoftClick}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-cyan-300/30 bg-cyan-900/20 hover:bg-cyan-900/30 text-sm font-semibold transition-colors"
              title="Load Innsoft CSV or Excel export"
            >
              <span>🧾</span>
              Upload Innsoft CSV/XLSX
            </button>
            <input ref={innsoftInputRef} type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={handleLoadInnsoftFile} className="hidden" />
            <button
              type="button"
              onClick={handleLoadGatewayDemo}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-300/30 bg-emerald-900/20 hover:bg-emerald-900/30 text-sm font-semibold transition-colors"
              title="Load demo data for Gateway Inn"
            >
              <span>✨</span>
              Load Gateway Inn Demo
            </button>
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
              onClick={async () => {
                if (dataSourceMode === 'api') {
                  await fetchRoomStatus()
                  return
                }
                setDataSourceMode('api')
                await fetchRoomStatus()
              }}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? 'Refreshing…' : dataSourceMode === 'api' ? 'Refresh' : 'Switch to Live API'}
            </button>
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
                  defaultDimensions={{ width: defaultBlueprintWidth, height: defaultBlueprintHeight }}
                  blueprintBaseName={blueprintBaseName}
                  showRoomNumbers={showRoomNumbers}
                  showStatusAbbrev={showStatusAbbrev}
                  showStatusDot={showStatusDot}
                  roomFillOpacity={roomFillOpacity}
                  isInfrastructureCheck={checkInfrastructureOverlay}
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
          <SidePanelComponent
            selectedTime={displayTime}
            roomOverlays={roomOverlays}
            roomStatusMap={roomStatusMapWithTimeline}
            roomIdToUnit={roomIdToUnit}
            highlightAlerts={commandCenterMode}
            metrics={metrics}
          />
        </div>
        </div>

        <div className={`shrink-0 ${commandCenterMode ? 'py-1' : 'space-y-2'}`}>
          <TimelinePlayback
            times={timelineTimeOptions}
            selectedTime={selectedTime ?? timelineTimeOptions[0]}
            onTimeChange={setSelectedTime}
            isPlaying={isTimelinePlaying}
            onPlayPause={() => { if (!selectedTime) setSelectedTime(timelineTimeOptions[0]); setIsTimelinePlaying((p) => !p) }}
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
          <div className="rounded-lg border border-white/10 bg-slate-800/40 px-4 py-3">
            <span className="text-[10px] text-slate-500">Scroll zoom • Drag pan</span>
          </div>
        )}
      </div>
      <NewReservationPanel
        isOpen={!!reservationPanelRoomId}
        roomOverlay={reservationRoomOverlay}
        roomData={reservationRoomData}
        onClose={() => setReservationPanelRoomId(null)}
        onSave={handleSaveReservation}
      />
    </div>
  )
}

export default MotelCommandCenter
