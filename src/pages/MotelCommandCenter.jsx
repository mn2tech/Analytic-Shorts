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
  INFRASTRUCTURE_ROOM_IDS,
  NON_GUEST_ROOM_TYPES,
  isInfrastructureByLabel,
  computeRoomMetrics as defaultComputeRoomMetrics,
  addMockPredictions as defaultAddMockPredictions,
  assignUnitFromPosition,
} from '../config/motelData'
import { getRoomDisplayLabel } from '../config/motelRoomDisplayLabels'
import { roomStatusHistory, timelineTimes } from '../data/motelRoomStatusHistory'
import LiveStatus from '../components/LiveStatus'
import CommandCenterHeader from '../components/CommandCenterHeader'
import MotelOperationalAlerts from '../components/MotelOperationalAlerts'
import MotelRotatingMetricsPanel from '../components/MotelRotatingMetricsPanel'
import { normalizeInnsoftRows, parseInnsoftFile } from '../utils/innsoftIngestion'
import { gatewayInnDemoRows } from '../data/gatewayInnDemoDataset'
import { supabase } from '../lib/supabase'
import { useNotification } from '../contexts/NotificationContext'

const STATUS_COLORS = ['#22c55e', '#ef4444', '#eab308', '#3b82f6']
const MAP_STATUS_FILL_COLORS = {
  available: '#22c55e',
  occupied: '#ef4444',
  checked_in: '#ef4444',
  reserved: '#3b82f6',
  dirty: '#eab308',
  clean: '#10b981',
  inspected: '#14b8a6',
  out_of_order: '#334155',
  maintenance: '#6b7280',
  blocked: '#475569',
  hold: '#0ea5e9',
  no_show: '#f97316',
  checked_out: '#a78bfa',
  cancelled: '#64748b',
  unavailable: '#6b7280',
}
const DISPLAY_STATUS_LABELS = {
  available: 'Available',
  occupied: 'Occupied',
  checked_in: 'Checked In',
  reserved: 'Reserved',
  dirty: 'Dirty',
  clean: 'Clean',
  inspected: 'Inspected',
  out_of_order: 'Out of Order',
  maintenance: 'Maintenance',
  blocked: 'Blocked',
  hold: 'On Hold',
  no_show: 'No Show',
  checked_out: 'Checked Out',
  cancelled: 'Cancelled',
  unavailable: 'Unavailable',
}
const STATUS_VISUALS = {
  available: { label: 'AVL', icon: 'OK', textColor: '#052E16', badgeBg: 'rgba(220, 252, 231, 0.95)' },
  occupied: { label: 'OCC', icon: 'BED', textColor: '#7F1D1D', badgeBg: 'rgba(254, 226, 226, 0.95)' },
  checked_in: { label: 'OCC', icon: 'BED', textColor: '#7F1D1D', badgeBg: 'rgba(254, 226, 226, 0.95)' },
  dirty: { label: 'DRT', icon: 'CLN', textColor: '#713F12', badgeBg: 'rgba(254, 243, 199, 0.95)' },
  clean: { label: 'CLN', icon: 'OK', textColor: '#064E3B', badgeBg: 'rgba(209, 250, 229, 0.95)' },
  inspected: { label: 'INSP', icon: 'OK', textColor: '#134E4A', badgeBg: 'rgba(204, 251, 241, 0.95)' },
  reserved: { label: 'RSV', icon: 'IN', textColor: '#1E3A8A', badgeBg: 'rgba(219, 234, 254, 0.95)' },
  maintenance: { label: 'MNT', icon: 'FIX', textColor: '#111827', badgeBg: 'rgba(229, 231, 235, 0.95)' },
  out_of_order: { label: 'OOO', icon: 'FIX', textColor: '#0F172A', badgeBg: 'rgba(203, 213, 225, 0.95)' },
  blocked: { label: 'BLK', icon: 'N/A', textColor: '#0F172A', badgeBg: 'rgba(203, 213, 225, 0.95)' },
  hold: { label: 'HLD', icon: 'IN', textColor: '#0C4A6E', badgeBg: 'rgba(186, 230, 253, 0.95)' },
  no_show: { label: 'NS', icon: 'N/A', textColor: '#7C2D12', badgeBg: 'rgba(254, 215, 170, 0.95)' },
  checked_out: { label: 'CO', icon: 'OUT', textColor: '#4C1D95', badgeBg: 'rgba(237, 233, 254, 0.95)' },
  cancelled: { label: 'CXL', icon: 'N/A', textColor: '#334155', badgeBg: 'rgba(226, 232, 240, 0.95)' },
  unavailable: { label: 'UNA', icon: 'N/A', textColor: '#111827', badgeBg: 'rgba(229, 231, 235, 0.95)' },
}
const INNSOFT_TAX_SETTINGS = {
  cityRate: 0.08,
  stateRate: 0.07,
  hotelFlatPerNight: 5,
}
const GATEWAY_INN_RECEIPT_PROFILE = {
  legalName: 'GATEWAY INN - SAVANNAH',
  addressLine1: '11520 ABERCORN ST',
  addressLine2: 'SAVANNAH, GA 31419',
  phone: '912-927-6274',
  email: 'gatewayinnsavannah@gmail.com',
  wifi: 'Guest WIFI',
  wifiPassword: 'Gatewayinn',
}
const GATEWAY_INN_POLICY_LINES = [
  'MANAGEMENT ASSUMES NO RESPONSIBILITY FOR ACCIDENTS, INJURIES, THEFT OR LOSS DUE TO ANY CAUSE.',
  'ONLY REGISTERED GUESTS ARE ALLOWED INSIDE THE ROOMS. NO PETS. NO REFUNDS.',
  'THANK YOU FOR STAYING HERE! WE HOPE YOU HAVE ENJOYED YOUR STAY.',
  'WEEKLY & DAILY GUESTS CANNOT STAY OVER 14 DAYS (2 WEEKS) CONTINUOUSLY FROM THEIR CHECK-IN DATES.',
  'WEEKLY TWICE ROOM FULL SERVICE IS MANDATORY FOR DAILY & WEEKLY GUESTS.',
  'DEPOSITS REQUIRED FOR WEEKLY GUEST: $50 (CASH ONLY).',
  'ONLY REGISTERED GUESTS CAN REQUEST ROOM KEYS WITH A PHYSICAL ID.',
  'PER ADULTS/KIDS: $5.00 EXTRA TOWARDS ROOM RENTS ON DAILY/WEEKLY BASIS.',
  'CHECK-IN TIME: 3:00 PM',
  'CHECK-OUT TIME: 11:00 AM',
  'EARLY CHECK-IN FEE: $20 EXTRA (CASH ONLY).',
]

function calculateInnsoftTaxBreakdown(roomSubtotal, nights = 1) {
  const taxableSubtotal = Math.max(0, Number(roomSubtotal) || 0)
  const taxableNights = Math.max(0, Number(nights) || 0)
  const cityTax = taxableSubtotal * INNSOFT_TAX_SETTINGS.cityRate
  const stateTax = taxableSubtotal * INNSOFT_TAX_SETTINGS.stateRate
  const hotelTax = taxableSubtotal > 0 ? taxableNights * INNSOFT_TAX_SETTINGS.hotelFlatPerNight : 0
  const taxTotal = cityTax + stateTax + hotelTax

  return {
    cityTax,
    stateTax,
    hotelTax,
    taxTotal,
    totalWithTax: taxableSubtotal + taxTotal,
  }
}

function toCents(value) {
  return Math.round((Number(value) || 0) * 100)
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

function formatRoomTypeLabel(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  if (text.toLowerCase().replace(/[\s-]+/g, '_') === 'patient_room') return 'Guest Room'
  return text
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function normalizeRoomStatus(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
  if (!normalized) return 'available'
  if (normalized === 'checkedin') return 'checked_in'
  if (normalized === 'cleaning_pending') return 'dirty'
  if (normalized === 'needs_inspection') return 'dirty'
  if (normalized === 'outoforder') return 'out_of_order'
  if (normalized === 'noshow') return 'no_show'
  if (normalized === 'canceled') return 'cancelled'
  return normalized
}

function makeRemarkEvent({
  reservationId = null,
  guestId = null,
  roomNumber = null,
  type = 'front_desk',
  text = '',
  createdBy = 'Front Desk',
  timestamp = new Date().toISOString(),
}) {
  return {
    id: crypto.randomUUID(),
    reservation_id: reservationId,
    guest_id: guestId,
    room_number: roomNumber,
    note_type: type,
    note_text: text,
    created_by: createdBy,
    created_at: timestamp,
    updated_at: timestamp,
  }
}

function clearGuestContextForAvailableRoom(room, statusOverride = room?.status) {
  if (!room) return room
  const status = normalizeRoomStatus(statusOverride)
  if (status !== 'available') return { ...room, status }
  return {
    ...room,
    status,
    guestName: null,
    guest_name: null,
    guest_id: null,
    checkIn: null,
    check_in: null,
    checkOut: null,
    check_out: null,
    actual_check_in: null,
    actual_check_out: null,
    reservation_id: null,
    bookingSource: null,
    source: null,
    nights: 0,
    totalAmount: 0,
    amountPaid: 0,
    balanceDue: 0,
  }
}

function formatDateDisplay(value) {
  if (!value) return '—'
  const text = String(value).trim()
  // ISO date-only strings parse as UTC in JS; use local calendar day to match DB intent.
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const local = parseDateOnly(text)
    if (local) return local.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function toDateInputValue(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDateOnly(value) {
  const text = String(value || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null
  const [year, month, day] = text.split('-').map(Number)
  const date = new Date(year, month - 1, day, 12, 0, 0)
  return Number.isNaN(date.getTime()) ? null : date
}

function addDays(dateValue, days) {
  const base = dateValue instanceof Date ? dateValue : new Date(dateValue)
  const date = new Date(base.getTime())
  date.setDate(date.getDate() + days)
  return date
}

function dateDiffNights(checkInDate, checkOutDate) {
  if (!checkInDate || !checkOutDate) return 0
  const inDate = parseDateOnly(checkInDate)
  const outDate = parseDateOnly(checkOutDate)
  if (!inDate || !outDate) return 0
  const diffMs = outDate.getTime() - inDate.getTime()
  if (Number.isNaN(diffMs) || diffMs <= 0) return 0
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

function formatCurrency(value) {
  const amount = Number(value) || 0
  return amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}

function formatReceiptDateTime(value) {
  if (!value) return '—'
  const text = String(value).trim()
  // Avoid UTC timezone shifts for date-only strings (YYYY-MM-DD).
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const local = parseDateOnly(text)
    if (local) {
      return local.toLocaleDateString([], {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit',
      })
    }
  }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString([], {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function buildGatewayReceiptHtml({
  roomDisplay,
  guestName,
  checkInDate,
  checkOutDate,
  nights,
  roomSubtotal,
  taxAmount,
  totalAmount,
  creditTotal,
  balanceAmount,
  amountTenderedLabel,
  tenderedTotal,
  changeDue,
  clerkName = 'MCC Front Desk',
  footerNote = '',
  paymentHistory = [],
}) {
  const nowStamp = new Date()
  const policyHtml = GATEWAY_INN_POLICY_LINES.map((line) => `<p>${line}</p>`).join('')
  const tableRowDate = nowStamp.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: '2-digit' })
  const noteHtml = footerNote ? `<p class="center note">${footerNote}</p>` : ''
  const paymentLines = (Array.isArray(paymentHistory) ? paymentHistory : [])
    .map((entry) => {
      const ref = entry?.reference ? ` [${entry.reference}]` : ''
      const kind = entry?.kind === 'refund' ? 'REFUND' : entry?.kind === 'void' ? 'VOID' : 'PAYMENT'
      const amount = formatCurrency(entry?.amount || 0)
      const method = entry?.method || 'N/A'
      const when = formatReceiptDateTime(entry?.timestamp)
      return `<p>${kind}${ref}: ${amount} via ${method} (${when})</p>`
    })
    .join('')
  const paymentHistoryHtml = paymentLines
    ? `<div class="payment-history"><p class="title">Payment History</p>${paymentLines}</div>`
    : ''
  return `
    <!doctype html>
    <html>
    <head>
      <title>Guest Receipt - Room ${roomDisplay}</title>
      <style>
        body { font-family: "Times New Roman", serif; margin: 20px; color: #111; font-size: 12px; line-height: 1.25; }
        .sheet { max-width: 780px; margin: 0 auto; }
        .center { text-align: center; }
        h1 { margin: 0; font-size: 28px; letter-spacing: 0.5px; }
        .hotel-meta { font-size: 11px; margin-top: 2px; }
        .printed { margin-top: 4px; font-size: 11px; }
        .rule { border-top: 1px solid #111; margin: 12px 0; }
        .guest-lines p { margin: 2px 0; }
        .stay-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 14px; margin: 8px 0 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 6px; border: 1px solid #111; }
        th, td { border: 1px solid #111; padding: 5px 6px; text-align: right; }
        th:first-child, td:first-child { text-align: left; }
        .money-summary { margin-top: 10px; text-align: center; }
        .money-summary p { margin: 2px 0; }
        .guest-sign { margin-top: 20px; }
        .guest-sign .line { border-bottom: 1px solid #111; width: 260px; height: 20px; display: inline-block; vertical-align: bottom; }
        .policy { margin-top: 16px; border-top: 1px solid #111; padding-top: 8px; }
        .policy p { margin: 1px 0; text-align: center; font-size: 11px; }
        .note { margin-top: 8px; font-style: italic; }
        .payment-history { margin-top: 10px; border-top: 1px solid #111; padding-top: 6px; }
        .payment-history .title { margin: 0 0 4px; font-weight: 700; text-align: center; }
        .payment-history p { margin: 1px 0; font-size: 11px; text-align: center; }
        .actions { margin-top: 18px; text-align: center; }
        .actions button { padding: 8px 12px; }
        @media print { .actions { display: none; } }
      </style>
    </head>
    <body>
      <div class="sheet">
        <div class="center">
          <h1>${GATEWAY_INN_RECEIPT_PROFILE.legalName}</h1>
          <div class="hotel-meta">${GATEWAY_INN_RECEIPT_PROFILE.addressLine1}</div>
          <div class="hotel-meta">${GATEWAY_INN_RECEIPT_PROFILE.addressLine2}</div>
          <div class="hotel-meta">WIFI NAME: ${GATEWAY_INN_RECEIPT_PROFILE.wifi} - PASSWORD: ${GATEWAY_INN_RECEIPT_PROFILE.wifiPassword}</div>
          <div class="hotel-meta">${GATEWAY_INN_RECEIPT_PROFILE.phone}</div>
          <div class="hotel-meta">${GATEWAY_INN_RECEIPT_PROFILE.email}</div>
          <div class="printed">Printed: ${formatReceiptDateTime(nowStamp)}</div>
        </div>

        <div class="rule"></div>

        <div class="guest-lines">
          <p><strong>${guestName}</strong></p>
          <p>Room: <strong>${roomDisplay}</strong></p>
        </div>

        <div class="stay-grid">
          <div>Check-in: ${formatReceiptDateTime(checkInDate)}</div>
          <div>Check-out: ${formatReceiptDateTime(checkOutDate)}</div>
          <div>Nights: ${nights}</div>
          <div>Clerk: ${clerkName}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Room</th>
              <th>Tax</th>
              <th>Total</th>
              <th>Credit</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${tableRowDate}</td>
              <td>${formatCurrency(roomSubtotal)}</td>
              <td>${formatCurrency(taxAmount)}</td>
              <td>${formatCurrency(totalAmount)}</td>
              <td>${formatCurrency(creditTotal)}</td>
              <td>${formatCurrency(balanceAmount)}</td>
            </tr>
          </tbody>
        </table>

        <div class="money-summary">
          <p>Amount Tendered: ${amountTenderedLabel}</p>
          <p><strong>TOTAL: ${formatCurrency(tenderedTotal)}</strong></p>
          <p>Change: ${formatCurrency(changeDue)}</p>
        </div>
        ${paymentHistoryHtml}

        <p class="center">Check-in time: 3:00 pm &nbsp;&nbsp; Check-out time: 11:00 am</p>
        ${noteHtml}

        <p class="guest-sign">Guest Signature: <span class="line"></span></p>

        <div class="policy">
          ${policyHtml}
        </div>

        <div class="actions">
          <button onclick="window.print()">Print</button>
        </div>
      </div>
    </body>
    </html>
  `
}

function isRlsPolicyError(error) {
  const message = String(error?.message || '').toLowerCase()
  return message.includes('row-level security') || message.includes('violates row-level security policy')
}

function isMissingRelationError(error) {
  const message = String(error?.message || '').toLowerCase()
  return message.includes('does not exist') || message.includes('relation') && message.includes('not found')
}

function nightsStayedSoFar(value) {
  if (!value) return 0
  const text = String(value).trim()
  const start = /^\d{4}-\d{2}-\d{2}$/.test(text) ? parseDateOnly(text) : new Date(value)
  if (!start || Number.isNaN(start.getTime())) return 0
  const now = new Date()
  const diffMs = now.getTime() - start.getTime()
  if (diffMs <= 0) return 0
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

function isTodayDateOnly(value) {
  const parsed = parseDateOnly(value)
  if (!parsed) return false
  const now = new Date()
  return (
    parsed.getFullYear() === now.getFullYear() &&
    parsed.getMonth() === now.getMonth() &&
    parsed.getDate() === now.getDate()
  )
}

function getDefaultRatePerNight(rateValue) {
  const parsed = Number(rateValue)
  if (!Number.isFinite(parsed) || parsed < 0) return '0.00'
  return parsed.toFixed(2)
}

function formatRateFromDigitEntry(rawValue) {
  const digitsOnly = String(rawValue ?? '').replace(/\D/g, '')
  if (!digitsOnly) return '0.00'
  const shifted = Number(digitsOnly) / 100
  return shifted.toFixed(2)
}

function sanitizeUploadFileName(fileName) {
  return String(fileName || 'scan')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '')
}

function appendPaymentEvent(existing, nextEvent) {
  const list = Array.isArray(existing) ? existing : []
  return [...list, nextEvent]
}

function sumPaymentHistory(history) {
  const list = Array.isArray(history) ? history : []
  return list.reduce((sum, entry) => sum + (Number(entry?.amount) || 0), 0)
}

function createPaymentReference(prefix = 'PMT') {
  const rand = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  return `${prefix}-${Date.now().toString().slice(-6)}-${rand}`
}

function makePaymentEvent({ amount, method, timestamp, stage, kind = 'payment', note = '', targetReference = null }) {
  const reference = createPaymentReference(kind === 'refund' ? 'RFD' : kind === 'void' ? 'VOID' : 'PMT')
  return {
    id: reference,
    reference,
    amount: Number(amount) || 0,
    method: method || 'N/A',
    timestamp: timestamp || new Date().toISOString(),
    stage: stage || 'front_desk',
    kind,
    note: String(note || '').trim() || null,
    target_reference: targetReference || null,
  }
}

function mapPaymentsToLedgerHistory(payments) {
  const list = Array.isArray(payments) ? payments : []
  return list.map((payment, idx) => {
    const amount = Number(payment?.amount) || 0
    const kind = amount < 0 ? 'refund' : 'payment'
    const ts = payment?.created_at || new Date().toISOString()
    const ref = `DB-${String(new Date(ts).getTime() || Date.now())}-${idx + 1}`
    return {
      id: ref,
      reference: ref,
      amount,
      method: payment?.payment_method || 'Unknown',
      timestamp: ts,
      stage: 'db_sync',
      kind,
      note: null,
      target_reference: null,
    }
  })
}

function getVoidedReferences(history) {
  const list = Array.isArray(history) ? history : []
  const refs = new Set()
  list.forEach((entry) => {
    if ((entry?.kind || '').toLowerCase() !== 'void') return
    const explicit = String(entry?.target_reference || '').trim()
    if (explicit) {
      refs.add(explicit)
      return
    }
    const note = String(entry?.note || '')
    const match = note.match(/void reference\s+([A-Z]+-\d+-\d+)/i)
    if (match?.[1]) refs.add(match[1])
  })
  return refs
}

function NewReservationPanel({ isOpen, roomOverlay, roomData, onClose, onSave }) {
  const defaultCheckInDate = toDateInputValue(new Date())
  const defaultCheckOutDate = toDateInputValue(addDays(new Date(), 1))
  const defaultRatePerNight = getDefaultRatePerNight(roomData?.rate_per_night ?? roomData?.ratePerNight)
  const [formValues, setFormValues] = useState(() => ({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    idType: "Driver's License",
    idNumber: '',
    checkInDate: defaultCheckInDate,
    checkOutDate: defaultCheckOutDate,
    adults: 1,
    children: 0,
    ratePerNight: defaultRatePerNight,
    depositCollected: 0,
    paymentMethod: 'Cash',
    source: 'Walk-in',
    specialRequests: '',
  }))
  const [errors, setErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [scanFile, setScanFile] = useState(null)

  useEffect(() => {
    if (!isOpen) return
    setFormValues({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      idType: "Driver's License",
      idNumber: '',
      checkInDate: defaultCheckInDate,
      checkOutDate: defaultCheckOutDate,
      adults: 1,
      children: 0,
      ratePerNight: defaultRatePerNight,
      depositCollected: 0,
      paymentMethod: 'Cash',
      source: 'Walk-in',
      specialRequests: '',
    })
    setErrors({})
    setIsSaving(false)
    setScanFile(null)
  }, [defaultCheckInDate, defaultCheckOutDate, defaultRatePerNight, isOpen, roomOverlay?.id])

  const nights = useMemo(
    () => dateDiffNights(formValues.checkInDate, formValues.checkOutDate),
    [formValues.checkInDate, formValues.checkOutDate]
  )
  const totalAmount = useMemo(() => {
    const rate = Number(formValues.ratePerNight) || 0
    const roomSubtotal = nights * rate
    return calculateInnsoftTaxBreakdown(roomSubtotal, nights).totalWithTax
  }, [formValues.ratePerNight, nights])
  const roomSubtotal = useMemo(() => {
    const rate = Number(formValues.ratePerNight) || 0
    return nights * rate
  }, [formValues.ratePerNight, nights])
  const taxBreakdown = useMemo(
    () => calculateInnsoftTaxBreakdown(roomSubtotal, nights),
    [roomSubtotal, nights]
  )
  const balanceDue = useMemo(() => {
    const deposit = Number(formValues.depositCollected) || 0
    return Math.max(0, totalAmount - deposit)
  }, [formValues.depositCollected, totalAmount])

  const roomTypeLabel = formatRoomTypeLabel(roomData?.room_type || roomOverlay?.type || roomOverlay?.label || 'Room')
  const roomDisplay = roomOverlay ? getRoomDisplayLabel(roomOverlay.id, roomOverlay) : roomData?.room || '—'

  const updateValue = (field, value) => {
    setFormValues((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'checkInDate') {
        const inDate = parseDateOnly(value)
        const outDate = parseDateOnly(next.checkOutDate)
        if (inDate && (!outDate || outDate <= inDate)) {
          next.checkOutDate = toDateInputValue(addDays(inDate, 1))
        }
      }
      return next
    })
    setErrors((prev) => ({ ...prev, [field]: undefined, form: undefined }))
  }

  const handleRatePerNightChange = (rawValue) => {
    updateValue('ratePerNight', formatRateFromDigitEntry(rawValue))
  }

  const validate = () => {
    const nextErrors = {}
    if (!String(formValues.firstName || '').trim()) nextErrors.firstName = 'First name is required.'
    if (!String(formValues.lastName || '').trim()) nextErrors.lastName = 'Last name is required.'
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
        roomSubtotal,
        taxBreakdown,
        totalAmount,
        balanceDue,
        idScanFile: scanFile,
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
                  <label className={labelClass}>Email</label>
                  <input className={inputClass} type="email" value={formValues.email} onChange={(e) => updateValue('email', e.target.value)} />
                  {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
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
                  <input className={inputClass} type="date" min={formValues.checkInDate || undefined} value={formValues.checkOutDate} onChange={(e) => updateValue('checkOutDate', e.target.value)} />
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
                  <input
                    className={inputClass}
                    type="text"
                    inputMode="numeric"
                    value={formValues.ratePerNight}
                    onFocus={(e) => e.target.select()}
                    onClick={(e) => e.target.select()}
                    onChange={(e) => handleRatePerNightChange(e.target.value)}
                    onBlur={(e) => updateValue('ratePerNight', formatRateFromDigitEntry(e.target.value))}
                  />
                  {errors.ratePerNight && <p className="mt-1 text-xs text-red-400">{errors.ratePerNight}</p>}
                </div>
                <div>
                  <label className={labelClass}>Room Subtotal</label>
                  <input className={inputClass} value={roomSubtotal.toFixed(2)} readOnly />
                </div>
                <div>
                  <label className={labelClass}>City Tax (8%)</label>
                  <input className={inputClass} value={taxBreakdown.cityTax.toFixed(2)} readOnly />
                </div>
                <div>
                  <label className={labelClass}>State Tax (7%)</label>
                  <input className={inputClass} value={taxBreakdown.stateTax.toFixed(2)} readOnly />
                </div>
                <div>
                  <label className={labelClass}>Hotel Tax ($5/night)</label>
                  <input className={inputClass} value={taxBreakdown.hotelTax.toFixed(2)} readOnly />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Total Amount Incl. Tax</label>
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
                  <label className={labelClass}>Add Scan (ID/Document)</label>
                  <input
                    className={inputClass}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setScanFile(e.target.files?.[0] || null)}
                  />
                  {scanFile && (
                    <p className="mt-1 text-xs text-emerald-300">
                      Selected: {scanFile.name}
                    </p>
                  )}
                </div>
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

function ReservedCheckInPanel({
  isOpen,
  roomOverlay,
  roomData,
  onClose,
  onComplete,
  onCancelReservation,
  onMarkNoShow,
  onAddRemark,
  hotelName = 'Gateway Inn',
}) {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [checklist, setChecklist] = useState({
    idVerified: false,
    paymentVerified: false,
    keyIssued: false,
    requestsShared: false,
  })
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [amountReceived, setAmountReceived] = useState('')
  const [remarkType, setRemarkType] = useState('front_desk')
  const [remarkText, setRemarkText] = useState('')

  useEffect(() => {
    if (!isOpen) return
    const seededBalance = Math.max(
      0,
      Number(
        roomData?.balanceDue ??
        ((Number(roomData?.totalAmount) || 0) - (Number(roomData?.amountPaid ?? roomData?.depositCollected) || 0))
      ) || 0
    )
    setChecklist({
      idVerified: false,
      paymentVerified: false,
      keyIssued: false,
      requestsShared: false,
    })
    setPaymentMethod('Cash')
    setAmountReceived(seededBalance > 0 ? seededBalance.toFixed(2) : '')
    setRemarkType('front_desk')
    setRemarkText('')
    setError('')
    setIsSaving(false)
  }, [isOpen, roomData?.amountPaid, roomData?.balanceDue, roomData?.depositCollected, roomData?.totalAmount, roomOverlay?.id])

  const roomTypeLabel = roomOverlay?.label || roomOverlay?.type || roomData?.room_type || 'Room'
  const roomDisplay = roomOverlay ? getRoomDisplayLabel(roomOverlay.id, roomOverlay) : roomData?.room || '—'
  const guestName = roomData?.guestName || roomData?.guest_name || 'Guest not assigned'
  const source = roomData?.bookingSource || roomData?.source || '—'
  const checkInDate = roomData?.checkIn || roomData?.check_in
  const checkOutDate = roomData?.checkOut || roomData?.check_out
  const nights = roomData?.nights ?? dateDiffNights(checkInDate, checkOutDate)
  const ratePerNight = Number(roomData?.rate_per_night ?? roomData?.ratePerNight ?? 0) || 0
  const roomSubtotalFromState = Number(roomData?.roomSubtotal ?? roomData?.room_subtotal)
  const computedRoomSubtotal = nights * ratePerNight
  const roomSubtotal = Number.isNaN(roomSubtotalFromState) ? computedRoomSubtotal : roomSubtotalFromState
  const taxBreakdown = calculateInnsoftTaxBreakdown(roomSubtotal, nights)
  const totalAmount = Number(roomData?.totalAmount ?? taxBreakdown.totalWithTax) || 0
  const taxAmount = Math.max(0, totalAmount - roomSubtotal)
  const amountPaid = Number(roomData?.amountPaid ?? roomData?.depositCollected ?? 0) || 0
  const balanceDue = Math.max(0, Number(roomData?.balanceDue ?? totalAmount - amountPaid) || 0)
  const amountReceivedNumber = Number(amountReceived) || 0
  const changeDue = paymentMethod === 'Cash' ? Math.max(0, amountReceivedNumber - balanceDue) : 0
  const balanceDueCents = toCents(balanceDue)
  const amountReceivedCents = toCents(amountReceivedNumber)
  const checklistComplete = Object.values(checklist).every(Boolean)
  const hasBalanceDue = balanceDue > 0
  const hasSufficientPayment = !hasBalanceDue || amountReceivedCents >= balanceDueCents
  const canSubmit = checklistComplete && hasSufficientPayment && !isSaving
  const idScanUrl = roomData?.id_scan_url || null
  const idScanDisplayName = roomData?.id_scan_name || 'Scanned ID / document'
  const paymentHistory = Array.isArray(roomData?.payment_history) ? roomData.payment_history : []

  const printCheckInReceipt = (receiptWindow) => {
    const targetWindow = receiptWindow || window.open('', '_blank', 'width=900,height=700')
    if (!targetWindow) return
    const paymentCollected = balanceDue > 0 ? balanceDue : 0
    const totalPayments = amountPaid + paymentCollected
    const remainingBalance = Math.max(0, totalAmount - totalPayments)
    const paymentsLabel = paymentCollected > 0 ? `${formatCurrency(paymentCollected)} / ${paymentMethod}` : 'No payment collected'
    const paymentHistoryForReceipt = paymentCollected > 0
      ? appendPaymentEvent(paymentHistory, makePaymentEvent({
        amount: paymentCollected,
        method: paymentMethod,
        timestamp: new Date().toISOString(),
        stage: 'check_in',
      }))
      : paymentHistory
    const html = buildGatewayReceiptHtml({
      roomDisplay,
      guestName,
      checkInDate,
      checkOutDate,
      nights,
      roomSubtotal,
      taxAmount,
      totalAmount,
      creditTotal: totalPayments,
      balanceAmount: remainingBalance,
      amountTenderedLabel: paymentsLabel,
      tenderedTotal: paymentCollected,
      changeDue,
      paymentHistory: paymentHistoryForReceipt,
    })
    targetWindow.document.open()
    targetWindow.document.write(html)
    targetWindow.document.close()
  }

  const handleSubmit = async () => {
    if (!checklistComplete) {
      setError('Complete all pre check-in checklist items before continuing.')
      return
    }
    if (!hasSufficientPayment) {
      setError('Amount received must cover the full balance due.')
      return
    }
    const receiptWindow = window.open('', '_blank', 'width=900,height=700')
    if (receiptWindow) {
      receiptWindow.document.write('<p style="font-family: Arial, sans-serif; padding: 24px;">Preparing check-in receipt...</p>')
    }
    setError('')
    setIsSaving(true)
    try {
      await onComplete({
        balanceDue,
        paymentMethod,
        amountReceived: amountReceivedNumber,
      })
      printCheckInReceipt(receiptWindow)
    } catch (err) {
      receiptWindow?.close()
      setError(err?.message || 'Unable to complete check-in.')
      setIsSaving(false)
      return
    }
    setIsSaving(false)
  }

  const handleAddRemark = async () => {
    if (!onAddRemark) return
    const note = String(remarkText || '').trim()
    if (!note) {
      setError('Enter a remark before saving.')
      return
    }
    setError('')
    try {
      await onAddRemark({
        roomId: roomData?.room || roomDisplay,
        noteType: remarkType,
        noteText: note,
      })
      setRemarkText('')
    } catch (err) {
      setError(err?.message || 'Unable to add remark.')
    }
  }

  const handleCancel = async () => {
    if (!onCancelReservation) return
    const reason = window.prompt('Enter cancellation reason (required):', '')
    if (!reason || !String(reason).trim()) return
    const feeInput = window.prompt('Cancellation fee (optional, default 0.00):', '0.00')
    const fee = Number(feeInput || 0) || 0
    try {
      await onCancelReservation({ roomId: roomData?.room || roomDisplay, reason: String(reason).trim(), fee })
    } catch (err) {
      setError(err?.message || 'Unable to cancel reservation.')
    }
  }

  const handleNoShow = async () => {
    if (!onMarkNoShow) return
    const reason = window.prompt('Enter no-show note (optional):', '') || ''
    try {
      await onMarkNoShow({ roomId: roomData?.room || roomDisplay, reason: String(reason).trim() })
    } catch (err) {
      setError(err?.message || 'Unable to mark no-show.')
    }
  }

  const toggleChecklist = (key) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }))
    setError('')
  }

  const checklistItems = [
    { key: 'idVerified', label: 'Guest ID verified and matches reservation' },
    { key: 'paymentVerified', label: 'Payment collected or card on file' },
    { key: 'keyIssued', label: 'Room key issued to guest' },
    { key: 'requestsShared', label: 'Special requests communicated to guest' },
  ]

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
        <div className="h-full flex flex-col">
          <div className="px-5 py-4 border-b border-white/10 bg-slate-900/95">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Check In Guest</h2>
                <p className="text-sm text-slate-300 mt-1">
                  Room {roomDisplay} — {roomTypeLabel}
                </p>
              </div>
              <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">
                ×
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            <section className="rounded-lg border border-white/10 bg-slate-800/70 p-4 space-y-3">
              <p className="text-xs font-semibold tracking-wide uppercase text-slate-400">Reservation Summary</p>
              <p className="text-2xl font-bold text-white">{guestName}</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p className="text-slate-400">Booking Source</p><p className="text-right text-white">{source}</p>
                <p className="text-slate-400">Check-in Date</p><p className="text-right text-white">{formatDateDisplay(checkInDate)}</p>
                <p className="text-slate-400">Check-out Date</p><p className="text-right text-white">{formatDateDisplay(checkOutDate)}</p>
                <p className="text-slate-400">Number of nights</p><p className="text-right text-white">{nights}</p>
                <p className="text-slate-400">Rate per night</p><p className="text-right text-white">{formatCurrency(ratePerNight)}</p>
                <p className="text-slate-400">Room subtotal</p><p className="text-right text-white">{formatCurrency(roomSubtotal)}</p>
                <p className="text-slate-400">Tax</p><p className="text-right text-white">{formatCurrency(taxAmount)}</p>
                <p className="text-slate-400">Total amount due</p><p className="text-right text-white">{formatCurrency(totalAmount)}</p>
                <p className="text-slate-400">Amount already paid</p><p className="text-right text-white">{formatCurrency(amountPaid)}</p>
                <p className="text-slate-200 font-semibold">Balance remaining</p>
                <p className={`text-right font-semibold ${balanceDue > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {formatCurrency(balanceDue)}
                </p>
              </div>
            </section>

            {idScanUrl && (
              <section className="rounded-lg border border-cyan-400/25 bg-cyan-950/30 p-4 space-y-3">
                <p className="text-xs font-semibold tracking-wide uppercase text-slate-400">Guest scan on file</p>
                <p className="text-sm text-cyan-100 truncate" title={idScanDisplayName}>{idScanDisplayName}</p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={idScanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-3 py-2 rounded-md bg-cyan-700/80 hover:bg-cyan-600 text-white text-sm font-semibold"
                  >
                    View scan
                  </a>
                  <a
                    href={idScanUrl}
                    download={typeof idScanDisplayName === 'string' ? idScanDisplayName : undefined}
                    className="inline-flex items-center justify-center px-3 py-2 rounded-md border border-cyan-400/40 bg-slate-800 hover:bg-slate-700 text-cyan-100 text-sm font-semibold"
                  >
                    Download
                  </a>
                </div>
              </section>
            )}

            <section className="space-y-3">
              <p className="text-xs font-semibold tracking-wide uppercase text-slate-400">Pre Check-In Checklist</p>
              <div className="space-y-2">
                {checklistItems.map((item) => (
                  <label key={item.key} className="flex items-center gap-3 rounded-md border border-white/10 bg-slate-800/60 px-3 py-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist[item.key]}
                      onChange={() => toggleChecklist(item.key)}
                      className="h-4 w-4 accent-emerald-500"
                    />
                    <span className={`${checklist[item.key] ? 'text-emerald-400' : 'text-slate-200'}`}>
                      {checklist[item.key] ? '✓ ' : ''}{item.label}
                    </span>
                  </label>
                ))}
              </div>
            </section>

            {paymentHistory.length > 0 && (
              <section className="rounded-lg border border-emerald-500/25 bg-emerald-900/10 p-4 space-y-2">
                <p className="text-xs font-semibold tracking-wide uppercase text-slate-400">Payment activity</p>
                <div className="space-y-1 text-sm">
                  {paymentHistory.map((entry, idx) => (
                    <p key={`${entry.timestamp || idx}-${entry.amount || 0}`}>
                      <span className="text-emerald-300 font-semibold">{formatCurrency(entry.amount)}</span>
                      <span className="text-slate-300"> via {entry.method || 'Unknown'}</span>
                      {entry.reference && <span className="text-slate-400"> [{entry.reference}]</span>}
                      <span className="text-slate-400"> ({formatReceiptDateTime(entry.timestamp)})</span>
                    </p>
                  ))}
                </div>
              </section>
            )}

            {balanceDue > 0 && (
              <section className="space-y-3 rounded-lg border border-red-500/20 bg-slate-800/65 p-4">
                <p className="text-xs font-semibold tracking-wide uppercase text-slate-400">Payment</p>
                <p className="text-lg font-semibold text-red-400">Amount due: {formatCurrency(balanceDue)}</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400">Payment Method</label>
                    <select
                      className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/70"
                      value={paymentMethod}
                      onChange={(e) => {
                        setPaymentMethod(e.target.value)
                        setError('')
                      }}
                    >
                      <option>Cash</option>
                      <option>Credit Card</option>
                      <option>Debit Card</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Amount Received</label>
                    <input
                      className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/70"
                      type="number"
                      min="0"
                      step="0.01"
                      value={amountReceived}
                      onFocus={(e) => e.target.select()}
                      onClick={(e) => e.target.select()}
                      onChange={(e) => {
                        setAmountReceived(e.target.value)
                        setError('')
                      }}
                    />
                  </div>
                  <p className="text-sm text-slate-200">
                    Change due: <span className="font-semibold text-emerald-400">{formatCurrency(changeDue)}</span>
                  </p>
                  {!hasSufficientPayment && (
                    <p className="text-sm text-red-400">Amount received must cover the full balance due.</p>
                  )}
                </div>
              </section>
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}
            <section className="rounded-lg border border-cyan-400/25 bg-cyan-950/20 p-4 space-y-2">
              <p className="text-xs font-semibold tracking-wide uppercase text-slate-400">Guest Remarks</p>
              <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr_auto] gap-2">
                <select
                  className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
                  value={remarkType}
                  onChange={(e) => setRemarkType(e.target.value)}
                >
                  <option value="front_desk">Front Desk</option>
                  <option value="housekeeping">Housekeeping</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="billing">Billing</option>
                  <option value="vip">VIP</option>
                  <option value="complaint">Complaint</option>
                  <option value="preference">Preference</option>
                  <option value="internal">Internal</option>
                </select>
                <input
                  className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
                  placeholder="Add note..."
                  value={remarkText}
                  onChange={(e) => setRemarkText(e.target.value)}
                />
                <button type="button" onClick={handleAddRemark} className="px-3 py-2 rounded-md bg-cyan-700/85 hover:bg-cyan-600 text-white text-sm font-semibold">
                  Add
                </button>
              </div>
            </section>
          </div>

          <div className="px-5 py-4 border-t border-white/10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button type="button" onClick={handleNoShow} className="px-4 py-3 rounded-md border border-amber-400/40 bg-slate-800 hover:bg-slate-700 text-amber-100 font-semibold">
                Mark No-Show
              </button>
              <button type="button" onClick={handleCancel} className="px-4 py-3 rounded-md bg-rose-700/90 hover:bg-rose-600 text-white font-semibold">
                Cancel Reservation
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`px-4 py-3 rounded-md text-white font-semibold transition-colors ${canSubmit ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-600 cursor-not-allowed text-slate-300'}`}
              >
                {isSaving ? 'Completing Check-In...' : 'Complete Check-In'}
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

function OccupiedRoomPanel({
  isOpen,
  roomOverlay,
  roomData,
  onClose,
  onCompleteCheckout,
  onAppendPaymentEntry,
  onTransferGuest,
  transferCandidates = [],
}) {
  const [isCheckoutMode, setIsCheckoutMode] = useState(false)
  const [isTransferMode, setIsTransferMode] = useState(false)
  const [isTransferConfirmOpen, setIsTransferConfirmOpen] = useState(false)
  const [transferRoomTypeFilter, setTransferRoomTypeFilter] = useState('all')
  const [transferFloorFilter, setTransferFloorFilter] = useState('all')
  const [transferSelectedRoomId, setTransferSelectedRoomId] = useState('')
  const [transferReason, setTransferReason] = useState('')
  const [transferManagerOverride, setTransferManagerOverride] = useState(false)
  const [transferApprover, setTransferApprover] = useState('')
  const [transferApplyRateChange, setTransferApplyRateChange] = useState(false)
  const [transferNewRate, setTransferNewRate] = useState('')
  const [extraCharges, setExtraCharges] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [amountReceived, setAmountReceived] = useState('')
  const [waiveBalance, setWaiveBalance] = useState(false)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundNote, setRefundNote] = useState('')
  const [voidTargetReference, setVoidTargetReference] = useState('')
  const [voidNote, setVoidNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const roomTypeLabel = roomOverlay?.label || roomOverlay?.type || roomData?.room_type || 'Room'
  const roomDisplay = roomOverlay ? getRoomDisplayLabel(roomOverlay.id, roomOverlay) : roomData?.room || '—'
  const guestName = roomData?.guestName || roomData?.guest_name || '—'
  const checkInDate = roomData?.actual_check_in || roomData?.checkIn || roomData?.check_in
  const checkOutDate = roomData?.checkOut || roomData?.check_out
  const stayed = nightsStayedSoFar(checkInDate)
  const nights = Math.max(1, roomData?.nights ?? dateDiffNights(checkInDate, checkOutDate) ?? stayed ?? 1)
  const ratePerNight = Number(roomData?.rate_per_night ?? roomData?.ratePerNight ?? 0) || 0
  const roomChargeSubtotalFromState = Number(roomData?.roomSubtotal ?? roomData?.room_subtotal)
  const computedRoomChargeTotal = nights * ratePerNight
  const roomChargeTotal = Number.isNaN(roomChargeSubtotalFromState) ? computedRoomChargeTotal : roomChargeSubtotalFromState
  const displayRatePerNight = (ratePerNight > 0)
    ? ratePerNight
    : (nights > 0 ? (roomChargeTotal / nights) : 0)
  const taxBreakdown = calculateInnsoftTaxBreakdown(roomChargeTotal, nights)
  const paymentHistory = Array.isArray(roomData?.payment_history) ? roomData.payment_history : []
  const ledgerNetPaid = sumPaymentHistory(paymentHistory)
  const hasPaymentHistory = paymentHistory.length > 0
  const depositsPaid = hasPaymentHistory
    ? ledgerNetPaid
    : Number(roomData?.amountPaid ?? roomData?.depositCollected ?? 0) || 0
  const extraChargesTotal = extraCharges.reduce((sum, charge) => sum + (Number(charge.amount) || 0), 0)
  const totalCharges = roomChargeTotal + taxBreakdown.taxTotal + extraChargesTotal
  const balanceBeforePayment = Math.max(0, totalCharges - depositsPaid)
  const amountReceivedNumber = Number(amountReceived) || 0
  const balanceBeforePaymentCents = toCents(balanceBeforePayment)
  const amountReceivedCents = toCents(amountReceivedNumber)
  const effectivePaymentCents = Math.min(balanceBeforePaymentCents, amountReceivedCents)
  const effectivePayment = effectivePaymentCents / 100
  const remainingBalanceCents = Math.max(0, balanceBeforePaymentCents - effectivePaymentCents)
  const remainingBalance = remainingBalanceCents / 100
  const changeDue = paymentMethod === 'Cash' ? Math.max(0, amountReceivedNumber - balanceBeforePayment) : 0
  const canCompleteCheckout = !isSaving && (remainingBalanceCents === 0 || waiveBalance)
  const voidedReferences = getVoidedReferences(paymentHistory)
  const voidablePaymentEntries = paymentHistory.filter((entry) => {
    const amount = Number(entry?.amount) || 0
    const reference = String(entry?.reference || '').trim()
    return (entry?.kind || 'payment') === 'payment' && amount > 0 && reference && !voidedReferences.has(reference)
  })
  const transferCandidateRooms = transferCandidates
    .filter((room) => room.id !== roomDisplay && room.id !== roomData?.room)
    .filter((room) => transferRoomTypeFilter === 'all' || (String(room.room_type || '').toLowerCase() === transferRoomTypeFilter))
    .filter((room) => transferFloorFilter === 'all' || String(room.unit || '').toLowerCase() === transferFloorFilter)
  const selectedTransferRoom = transferCandidateRooms.find((room) => String(room.id) === String(transferSelectedRoomId)) || null
  const transferCurrentRate = Number(ratePerNight) || 0
  const transferCandidateRate = selectedTransferRoom
    ? Number(selectedTransferRoom.rate_per_night ?? selectedTransferRoom.ratePerNight ?? transferCurrentRate) || 0
    : transferCurrentRate
  const transferEffectiveRate = transferApplyRateChange
    ? Number(transferNewRate || 0) || 0
    : transferCandidateRate
  const transferRateDiff = transferEffectiveRate - transferCurrentRate
  const transferStatus = String(selectedTransferRoom?.status || '').toLowerCase()
  const transferTargetBlocked = !!selectedTransferRoom && ['occupied', 'checked_in', 'maintenance', 'out_of_order', 'unavailable'].includes(transferStatus)
  const transferTargetNeedsOverride = !!selectedTransferRoom && ['dirty', 'maintenance', 'out_of_order', 'unavailable'].includes(transferStatus)
  const canSubmitTransfer = !isSaving &&
    !!selectedTransferRoom &&
    !!String(transferReason || '').trim() &&
    (!transferTargetBlocked || transferManagerOverride) &&
    (!transferTargetNeedsOverride || transferManagerOverride) &&
    (!transferManagerOverride || !!String(transferApprover || '').trim())

  useEffect(() => {
    if (!isOpen) return
    setIsCheckoutMode(false)
    setIsTransferMode(false)
    setIsTransferConfirmOpen(false)
    setTransferRoomTypeFilter('all')
    setTransferFloorFilter('all')
    setTransferSelectedRoomId('')
    setTransferReason('')
    setTransferManagerOverride(false)
    setTransferApprover('')
    setTransferApplyRateChange(false)
    setTransferNewRate('')
    setExtraCharges([])
    setPaymentMethod('Cash')
    setAmountReceived(balanceBeforePayment > 0 ? balanceBeforePayment.toFixed(2) : '')
    setWaiveBalance(false)
    setRefundAmount('')
    setRefundNote('')
    setVoidTargetReference('')
    setVoidNote('')
    setIsSaving(false)
    setError('')
  }, [balanceBeforePayment, isOpen, roomOverlay?.id])

  const chargeOptions = ['Parking', 'Room Service', 'Minibar', 'Laundry', 'Pet Fee', 'Damages', 'Other']
  const addCharge = () => {
    setExtraCharges((prev) => [...prev, { id: crypto.randomUUID(), category: 'Parking', customDescription: '', amount: '' }])
  }

  const updateCharge = (id, field, value) => {
    setExtraCharges((prev) => prev.map((charge) => (charge.id === id ? { ...charge, [field]: value } : charge)))
  }

  const deleteCharge = (id) => {
    setExtraCharges((prev) => prev.filter((charge) => charge.id !== id))
  }

  const getChargeDescription = (charge) => {
    if (charge.category !== 'Other') return charge.category
    return String(charge.customDescription || '').trim() || 'Other'
  }

  const addLedgerEntry = async (kind) => {
    if (!onAppendPaymentEntry || !roomOverlay?.id) return
    if (kind === 'refund') {
      const amt = Number(refundAmount) || 0
      if (amt <= 0) {
        setError('Refund amount must be greater than zero.')
        return
      }
      if (amt > Math.max(0, depositsPaid)) {
        setError(`Refund cannot exceed collected amount (${formatCurrency(Math.max(0, depositsPaid))}).`)
        return
      }
      await onAppendPaymentEntry(roomOverlay.id, makePaymentEvent({
        amount: -Math.abs(amt),
        method: paymentMethod,
        timestamp: new Date().toISOString(),
        stage: 'checkout_adjustment',
        kind: 'refund',
        note: refundNote,
      }))
      setRefundAmount('')
      setRefundNote('')
      setError('')
      return
    }

    const target = voidablePaymentEntries.find((entry) => entry.reference === voidTargetReference)
    if (!target) {
      setError('Select a payment reference to void.')
      return
    }
    if (voidedReferences.has(target.reference)) {
      setError('That payment reference has already been voided.')
      return
    }
    await onAppendPaymentEntry(roomOverlay.id, makePaymentEvent({
      amount: -(Math.abs(Number(target.amount) || 0)),
      method: target.method || paymentMethod,
      timestamp: new Date().toISOString(),
      stage: 'checkout_adjustment',
      kind: 'void',
      note: voidNote || `Void reference ${target.reference || 'unknown'}`,
      targetReference: target.reference || null,
    }))
    setVoidTargetReference('')
    setVoidNote('')
    setError('')
  }

  const handleTransferSubmit = async () => {
    if (!onTransferGuest) return
    if (!canSubmitTransfer || !selectedTransferRoom) {
      setError('Select an eligible room and enter transfer reason.')
      return
    }
    setError('')
    setIsSaving(true)
    try {
      await onTransferGuest({
        fromRoomId: roomData?.room || roomDisplay,
        toRoomId: selectedTransferRoom.id,
        reason: String(transferReason || '').trim(),
        managerOverride: transferManagerOverride,
        approver: String(transferApprover || '').trim() || null,
        applyRateChange: transferApplyRateChange,
        newRatePerNight: transferEffectiveRate,
      })
      setIsTransferConfirmOpen(false)
      setIsTransferMode(false)
    } catch (err) {
      setError(err?.message || 'Unable to transfer guest.')
    }
    setIsSaving(false)
  }

  const handleComplete = async () => {
    if (!canCompleteCheckout) return
    const receiptWindow = window.open('', '_blank', 'width=900,height=700')
    if (receiptWindow) {
      receiptWindow.document.write('<p style="font-family: Arial, sans-serif; padding: 24px;">Preparing check-out receipt...</p>')
    }
    setError('')
    setIsSaving(true)
    try {
      const checkoutDate = new Date().toISOString()
      const cleanedCharges = extraCharges
        .map((charge) => ({
          description: getChargeDescription(charge),
          amount: Number(charge.amount) || 0,
        }))
        .filter((charge) => charge.amount > 0 && charge.description)
      const waivedAmount = remainingBalance > 0 && waiveBalance ? remainingBalance : 0
      const checkoutTotalCredits = depositsPaid + effectivePayment + waivedAmount
      const checkoutBalanceShown = Math.max(0, totalCharges - checkoutTotalCredits)
      const tenderedLabel = effectivePayment > 0 ? `${formatCurrency(effectivePayment)} / ${paymentMethod}` : 'No payment collected'
      const footerNote = waivedAmount > 0
        ? `Manager override applied: ${formatCurrency(waivedAmount)} waived at checkout.`
        : ''
      const checkoutPaymentEvent = (Number(effectivePayment) || 0) > 0
        ? makePaymentEvent({
          amount: Number(effectivePayment) || 0,
          method: paymentMethod,
          timestamp: checkoutDate,
          stage: 'check_out',
        })
        : null
      const receiptSnapshot = {
        roomDisplay,
        guestName,
        checkInDate,
        checkOutDate: checkoutDate,
        nights,
        roomSubtotal: roomChargeTotal + extraChargesTotal,
        taxAmount: taxBreakdown.taxTotal,
        totalAmount: totalCharges,
        creditTotal: checkoutTotalCredits,
        balanceAmount: checkoutBalanceShown,
        amountTenderedLabel: tenderedLabel,
        tenderedTotal: effectivePayment,
        changeDue,
        footerNote,
        paymentHistory: checkoutPaymentEvent ? appendPaymentEvent(paymentHistory, checkoutPaymentEvent) : paymentHistory,
      }
      await onCompleteCheckout({
        checkoutDate,
        extraCharges: cleanedCharges,
        paymentMethod,
        paymentAmount: effectivePayment,
        waiveBalance: remainingBalance > 0 && waiveBalance,
        receiptSnapshot,
        checkoutPaymentEvent,
      })
      const html = buildGatewayReceiptHtml(receiptSnapshot)
      if (receiptWindow) {
        receiptWindow.document.open()
        receiptWindow.document.write(html)
        receiptWindow.document.close()
      }
      setIsSaving(false)
    } catch (err) {
      receiptWindow?.close()
      setError(err?.message || 'Unable to complete check-out.')
      setIsSaving(false)
    }
  }

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
        <div className="h-full flex flex-col">
          <div className="px-5 py-4 border-b border-white/10 bg-slate-900/95">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {isTransferMode
                    ? `Move Guest — Room ${roomDisplay}`
                    : isCheckoutMode
                      ? `Check Out — Room ${roomDisplay}`
                      : 'Current Stay'}
                </h2>
                <p className="text-sm text-slate-300 mt-1">
                  Room {roomDisplay}{roomTypeLabel && roomTypeLabel !== roomDisplay ? ` — ${roomTypeLabel}` : ''}
                </p>
              </div>
              <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">
                ×
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {isTransferMode ? (
              <section className="rounded-lg border border-cyan-400/30 bg-slate-800/70 p-4 space-y-3">
                <p className="text-xl font-semibold text-white">Transfer Active Stay</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p className="text-slate-400">Guest</p><p className="text-right text-white">{guestName}</p>
                  <p className="text-slate-400">From Room</p><p className="text-right text-white">{roomDisplay}</p>
                  <p className="text-slate-400">Checkout date</p><p className="text-right text-white">{formatDateDisplay(checkOutDate)}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
                    value={transferRoomTypeFilter}
                    onChange={(e) => setTransferRoomTypeFilter(e.target.value)}
                  >
                    <option value="all">All room types</option>
                    {[...new Set((transferCandidates || []).map((r) => String(r.room_type || '').toLowerCase()).filter(Boolean))]
                      .map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                  <select
                    className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
                    value={transferFloorFilter}
                    onChange={(e) => setTransferFloorFilter(e.target.value)}
                  >
                    <option value="all">All floors/units</option>
                    {[...new Set((transferCandidates || []).map((r) => String(r.unit || '').toLowerCase()).filter(Boolean))]
                      .map((unit) => <option key={unit} value={unit}>{unit.toUpperCase()}</option>)}
                  </select>
                </div>
                <select
                  className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
                  value={transferSelectedRoomId}
                  onChange={(e) => setTransferSelectedRoomId(e.target.value)}
                >
                  <option value="">Select target room</option>
                  {transferCandidateRooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.id} - {(room.status || 'available').toUpperCase()} - {(room.room_type || 'Room')}
                    </option>
                  ))}
                </select>
                <textarea
                  className="w-full min-h-[90px] rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
                  placeholder="Transfer reason (guest request, maintenance issue, upgrade, etc.)"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                />
                <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-amber-500"
                    checked={transferApplyRateChange}
                    onChange={(e) => setTransferApplyRateChange(e.target.checked)}
                  />
                  Apply rate change for destination room
                </label>
                {transferApplyRateChange && (
                  <input
                    className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
                    type="number"
                    min="0"
                    step="0.01"
                    value={transferNewRate}
                    onChange={(e) => setTransferNewRate(e.target.value)}
                    placeholder="New nightly rate"
                  />
                )}
                <div className="rounded-md border border-white/10 bg-slate-900/50 p-3 text-sm">
                  <p className="text-slate-300">Rate difference: <span className={`font-semibold ${transferRateDiff >= 0 ? 'text-amber-300' : 'text-emerald-300'}`}>{transferRateDiff >= 0 ? '+' : '-'}{formatCurrency(Math.abs(transferRateDiff))}/night</span></p>
                  {transferTargetBlocked && !transferManagerOverride && (
                    <p className="text-red-400 mt-1">Target room is blocked by status ({transferStatus}). Manager override required.</p>
                  )}
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-amber-500"
                    checked={transferManagerOverride}
                    onChange={(e) => setTransferManagerOverride(e.target.checked)}
                  />
                  Manager override
                </label>
                {transferManagerOverride && (
                  <input
                    className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
                    placeholder="Approver name/ID"
                    value={transferApprover}
                    onChange={(e) => setTransferApprover(e.target.value)}
                  />
                )}
              </section>
            ) : !isCheckoutMode ? (
              <div className="rounded-lg border border-white/10 bg-slate-800/70 p-4 space-y-3">
                <p className="text-2xl font-bold text-white">{guestName}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p className="text-slate-400">Check-in date</p><p className="text-right text-white">{formatDateDisplay(checkInDate)}</p>
                  <p className="text-slate-400">Expected check-out</p><p className="text-right text-white">{formatDateDisplay(checkOutDate)}</p>
                  <p className="text-slate-400">Nights stayed so far</p><p className="text-right text-white">{stayed}</p>
                  <p className="text-slate-200 font-semibold">Current balance</p>
                  <p className={`text-right font-semibold ${balanceBeforePayment > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{formatCurrency(balanceBeforePayment)}</p>
                </div>
              </div>
            ) : (
              <>
                <section className="rounded-lg border border-white/10 bg-slate-800/70 p-4 space-y-3">
                  <p className="text-xl font-semibold text-white">Check Out — Room {roomDisplay}</p>
                  <p className="text-2xl font-bold text-white">{guestName}</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p className="text-slate-400">Check-in date</p><p className="text-right text-white">{formatDateDisplay(checkInDate)}</p>
                    <p className="text-slate-400">Check-out date</p><p className="text-right text-white">{formatDateDisplay(new Date())}</p>
                    <p className="text-slate-400">Total nights</p><p className="text-right text-white">{nights}</p>
                  </div>
                </section>

                <section className="rounded-lg border border-white/10 bg-slate-800/70 p-4 space-y-3">
                  <p className="text-xs font-semibold tracking-wide uppercase text-slate-400">Charges</p>
                  <div className="rounded-md border border-white/10 overflow-hidden">
                    <div className="grid grid-cols-12 bg-slate-700/40 px-3 py-2 text-xs font-semibold text-slate-300">
                      <p className="col-span-7">Description</p>
                      <p className="col-span-5 text-right">Amount</p>
                    </div>
                    <div className="grid grid-cols-12 px-3 py-2 text-sm border-t border-white/10">
                      <p className="col-span-7 text-white">Room charge ({nights} nights × {formatCurrency(displayRatePerNight)})</p>
                      <p className="col-span-5 text-right text-white">{formatCurrency(roomChargeTotal)}</p>
                    </div>
                    <div className="grid grid-cols-12 px-3 py-2 text-sm border-t border-white/10">
                      <p className="col-span-7 text-white">City tax (8%)</p>
                      <p className="col-span-5 text-right text-white">{formatCurrency(taxBreakdown.cityTax)}</p>
                    </div>
                    <div className="grid grid-cols-12 px-3 py-2 text-sm border-t border-white/10">
                      <p className="col-span-7 text-white">State tax (7%)</p>
                      <p className="col-span-5 text-right text-white">{formatCurrency(taxBreakdown.stateTax)}</p>
                    </div>
                    <div className="grid grid-cols-12 px-3 py-2 text-sm border-t border-white/10">
                      <p className="col-span-7 text-white">Hotel tax ({nights} × {formatCurrency(INNSOFT_TAX_SETTINGS.hotelFlatPerNight)})</p>
                      <p className="col-span-5 text-right text-white">{formatCurrency(taxBreakdown.hotelTax)}</p>
                    </div>
                    {extraCharges.map((charge) => (
                      <div key={charge.id} className="px-3 py-2 border-t border-white/10 space-y-2">
                        <div className="grid grid-cols-12 gap-2">
                          <select
                            className="col-span-7 rounded-md border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-white"
                            value={charge.category}
                            onChange={(e) => updateCharge(charge.id, 'category', e.target.value)}
                          >
                            {chargeOptions.map((option) => <option key={option}>{option}</option>)}
                          </select>
                          <div className="col-span-4">
                            <input
                              className="w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-white"
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={charge.amount}
                              onChange={(e) => updateCharge(charge.id, 'amount', e.target.value)}
                            />
                          </div>
                          <button type="button" onClick={() => deleteCharge(charge.id)} className="col-span-1 rounded-md bg-red-900/50 text-red-300 hover:bg-red-800/60">
                            ×
                          </button>
                        </div>
                        {charge.category === 'Other' && (
                          <input
                            className="w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-white"
                            placeholder="Custom description"
                            value={charge.customDescription}
                            onChange={(e) => updateCharge(charge.id, 'customDescription', e.target.value)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={addCharge} className="px-3 py-1.5 rounded-md border border-cyan-300/30 bg-cyan-900/25 hover:bg-cyan-900/35 text-sm font-semibold text-cyan-200">
                    Add Charge
                  </button>
                </section>

                <section className="rounded-lg border border-white/10 bg-slate-800/70 p-4 space-y-2 text-sm">
                  <p className="text-xs font-semibold tracking-wide uppercase text-slate-400">Payments</p>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Deposits / prior payments</span>
                    <span className="text-white">{formatCurrency(depositsPaid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total charges</span>
                    <span className="text-white">{formatCurrency(totalCharges)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-100">Balance due</span>
                    <span className={balanceBeforePayment > 0 ? 'text-red-400' : 'text-emerald-400'}>{formatCurrency(balanceBeforePayment)}</span>
                  </div>
                  {paymentHistory.length > 0 && (
                    <div className="pt-2 mt-2 border-t border-white/10 space-y-1">
                      <p className="text-xs text-slate-400 uppercase tracking-wide">Ledger</p>
                      {paymentHistory.map((entry, idx) => (
                        <p key={`${entry.timestamp || idx}-${entry.amount || 0}`}>
                          <span className="text-emerald-300 font-semibold">{formatCurrency(entry.amount)}</span>
                          <span className="text-slate-300"> via {entry.method || 'Unknown'}</span>
                          {entry.reference && <span className="text-slate-400"> [{entry.reference}]</span>}
                          <span className="text-slate-400"> ({formatReceiptDateTime(entry.timestamp)})</span>
                        </p>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-lg border border-white/10 bg-slate-800/70 p-4 space-y-3">
                  <p className="text-xs font-semibold tracking-wide uppercase text-slate-400">Final Payment</p>
                  <div>
                    <label className="text-xs text-slate-400">Payment method</label>
                    <select
                      className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      <option>Cash</option>
                      <option>Card</option>
                      <option>Debit</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Amount received</label>
                    <input
                      className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
                      type="number"
                      min="0"
                      step="0.01"
                      value={amountReceived}
                      onFocus={(e) => e.target.select()}
                      onClick={(e) => e.target.select()}
                      onChange={(e) => setAmountReceived(e.target.value)}
                    />
                  </div>
                  <p className="text-sm text-slate-200">Change due: <span className="font-semibold text-emerald-400">{formatCurrency(changeDue)}</span></p>
                  <label className="flex items-center gap-2 text-sm text-slate-200">
                    <input type="checkbox" checked={waiveBalance} onChange={(e) => setWaiveBalance(e.target.checked)} className="h-4 w-4 accent-amber-500" />
                    Waive Balance (manager override)
                  </label>
                  {remainingBalance > 0 && !waiveBalance && (
                    <p className="text-xs text-red-400">Balance must be zero before completing checkout.</p>
                  )}
                </section>
              </>
            )}
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
          <div className="px-5 py-4 border-t border-white/10">
            {isTransferMode ? (
              <div className="flex gap-3">
                <button type="button" onClick={() => setIsTransferMode(false)} className="flex-1 px-4 py-3 rounded-md border border-white/20 bg-slate-700 text-white font-semibold">
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setIsTransferConfirmOpen(true)}
                  disabled={!canSubmitTransfer}
                  className={`flex-1 px-4 py-3 rounded-md font-semibold ${canSubmitTransfer ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-slate-600 text-slate-300 cursor-not-allowed'}`}
                >
                  Confirm Move
                </button>
              </div>
            ) : !isCheckoutMode ? (
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setIsTransferMode(true)} className="px-4 py-3 rounded-md bg-cyan-700/85 hover:bg-cyan-600 text-white font-semibold">
                  Move Guest
                </button>
                <button type="button" onClick={() => setIsCheckoutMode(true)} className="px-4 py-3 rounded-md bg-amber-500/90 hover:bg-amber-400 text-slate-950 font-semibold">
                  Check Out
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button type="button" onClick={() => setIsCheckoutMode(false)} className="flex-1 px-4 py-3 rounded-md border border-white/20 bg-slate-700 text-white font-semibold">
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={!canCompleteCheckout}
                  className={`flex-1 px-4 py-3 rounded-md font-semibold ${canCompleteCheckout ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-600 text-slate-300 cursor-not-allowed'}`}
                >
                  {isSaving ? 'Completing...' : 'Complete Check-Out'}
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
      <div className={`fixed inset-0 z-[70] flex items-center justify-center px-4 ${isTransferConfirmOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} transition-opacity`}>
        <div className="absolute inset-0 bg-slate-950/70" onClick={() => setIsTransferConfirmOpen(false)} />
        <div className="relative w-full max-w-md rounded-xl border border-white/15 bg-slate-900 p-5 shadow-2xl space-y-3">
          <p className="text-lg font-semibold text-white">Move Guest?</p>
          <div className="text-sm space-y-1">
            <p className="text-slate-200">Guest: <span className="text-white font-semibold">{guestName}</span></p>
            <p className="text-slate-200">From: <span className="text-white font-semibold">Room {roomDisplay}</span></p>
            <p className="text-slate-200">To: <span className="text-white font-semibold">Room {selectedTransferRoom?.id || '—'}</span></p>
            <p className="text-slate-200">Rate difference: <span className={`font-semibold ${transferRateDiff >= 0 ? 'text-amber-300' : 'text-emerald-300'}`}>{transferRateDiff >= 0 ? '+' : '-'}{formatCurrency(Math.abs(transferRateDiff))}/night</span></p>
            <p className="text-slate-200">Housekeeping status: <span className="text-white font-semibold">{String(selectedTransferRoom?.status || 'unknown').toUpperCase()}</span></p>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setIsTransferConfirmOpen(false)} className="flex-1 px-4 py-2.5 rounded-md border border-white/20 bg-slate-700 text-white font-semibold">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleTransferSubmit}
              disabled={!canSubmitTransfer || isSaving}
              className={`flex-1 px-4 py-2.5 rounded-md font-semibold ${canSubmitTransfer && !isSaving ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-slate-600 text-slate-300 cursor-not-allowed'}`}
            >
              {isSaving ? 'Moving...' : 'Proceed'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function HousekeepingPanel({ isOpen, roomOverlay, roomData, onClose, onMarkInProgress, onMarkAsClean }) {
  const [assignedTo, setAssignedTo] = useState('')
  const [notes, setNotes] = useState('')
  const [skipChecklist, setSkipChecklist] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [nowTs, setNowTs] = useState(Date.now())
  const [tasks, setTasks] = useState({
    linens: false,
    bathroom: false,
    floor: false,
    surfaces: false,
    trash: false,
    towels: false,
    hvac: false,
    appliances: false,
  })

  useEffect(() => {
    if (!isOpen) return
    setAssignedTo(roomData?.cleaning_assigned_to || '')
    setNotes('')
    setSkipChecklist(false)
    setError('')
    setIsSaving(false)
    setTasks({
      linens: false,
      bathroom: false,
      floor: false,
      surfaces: false,
      trash: false,
      towels: false,
      hvac: false,
      appliances: false,
    })
  }, [isOpen, roomOverlay?.id, roomData?.cleaning_assigned_to])

  useEffect(() => {
    if (!isOpen) return undefined
    const timer = setInterval(() => setNowTs(Date.now()), 60000)
    return () => clearInterval(timer)
  }, [isOpen])

  const roomDisplay = roomOverlay ? getRoomDisplayLabel(roomOverlay.id, roomOverlay) : roomData?.room || '—'
  const roomTypeLabel = roomOverlay?.type || roomData?.room_type || roomOverlay?.label || 'Room'
  const previousGuestName = roomData?.guestName || roomData?.guest_name || '—'
  const checkedOutAt = roomData?.actual_check_out || roomData?.check_out || roomData?.checkOut || null
  const cleaningStartedAt = roomData?.maintenance_started_at || null
  const isMaintenance = roomData?.status === 'maintenance'
  const checklistDone = Object.values(tasks).every(Boolean)
  const canMarkClean = !isSaving && (checklistDone || skipChecklist)
  const lastCheckoutReceipt = roomData?.last_checkout_receipt_snapshot || null

  const agoLabel = (value) => {
    if (!value) return '—'
    const dt = new Date(value)
    if (Number.isNaN(dt.getTime())) return '—'
    const mins = Math.max(0, Math.floor((nowTs - dt.getTime()) / (1000 * 60)))
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins} min ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
    const days = Math.floor(hrs / 24)
    return `${days} day${days === 1 ? '' : 's'} ago`
  }

  const checklistItems = [
    { key: 'linens', label: 'Bed linens changed' },
    { key: 'bathroom', label: 'Bathroom cleaned and restocked' },
    { key: 'floor', label: 'Floor vacuumed / mopped' },
    { key: 'surfaces', label: 'Surfaces wiped down' },
    { key: 'trash', label: 'Trash emptied' },
    { key: 'towels', label: 'Towels replaced' },
    { key: 'hvac', label: 'AC/Heat reset to default' },
    { key: 'appliances', label: 'TV and appliances checked' },
  ]

  const handleMarkInProgress = async () => {
    setError('')
    setIsSaving(true)
    try {
      await onMarkInProgress({
        assignedTo: String(assignedTo || '').trim() || null,
        notes: String(notes || '').trim() || null,
        startedAt: new Date().toISOString(),
      })
      setIsSaving(false)
    } catch (err) {
      setError(err?.message || 'Unable to mark room in progress.')
      setIsSaving(false)
    }
  }

  const handleMarkAsClean = async () => {
    if (!canMarkClean) return
    setError('')
    setIsSaving(true)
    try {
      await onMarkAsClean({
        assignedTo: String(assignedTo || '').trim() || null,
        notes: String(notes || '').trim() || null,
      })
      setIsSaving(false)
    } catch (err) {
      setError(err?.message || 'Unable to mark room clean.')
      setIsSaving(false)
    }
  }

  const handleReprintLastCheckoutReceipt = () => {
    if (!lastCheckoutReceipt) return
    const receiptWindow = window.open('', '_blank', 'width=900,height=700')
    if (!receiptWindow) return
    const html = buildGatewayReceiptHtml(lastCheckoutReceipt)
    receiptWindow.document.open()
    receiptWindow.document.write(html)
    receiptWindow.document.close()
  }

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
        <div className="h-full flex flex-col">
          <div className="px-5 py-4 border-b border-white/10 bg-slate-900/95">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">{isMaintenance ? 'Cleaning In Progress' : 'Housekeeping'}</h2>
                <p className="text-sm text-slate-300 mt-1">
                  Room {roomDisplay}{roomTypeLabel && roomTypeLabel !== roomDisplay ? ` — ${roomTypeLabel}` : ''}
                </p>
              </div>
              <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">
                ×
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <section className="rounded-lg border border-amber-300/30 bg-amber-500/10 p-4 space-y-2">
              <p className="text-amber-200 font-semibold">🟡 Room {roomDisplay} needs cleaning</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p className="text-amber-100/80">Previous guest</p><p className="text-right text-amber-50">{previousGuestName}</p>
                <p className="text-amber-100/80">Checked out at</p><p className="text-right text-amber-50">{formatDateDisplay(checkedOutAt)}</p>
                <p className="text-amber-100/80">Time since checkout</p><p className="text-right text-amber-50">{agoLabel(checkedOutAt)}</p>
                {isMaintenance && (
                  <>
                    <p className="text-amber-100/80">Started at</p><p className="text-right text-amber-50">{formatDateDisplay(cleaningStartedAt)}</p>
                  </>
                )}
              </div>
            </section>

            <section className="space-y-3">
              <p className="text-xs font-semibold tracking-wide uppercase text-slate-400">Housekeeping Checklist</p>
              <div className="space-y-2">
                {checklistItems.map((item) => (
                  <label key={item.key} className="flex items-center gap-3 rounded-md border border-white/10 bg-slate-800/60 px-3 py-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tasks[item.key]}
                      onChange={() => setTasks((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                      className="h-4 w-4 accent-emerald-500"
                    />
                    <span className={`${tasks[item.key] ? 'text-emerald-400' : 'text-slate-200'}`}>{item.label}</span>
                  </label>
                ))}
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={skipChecklist} onChange={(e) => setSkipChecklist(e.target.checked)} className="h-4 w-4 accent-amber-500" />
                Skip checklist override
              </label>
            </section>

            <section className="space-y-2">
              <label className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Assigned to</label>
              <input
                className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/70"
                placeholder="Enter housekeeper name"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
              />
            </section>

            <section className="space-y-2">
              <label className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Maintenance notes</label>
              <textarea
                className="w-full min-h-[96px] rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/70"
                placeholder="Any issues found in room..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </section>
            {lastCheckoutReceipt && (
              <section className="rounded-lg border border-cyan-400/25 bg-cyan-500/10 p-3">
                <button
                  type="button"
                  onClick={handleReprintLastCheckoutReceipt}
                  className="w-full px-4 py-2 rounded-md bg-cyan-700/70 hover:bg-cyan-600 text-white font-semibold"
                >
                  Reprint Last Checkout Receipt
                </button>
              </section>
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>

          <div className="px-5 py-4 border-t border-white/10 flex gap-3">
            {!isMaintenance && (
              <button
                type="button"
                onClick={handleMarkInProgress}
                disabled={isSaving}
                className="flex-1 px-4 py-3 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold disabled:opacity-60"
              >
                Mark In Progress
              </button>
            )}
            <button
              type="button"
              onClick={handleMarkAsClean}
              disabled={!canMarkClean}
              className={`flex-1 px-4 py-3 rounded-md font-semibold ${canMarkClean ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-600 text-slate-300 cursor-not-allowed'}`}
            >
              Mark as Clean
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

function RoomTooltip({ roomData, tooltipPos, unit, roomOverlays = [] }) {
  if (!roomData) return null
  const statusLabel = DISPLAY_STATUS_LABELS[roomData.status] || roomData.status
  const x = tooltipPos?.x ?? 0
  const y = tooltipPos?.y ?? 0
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
          <span className="text-slate-400">Type</span>
          <span className="font-medium text-right">{roomData.room_type || '—'}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Guest</span>
          <span className="font-medium text-right">{roomData.guestName || roomData.guest_name || '—'}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Status</span>
          <span className="font-semibold">{statusLabel}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Check-in</span>
          <span className="font-medium text-right">{formatDateDisplay(roomData.checkIn || roomData.check_in)}</span>
        </div>
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
            // Keep map colors consistent with KPI counts: if live status is missing, treat as available.
            const status = roomData?.status ?? 'available'
            const fill = isInfrastructure
              ? 'rgba(148, 163, 184, 0.2)'
              : MAP_STATUS_FILL_COLORS[status] || STATUS_COLORS[idx % 4]
            const dotFill = isInfrastructure
              ? null
              : MAP_STATUS_FILL_COLORS[status] || STATUS_COLORS[idx % 4]
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
                      {(status === 'maintenance' || status === 'unavailable') && (
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
                {!isInfrastructure && (status === 'dirty' || status === 'reserved' || status === 'maintenance' || status === 'unavailable') && (
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
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: MAP_STATUS_FILL_COLORS.available }} />
              AVL
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-red-100/90 text-red-900 font-semibold">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: MAP_STATUS_FILL_COLORS.occupied }} />
              OCC
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-amber-100/90 text-amber-900 font-semibold">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: MAP_STATUS_FILL_COLORS.dirty }} />
              DRT
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-blue-100/90 text-blue-900 font-semibold">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: MAP_STATUS_FILL_COLORS.reserved }} />
              RSV
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-200/90 text-slate-900 font-semibold">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: MAP_STATUS_FILL_COLORS.maintenance }} />
              MNT
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function KpiPanels({ metrics, statusFilter, onFilterChange }) {
  const cards = [
    { icon: '▣', label: 'Occupancy %', value: `${metrics.occupancyRatePct ?? metrics.utilizationPct ?? 0}%`, tone: 'bg-cyan-400/15 text-cyan-200 ring-cyan-300/40' },
    { icon: '✓', label: 'Available Rooms', value: metrics.available, filterKey: 'available', tone: 'bg-emerald-400/15 text-emerald-200 ring-emerald-300/40' },
    { icon: '●', label: 'Occupied Rooms', value: metrics.occupied, filterKey: 'occupied', tone: 'bg-rose-400/15 text-rose-200 ring-rose-300/40' },
    { icon: '◆', label: 'Dirty Rooms', value: metrics.dirty, filterKey: 'dirty', tone: 'bg-amber-300/15 text-amber-200 ring-amber-300/40' },
    { icon: '◷', label: 'Reserved Rooms', value: metrics.reserved, filterKey: 'reserved', tone: 'bg-sky-400/15 text-sky-200 ring-sky-300/40' },
    { icon: '⇥', label: 'Check-ins Today', value: metrics.reserved ?? 0, subtext: 'pending', tone: 'bg-blue-400/15 text-blue-200 ring-blue-300/40' },
    { icon: '⇤', label: 'Check-outs Today', value: metrics.turningOverToday ?? 0, tone: 'bg-violet-400/15 text-violet-200 ring-violet-300/40' },
    { icon: '!', label: 'Maintenance Issues', value: metrics.maintenance ?? 0, filterKey: 'maintenance', tone: 'bg-orange-400/15 text-orange-200 ring-orange-300/40' },
  ]

  return (
    <div className="w-full overflow-x-auto pb-1">
      <div className="grid min-w-[1040px] grid-cols-8 gap-3">
        {cards.map((card) => {
          const isActive = card.filterKey && statusFilter === card.filterKey
          const content = (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ring-1 ${card.tone}`}>
                  {card.icon}
                </span>
                {card.subtext ? <span className="text-[10px] text-[#8aa4c2]">{card.subtext}</span> : null}
              </div>
              <div className="mt-2 text-2xl font-black text-[#e5f0ff]">{card.value ?? '—'}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8aa4c2]">{card.label}</div>
            </>
          )
          const className = `rounded-2xl border bg-[#0b1728] p-3 text-left shadow-[0_0_10px_rgba(0,0,0,0.4)] transition ${
            isActive ? 'border-cyan-300/80 ring-2 ring-cyan-300/20' : 'border-[#1e3a5f] hover:border-cyan-300/50'
          }`

          return card.filterKey ? (
            <button key={card.label} type="button" onClick={() => onFilterChange(isActive ? null : card.filterKey)} className={className}>
              {content}
            </button>
          ) : (
            <div key={card.label} className={className}>{content}</div>
          )
        })}
      </div>
    </div>
  )
}

const ROOM_CONTEXT_CARD_CLASS = 'rounded-2xl border border-[#1e3a5f] bg-[#0b1728] p-4 shadow-[0_0_10px_rgba(0,0,0,0.4)] min-h-[236px]'

function MotelRoomContextCard({ roomData, roomOverlays = [] }) {
  if (!roomData) {
    return (
      <div className={ROOM_CONTEXT_CARD_CLASS}>
        <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[#8aa4c2]">Selected Room</h3>
        <p className="mt-3 text-sm text-[#8aa4c2]">Select a room on the map for guest and housekeeping context.</p>
      </div>
    )
  }

  const overlay = roomOverlays.find((o) => o.id === roomData.room)
  const statusLabel = DISPLAY_STATUS_LABELS[roomData.status] || roomData.status || '—'
  const housekeeping = roomData.housekeeping_status || (roomData.status === 'dirty' ? 'Pending' : roomData.status === 'maintenance' ? 'In progress' : 'Ready')
  const nextReservation = roomData.next_reservation || (roomData.status === 'reserved' ? 'Reserved at 3:00 PM' : '—')

  return (
    <div className={ROOM_CONTEXT_CARD_CLASS}>
      <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[#8aa4c2]">Selected Room</h3>
      <p className="mt-2 text-xl font-black text-[#e5f0ff]">{getRoomDisplayLabel(roomData.room, overlay)}</p>
      <div className="mt-3 space-y-2 text-sm">
        <ContextRow label="Guest" value={roomData.guestName || roomData.guest_name || roomData.guest_id || '—'} />
        <ContextRow label="Status" value={statusLabel} />
        <ContextRow label="Check-in" value={formatDateDisplay(roomData.checkIn || roomData.check_in)} />
        <ContextRow label="Checkout" value={formatDateDisplay(roomData.checkOut || roomData.check_out)} />
        <ContextRow label="Housekeeping" value={housekeeping} />
        <ContextRow label="Next Reservation" value={nextReservation} />
      </div>
    </div>
  )
}

function RoomStatusTable({
  roomOverlays = [],
  roomStatusMap = {},
  statusFilter = null,
  isInfrastructureCheck = null,
  onSelectRoom,
}) {
  const rows = useMemo(() => roomOverlays
    .filter((overlay) => !(isInfrastructureCheck?.(overlay)))
    .map((overlay) => {
      const statusData = roomStatusMap[overlay.id] ?? roomStatusMap[canonicalRoomKey(overlay.id)] ?? {}
      const status = normalizeRoomStatus(statusData.status || 'available')
      return {
        id: overlay.id,
        roomDisplay: getRoomDisplayLabel(overlay.id, overlay),
        unit: overlay.unit || '—',
        type: formatRoomTypeLabel(overlay.type || overlay.label || statusData.room_type || 'Room'),
        status,
        guest: statusData.guestName || statusData.guest_name || '—',
        checkIn: statusData.checkIn || statusData.check_in || null,
        checkOut: statusData.checkOut || statusData.check_out || null,
        balanceDue: Number(statusData.balanceDue || 0) || 0,
      }
    })
    .filter((row) => !statusFilter || row.status === statusFilter),
  [isInfrastructureCheck, roomOverlays, roomStatusMap, statusFilter])

  return (
    <div className="w-full h-full overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-slate-900/95 border-b border-white/10">
          <tr className="text-slate-300">
            <th className="text-left px-3 py-2">Room</th>
            <th className="text-left px-3 py-2">Status</th>
            <th className="text-left px-3 py-2">Guest</th>
            <th className="text-left px-3 py-2">Check-In</th>
            <th className="text-left px-3 py-2">Check-Out</th>
            <th className="text-left px-3 py-2">Balance</th>
            <th className="text-left px-3 py-2">Type</th>
            <th className="text-left px-3 py-2">Unit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const statusColor = MAP_STATUS_FILL_COLORS[row.status] || '#64748b'
            const statusLabel = DISPLAY_STATUS_LABELS[row.status] || row.status
            return (
            <tr
              key={row.id}
              onClick={() => onSelectRoom?.(row.id)}
              className="border-b border-white/5 hover:bg-slate-800/70 cursor-pointer"
              style={{ backgroundColor: `${statusColor}14` }}
            >
              <td className="px-3 py-2 font-semibold text-white">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusColor }} />
                  {row.roomDisplay}
                </span>
              </td>
              <td className="px-3 py-2 text-slate-200">
                <span
                  className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold"
                  style={{
                    borderColor: `${statusColor}77`,
                    backgroundColor: `${statusColor}22`,
                    color: statusColor,
                  }}
                >
                  {statusLabel}
                </span>
              </td>
              <td className="px-3 py-2 text-slate-300">{row.guest}</td>
              <td className="px-3 py-2 text-slate-400">{formatDateDisplay(row.checkIn)}</td>
              <td className="px-3 py-2 text-slate-400">{formatDateDisplay(row.checkOut)}</td>
              <td className="px-3 py-2 text-slate-200">{formatCurrency(row.balanceDue)}</td>
              <td className="px-3 py-2 text-slate-400">{row.type}</td>
              <td className="px-3 py-2 text-slate-400">{row.unit}</td>
            </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function VisualizationStatisticsPanel({
  roomOverlays = [],
  roomStatusMap = {},
  metrics = {},
  isInfrastructureCheck = null,
}) {
  const isSameLocalDate = (value, now) => {
    if (!value) return false
    const text = String(value).trim()
    let d = null
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      d = parseDateOnly(text)
    } else {
      d = new Date(value)
      if (Number.isNaN(d.getTime())) return false
    }
    return d.getFullYear() === now.getFullYear()
      && d.getMonth() === now.getMonth()
      && d.getDate() === now.getDate()
  }

  const operationalRows = useMemo(() => roomOverlays
    .filter((overlay) => !(isInfrastructureCheck?.(overlay)))
    .map((overlay) => {
      const statusData = roomStatusMap[overlay.id] ?? roomStatusMap[canonicalRoomKey(overlay.id)] ?? {}
      const status = normalizeRoomStatus(statusData.status || 'available')
      const payments = Array.isArray(statusData.payment_history) ? sumPaymentHistory(statusData.payment_history) : (Number(statusData.amountPaid) || 0)
      return {
        id: overlay.id,
        unit: overlay.unit || 'Unassigned',
        status,
        checkIn: statusData.actual_check_in || statusData.checkIn || statusData.check_in || null,
        checkOut: statusData.actual_check_out || statusData.checkOut || statusData.check_out || null,
        revenue: Math.max(0, payments),
        balanceDue: Math.max(0, Number(statusData.balanceDue) || 0),
      }
    }), [isInfrastructureCheck, roomOverlays, roomStatusMap])

  const statusCounts = useMemo(() => {
    const counts = {}
    operationalRows.forEach((row) => {
      counts[row.status] = (counts[row.status] || 0) + 1
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [operationalRows])

  const todaySnapshot = useMemo(() => {
    const now = new Date()
    const arrivals = operationalRows.filter((row) => isSameLocalDate(row.checkIn, now)).length
    const departures = operationalRows.filter((row) => isSameLocalDate(row.checkOut, now)).length
    const inHouse = operationalRows.filter((row) => ['occupied', 'checked_in'].includes(row.status)).length
    const revenueToday = operationalRows.reduce((sum, row) => sum + row.revenue, 0)
    const balanceDueTotal = operationalRows.reduce((sum, row) => sum + row.balanceDue, 0)
    return { arrivals, departures, inHouse, revenueToday, balanceDueTotal }
  }, [operationalRows])

  const housekeepingByUnit = useMemo(() => {
    const counts = {}
    operationalRows
      .filter((row) => ['dirty', 'maintenance', 'out_of_order'].includes(row.status))
      .forEach((row) => {
        counts[row.unit] = (counts[row.unit] || 0) + 1
      })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [operationalRows])

  const maxCount = statusCounts.reduce((m, [, count]) => Math.max(m, count), 1)
  const maxHousekeepingCount = housekeepingByUnit.reduce((m, [, count]) => Math.max(m, count), 1)

  return (
    <div className="w-full h-full overflow-auto px-4 py-4 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
        <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Occupancy</p>
          <p className="text-2xl font-bold text-rose-300">{metrics.occupancyRatePct || 0}%</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Arrivals Today</p>
          <p className="text-2xl font-bold text-cyan-300">{todaySnapshot.arrivals}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Departures Today</p>
          <p className="text-2xl font-bold text-indigo-300">{todaySnapshot.departures}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">In-House Guests</p>
          <p className="text-2xl font-bold text-rose-300">{todaySnapshot.inHouse}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Available</p>
          <p className="text-2xl font-bold text-emerald-300">{metrics.available || 0}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Dirty</p>
          <p className="text-2xl font-bold text-amber-300">{metrics.dirty || 0}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Maintenance</p>
          <p className="text-2xl font-bold text-slate-300">{metrics.maintenance || 0}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Revenue Snapshot</p>
          <p className="text-2xl font-bold text-emerald-300">{formatCurrency(todaySnapshot.revenueToday)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Balance Due</p>
          <p className="text-2xl font-bold text-amber-300">{formatCurrency(todaySnapshot.balanceDueTotal)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
          <p className="text-sm font-semibold text-white mb-3">Room Status Distribution</p>
          <div className="space-y-2">
            {statusCounts.map(([status, count]) => {
              const color = MAP_STATUS_FILL_COLORS[status] || '#64748b'
              const widthPct = Math.max(4, Math.round((count / maxCount) * 100))
              return (
                <div key={status} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-200">{DISPLAY_STATUS_LABELS[status] || status}</span>
                    <span className="text-slate-400">{count}</span>
                  </div>
                  <div className="h-2.5 rounded bg-slate-800/90 overflow-hidden">
                    <div className="h-full rounded" style={{ width: `${widthPct}%`, backgroundColor: color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
          <p className="text-sm font-semibold text-white mb-3">Housekeeping Workload by Unit</p>
          <div className="space-y-2">
            {housekeepingByUnit.length === 0 ? (
              <p className="text-sm text-slate-400">No active dirty/maintenance workload.</p>
            ) : housekeepingByUnit.map(([unit, count]) => {
              const widthPct = Math.max(6, Math.round((count / maxHousekeepingCount) * 100))
              return (
                <div key={unit} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-200">{unit}</span>
                    <span className="text-slate-400">{count} rooms</span>
                  </div>
                  <div className="h-2.5 rounded bg-slate-800/90 overflow-hidden">
                    <div className="h-full rounded bg-amber-400" style={{ width: `${widthPct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function ContextRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[#8aa4c2]">{label}</span>
      <span className="text-right font-semibold text-[#e5f0ff]">{value || '—'}</span>
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
  const [roomViewMode, setRoomViewMode] = useState('map')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [liveTime, setLiveTime] = useState(() => new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false }))
  const [reservationPanelRoomId, setReservationPanelRoomId] = useState(null)
  const [checkInPanelRoomId, setCheckInPanelRoomId] = useState(null)
  const [occupiedPanelRoomId, setOccupiedPanelRoomId] = useState(null)
  const [housekeepingPanelRoomId, setHousekeepingPanelRoomId] = useState(null)
  const importInputRef = useRef(null)
  const innsoftInputRef = useRef(null)
  const containerRef = useRef(null)
  const fullscreenRef = useRef(null)
  const isDragging = useRef(false)
  const lastPan = useRef({ x: 0, y: 0 })
  const hoveredRoomRef = useRef(null)
  const lastHoverChangeAtRef = useRef(0)
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
      if (hoveredRoomRef.current || Date.now() - lastHoverChangeAtRef.current < 500) return
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

  const fetchRoomStatus = useCallback(async () => {
    if (dataSourceMode !== 'api') return
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('rooms')
        .select(`
          id,
          room_number,
          room_type,
          status,
          rate_per_night,
          reservations!left (
            id,
            status,
            check_in_date,
            check_out_date,
            actual_check_in,
            actual_check_out,
            rate_per_night,
            source,
            payments (
              amount,
              payment_method,
              created_at
            ),
            guests (
              first_name,
              last_name
            )
          )
        `)
        .order('room_number')
      if (fetchError) throw fetchError

      const normalizedRooms = (Array.isArray(data) ? data : []).map((room) => {
        const reservations = Array.isArray(room.reservations) ? room.reservations : []
        const activeReservation =
          reservations.find((r) => r?.status === 'checked_in') ||
          reservations.find((r) => r?.status === 'reserved') ||
          null
        const latestCheckedOutReservation = reservations.find((r) => r?.status === 'checked_out') || null
        const contextReservation = activeReservation || latestCheckedOutReservation || reservations[0] || null
        const guest = contextReservation?.guests || null
        const guestName = guest
          ? `${guest.first_name || ''} ${guest.last_name || ''}`.trim()
          : null
        const payments = Array.isArray(activeReservation?.payments) ? activeReservation.payments : []
        const amountPaid = payments.reduce((sum, payment) => sum + (Number(payment?.amount) || 0), 0)
        const paymentHistory = mapPaymentsToLedgerHistory(payments)
        const roomNumber = String(room.room_number || '')
        const overlayRoomId = resolveOverlayRoomId(roomNumber)
        const derivedStatus = normalizeRoomStatus(room.status || activeReservation?.status || 'available')
        const checkInDate = contextReservation?.check_in_date || null
        const checkOutDate = contextReservation?.check_out_date || null
        const nights = dateDiffNights(checkInDate, checkOutDate)
        const ratePerNight = Number(activeReservation?.rate_per_night ?? room.rate_per_night ?? 0) || 0
        const roomSubtotal = nights * ratePerNight
        const totalAmount = calculateInnsoftTaxBreakdown(roomSubtotal, nights).totalWithTax
        return {
          room: overlayRoomId,
          roomNumber,
          room_id: room.id,
          room_type: room.room_type || null,
          status: derivedStatus,
          rate_per_night: room.rate_per_night ?? 0,
          guestName: guestName || null,
          guest_name: guestName || null,
          checkIn: checkInDate,
          check_in: checkInDate,
          checkOut: checkOutDate,
          check_out: checkOutDate,
          actual_check_in: activeReservation?.actual_check_in || null,
          actual_check_out: contextReservation?.actual_check_out || null,
          reservation_id: activeReservation?.id || null,
          bookingSource: activeReservation?.source || null,
          source: activeReservation?.source || null,
          nights,
          roomSubtotal,
          totalAmount,
          amountPaid,
          payment_history: paymentHistory,
          balanceDue: Math.max(0, totalAmount - amountPaid),
          updatedAt: new Date().toISOString(),
        }
      })
      setRoomData(addMock(normalizedRooms.map((room) => clearGuestContextForAvailableRoom(room))))
      setLastUpdated(new Date())
    } catch (err) {
      setError(err?.message || 'Failed to load room status from Supabase.')
      setRoomData([])
      setLastUpdated(new Date())
    } finally {
      setLoading(false)
    }
  }, [dataSourceMode, addMock, resolveOverlayRoomId])

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
          merged[roomId] = clearGuestContextForAvailableRoom(
            { ...(merged[roomId] || { room: roomId }), status },
            status
          )
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
  const checkInRoomOverlay = useMemo(
    () => roomOverlays.find((room) => room.id === checkInPanelRoomId) || null,
    [roomOverlays, checkInPanelRoomId]
  )
  const checkInRoomData = checkInPanelRoomId
    ? (
      roomStatusMap[checkInPanelRoomId] ??
      roomStatusMap[canonicalRoomKey(checkInPanelRoomId)] ??
      null
    )
    : null
  const occupiedRoomOverlay = useMemo(
    () => roomOverlays.find((room) => room.id === occupiedPanelRoomId) || null,
    [roomOverlays, occupiedPanelRoomId]
  )
  const occupiedRoomData = occupiedPanelRoomId
    ? (
      roomStatusMap[occupiedPanelRoomId] ??
      roomStatusMap[canonicalRoomKey(occupiedPanelRoomId)] ??
      null
    )
    : null
  const transferCandidateRooms = useMemo(
    () => roomOverlays
      .filter((overlay) => !checkInfrastructureOverlay(overlay))
      .map((overlay) => {
        const statusData = roomStatusMap[overlay.id] ?? roomStatusMap[canonicalRoomKey(overlay.id)] ?? {}
        return {
          id: overlay.id,
          unit: overlay.unit || null,
          room_type: overlay.type || overlay.label || statusData.room_type || null,
          status: normalizeRoomStatus(statusData.status || 'available'),
          room_id: statusData.room_id || null,
          rate_per_night: statusData.rate_per_night ?? statusData.ratePerNight ?? null,
        }
      }),
    [checkInfrastructureOverlay, roomOverlays, roomStatusMap]
  )
  const housekeepingRoomOverlay = useMemo(
    () => roomOverlays.find((room) => room.id === housekeepingPanelRoomId) || null,
    [roomOverlays, housekeepingPanelRoomId]
  )
  const housekeepingRoomData = housekeepingPanelRoomId
    ? (
      roomStatusMap[housekeepingPanelRoomId] ??
      roomStatusMap[canonicalRoomKey(housekeepingPanelRoomId)] ??
      null
    )
    : null

  const roomsForMetrics = useMemo(() => {
    const base = selectedTime ? roomData.map((r) => ({
      ...r,
      status: roomStatusMapWithTimeline[r.room]?.status ?? r.status,
    })) : roomData
    return base.map((r) => ({
      ...r,
      status: (() => {
        const normalized = normalizeRoomStatus(r.status)
        return normalized === 'checked_in' ? 'occupied' : normalized
      })(),
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
    lastHoverChangeAtRef.current = Date.now()
    if (entering) {
      if (hoveredRoomRef.current !== roomId) {
        hoveredRoomRef.current = roomId
        setHoveredRoom(roomId)
      }
      if (e) setTooltipPos({ x: e.clientX, y: e.clientY })
      return
    }
    if (hoveredRoomRef.current === roomId) {
      hoveredRoomRef.current = null
      setHoveredRoom(null)
    }
  }, [])

  const handleRoomClick = useCallback((roomId, e) => {
    setSelectedRoom(roomId)
    if (e) setTooltipPos({ x: e.clientX, y: e.clientY })
    const clickedRoom = roomStatusMap[roomId] ?? roomStatusMap[canonicalRoomKey(roomId)]
    const overlay = roomOverlays.find((r) => r.id === roomId)
    if (!clickedRoom || !overlay) return
    const roomStatus = normalizeRoomStatus(clickedRoom.status || 'available')
    const isGuestOperationalStatus = new Set([
      'available',
      'reserved',
      'occupied',
      'checked_in',
      'dirty',
      'maintenance',
      'clean',
      'inspected',
      'hold',
      'blocked',
      'out_of_order',
    ]).has(roomStatus)
    // Some imported maps can mislabel guest rooms as infrastructure by text.
    // If a room has an active operational status, allow normal panel routing.
    if (checkInfrastructureOverlay(overlay) && !isGuestOperationalStatus) return
    if (clickedRoom.status === 'available') {
      setReservationPanelRoomId(roomId)
      setCheckInPanelRoomId(null)
      setOccupiedPanelRoomId(null)
      setHousekeepingPanelRoomId(null)
      return
    }
    if (clickedRoom.status === 'reserved') {
      setCheckInPanelRoomId(roomId)
      setReservationPanelRoomId(null)
      setOccupiedPanelRoomId(null)
      setHousekeepingPanelRoomId(null)
      return
    }
    if (clickedRoom.status === 'occupied' || clickedRoom.status === 'checked_in') {
      setOccupiedPanelRoomId(roomId)
      setReservationPanelRoomId(null)
      setCheckInPanelRoomId(null)
      setHousekeepingPanelRoomId(null)
      return
    }
    if (clickedRoom.status === 'dirty' || clickedRoom.status === 'maintenance') {
      setHousekeepingPanelRoomId(roomId)
      setReservationPanelRoomId(null)
      setCheckInPanelRoomId(null)
      setOccupiedPanelRoomId(null)
    }
  }, [checkInfrastructureOverlay, roomOverlays, roomStatusMap])

  const handleSaveReservation = useCallback(async (values) => {
    if (!reservationPanelRoomId) throw new Error('No room selected.')
    const roomNumber = getRoomDisplayLabel(reservationPanelRoomId, reservationRoomOverlay)
    const cleanEmail = String(values.email || '').trim().toLowerCase()
    const cleanFirstName = String(values.firstName || '').trim()
    const cleanLastName = String(values.lastName || '').trim()
    const cleanPhone = String(values.phone || '').trim()
    const guestPayload = {
      first_name: cleanFirstName,
      last_name: cleanLastName,
      ...(cleanEmail ? { email: cleanEmail } : {}),
      ...(cleanPhone ? { phone: cleanPhone } : {}),
    }
    const guestLookup = cleanEmail
      ? await supabase
        .from('guests')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle()
      : { data: null, error: null }
    if (guestLookup.error) throw guestLookup.error

    let guestId = guestLookup.data?.id
    if (!guestId) {
      const { data: createdGuest, error: createGuestError } = await supabase
        .from('guests')
        .insert(guestPayload)
        .select('id')
        .single()
      if (createGuestError) throw createGuestError
      guestId = createdGuest.id
    }

    let idScanUrl = null
    let idScanName = null
    if (values.idScanFile instanceof File) {
      const safeName = sanitizeUploadFileName(values.idScanFile.name)
      const path = `guest-${guestId}/${Date.now()}-${safeName}`
      const upload = await supabase.storage
        .from('guest-scans')
        .upload(path, values.idScanFile, { upsert: false })
      if (!upload.error) {
        const { data: publicData } = supabase.storage.from('guest-scans').getPublicUrl(path)
        idScanUrl = publicData?.publicUrl || null
        idScanName = values.idScanFile.name
      } else {
        console.warn('Guest scan upload skipped:', upload.error?.message || upload.error)
      }
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
      source: values.source,
      special_requests: String(values.specialRequests || '').trim() || null,
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
          id_scan_url: idScanUrl,
          id_scan_name: idScanName,
          roomSubtotal: values.roomSubtotal,
          totalAmount: values.totalAmount,
          balanceDue: values.balanceDue,
          remarks: values.specialRequests ? [makeRemarkEvent({
            reservationId: room.reservation_id || null,
            guestId,
            roomNumber: reservationPanelRoomId,
            type: 'preference',
            text: String(values.specialRequests || '').trim(),
          })] : room.remarks,
        }
      }
      return room
    }))
    const shouldOpenCheckIn = isTodayDateOnly(values.checkInDate)
    setReservationPanelRoomId(null)
    if (shouldOpenCheckIn) {
      setCheckInPanelRoomId(reservationPanelRoomId)
      notify(`Reservation created for ${guestName}. Check-in is due today, opening check-in screen.`, 'info')
    } else {
      notify(`Reservation created for ${guestName}!`, 'success')
    }
  }, [notify, reservationPanelRoomId, reservationRoomOverlay])

  const appendAuditLog = useCallback(async ({
    action,
    reservationId = null,
    roomNumber = null,
    oldValue = null,
    newValue = null,
    employee = 'Front Desk',
  }) => {
    const payload = {
      action,
      reservation_id: reservationId,
      room_number: roomNumber,
      old_value: oldValue,
      new_value: newValue,
      employee,
      timestamp: new Date().toISOString(),
    }
    const { error } = await supabase.from('audit_log').insert(payload)
    if (error && !isMissingRelationError(error) && !isRlsPolicyError(error)) {
      console.warn('Audit log write failed:', error?.message || error)
    }
  }, [])

  const handleCancelReservation = useCallback(async ({ roomId, reason, fee = 0 }) => {
    const selectedRoom = roomStatusMap[roomId] ?? roomStatusMap[canonicalRoomKey(roomId)]
    if (!selectedRoom?.reservation_id) throw new Error('No active reservation found for this room.')
    if (!String(reason || '').trim()) throw new Error('Cancellation reason is required.')
    const reservationId = selectedRoom.reservation_id
    const nowIso = new Date().toISOString()
    const { error: reservationError } = await supabase
      .from('reservations')
      .update({
        status: 'cancelled',
        cancellation_reason: String(reason).trim(),
        cancellation_fee: Number(fee) || 0,
        cancelled_at: nowIso,
      })
      .eq('id', reservationId)
    if (reservationError) throw reservationError
    if (selectedRoom.room_id) {
      const { error: roomError } = await supabase.from('rooms').update({ status: 'available' }).eq('id', selectedRoom.room_id)
      if (roomError) throw roomError
    }
    const cancellationPayload = {
      reservation_id: reservationId,
      room_number: roomId,
      reason: String(reason).trim(),
      cancellation_fee: Number(fee) || 0,
      created_at: nowIso,
    }
    const cancellationWrite = await supabase.from('cancellation_log').insert(cancellationPayload)
    if (cancellationWrite.error && !isMissingRelationError(cancellationWrite.error) && !isRlsPolicyError(cancellationWrite.error)) {
      console.warn('Cancellation log write failed:', cancellationWrite.error?.message || cancellationWrite.error)
    }
    await appendAuditLog({
      action: 'reservation_cancelled',
      reservationId,
      roomNumber: roomId,
      oldValue: { status: selectedRoom.status || 'reserved' },
      newValue: { status: 'cancelled', reason: String(reason).trim(), fee: Number(fee) || 0 },
    })
    setRoomData((prev) => prev.map((room) => {
      if (room.room === roomId || room.roomNumber === roomId) {
        return clearGuestContextForAvailableRoom({
          ...room,
          status: 'cancelled',
          cancellation_reason: String(reason).trim(),
          cancellation_fee: Number(fee) || 0,
          cancellation_at: nowIso,
        }, 'available')
      }
      return room
    }))
    setCheckInPanelRoomId(null)
    notify(`Reservation for Room ${roomId} cancelled.`, 'info')
  }, [appendAuditLog, notify, roomStatusMap])

  const handleMarkNoShow = useCallback(async ({ roomId, reason }) => {
    const selectedRoom = roomStatusMap[roomId] ?? roomStatusMap[canonicalRoomKey(roomId)]
    if (!selectedRoom?.reservation_id) throw new Error('No reservation found for this room.')
    const reservationId = selectedRoom.reservation_id
    const nowIso = new Date().toISOString()
    const { error: reservationError } = await supabase
      .from('reservations')
      .update({ status: 'no_show', no_show_reason: String(reason || '').trim() || null, no_show_at: nowIso })
      .eq('id', reservationId)
    if (reservationError) throw reservationError
    if (selectedRoom.room_id) {
      const { error: roomError } = await supabase.from('rooms').update({ status: 'available' }).eq('id', selectedRoom.room_id)
      if (roomError) throw roomError
    }
    await appendAuditLog({
      action: 'reservation_no_show',
      reservationId,
      roomNumber: roomId,
      oldValue: { status: selectedRoom.status || 'reserved' },
      newValue: { status: 'no_show', reason: String(reason || '').trim() || null },
    })
    setRoomData((prev) => prev.map((room) => {
      if (room.room === roomId || room.roomNumber === roomId) {
        return clearGuestContextForAvailableRoom({
          ...room,
          status: 'no_show',
          no_show_reason: String(reason || '').trim() || null,
          no_show_at: nowIso,
        }, 'available')
      }
      return room
    }))
    setCheckInPanelRoomId(null)
    notify(`Room ${roomId} marked no-show and released to inventory.`, 'warning')
  }, [appendAuditLog, notify, roomStatusMap])

  const handleAddRemark = useCallback(async ({ roomId, noteType, noteText }) => {
    const selectedRoom = roomStatusMap[roomId] ?? roomStatusMap[canonicalRoomKey(roomId)]
    const remark = makeRemarkEvent({
      reservationId: selectedRoom?.reservation_id || null,
      guestId: selectedRoom?.guest_id || null,
      roomNumber: roomId,
      type: noteType,
      text: noteText,
    })
    const { error } = await supabase.from('remarks').insert(remark)
    if (error && !isMissingRelationError(error) && !isRlsPolicyError(error)) throw error
    await appendAuditLog({
      action: 'remark_added',
      reservationId: selectedRoom?.reservation_id || null,
      roomNumber: roomId,
      oldValue: null,
      newValue: { note_type: noteType, note_text: noteText },
    })
    setRoomData((prev) => prev.map((room) => {
      if (room.room === roomId || room.roomNumber === roomId) {
        const nextRemarks = Array.isArray(room.remarks) ? [...room.remarks, remark] : [remark]
        return { ...room, remarks: nextRemarks }
      }
      return room
    }))
    notify('Remark added to guest stay.', 'success')
  }, [appendAuditLog, notify, roomStatusMap])

  const handleCompleteCheckIn = useCallback(async ({ balanceDue, paymentMethod, amountReceived }) => {
    if (!checkInPanelRoomId) throw new Error('No room selected.')
    const roomNumber = getRoomDisplayLabel(checkInPanelRoomId, checkInRoomOverlay)
    const selectedRoom = roomStatusMap[checkInPanelRoomId] ?? roomStatusMap[canonicalRoomKey(checkInPanelRoomId)]
    if (!selectedRoom?.room_id) throw new Error(`Room ${roomNumber} is missing a room record id.`)

    let reservationId = selectedRoom?.reservation_id
    if (!reservationId) {
      const { data: reservationLookup, error: reservationLookupError } = await supabase
        .from('reservations')
        .select('id')
        .eq('room_id', selectedRoom.room_id)
        .eq('status', 'reserved')
        .order('check_in_date', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (reservationLookupError) throw reservationLookupError
      reservationId = reservationLookup?.id
    }
    if (!reservationId) throw new Error(`No active reserved reservation found for room ${roomNumber}.`)

    let paymentRecorded = true
    if (balanceDue > 0) {
      if (toCents(amountReceived) < toCents(balanceDue)) {
        throw new Error('Amount received must cover the full balance due.')
      }
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          reservation_id: reservationId,
          amount: balanceDue,
          payment_method: paymentMethod,
          created_at: new Date().toISOString(),
        })
      if (paymentError) {
        if (isRlsPolicyError(paymentError)) {
          paymentRecorded = false
        } else {
          throw paymentError
        }
      }
    }

    const nowIso = new Date().toISOString()
    const { error: reservationUpdateError } = await supabase
      .from('reservations')
      .update({ status: 'checked_in', actual_check_in: nowIso })
      .eq('id', reservationId)
    if (reservationUpdateError) throw reservationUpdateError

    const { error: roomUpdateError } = await supabase
      .from('rooms')
      .update({ status: 'occupied' })
      .eq('id', selectedRoom.room_id)
    if (roomUpdateError) throw roomUpdateError

    const guestName = selectedRoom.guestName || selectedRoom.guest_name || 'Guest'
    const paymentEvent = balanceDue > 0
      ? makePaymentEvent({ amount: balanceDue, method: paymentMethod, timestamp: nowIso, stage: 'check_in' })
      : null
    setRoomData((prev) => prev.map((room) => {
      if (room.room === checkInPanelRoomId || room.roomNumber === checkInPanelRoomId) {
        return {
          ...room,
          status: 'occupied',
          actual_check_in: nowIso,
          amountPaid: (Number(room.amountPaid) || 0) + (balanceDue > 0 ? balanceDue : 0),
          balanceDue: Math.max(0, (Number(room.balanceDue) || 0) - (balanceDue > 0 ? balanceDue : 0)),
          payment_history: paymentEvent ? appendPaymentEvent(room.payment_history, paymentEvent) : room.payment_history,
        }
      }
      return room
    }))
    setCheckInPanelRoomId(null)
    if (paymentRecorded) {
      notify(`✅ ${guestName} checked in to Room ${roomNumber}!`, 'success')
    } else {
      notify(`✅ ${guestName} checked in to Room ${roomNumber}! Payment log was blocked by DB policy (RLS).`, 'warning')
    }
  }, [checkInPanelRoomId, checkInRoomOverlay, notify, roomStatusMap])

  const handleCompleteCheckout = useCallback(async ({ checkoutDate, extraCharges, paymentMethod, paymentAmount, receiptSnapshot, checkoutPaymentEvent }) => {
    if (!occupiedPanelRoomId) throw new Error('No occupied room selected.')
    const roomNumber = getRoomDisplayLabel(occupiedPanelRoomId, occupiedRoomOverlay)
    const selectedRoom = roomStatusMap[occupiedPanelRoomId] ?? roomStatusMap[canonicalRoomKey(occupiedPanelRoomId)]
    if (!selectedRoom?.room_id) throw new Error(`Room ${roomNumber} is missing a room record id.`)

    let reservationId = selectedRoom?.reservation_id
    if (!reservationId) {
      const { data: reservationLookup, error: reservationLookupError } = await supabase
        .from('reservations')
        .select('id')
        .eq('room_id', selectedRoom.room_id)
        .in('status', ['checked_in', 'reserved'])
        .order('check_in_date', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (reservationLookupError) throw reservationLookupError
      reservationId = reservationLookup?.id
    }
    if (!reservationId) throw new Error(`No active reservation found for room ${roomNumber}.`)

    if (Array.isArray(extraCharges) && extraCharges.length > 0) {
      const chargeRows = extraCharges
        .filter((charge) => (Number(charge?.amount) || 0) > 0)
        .map((charge) => ({
          reservation_id: reservationId,
          description: String(charge.description || 'Other').trim(),
          amount: Number(charge.amount) || 0,
          created_at: checkoutDate,
        }))
      if (chargeRows.length > 0) {
        const { error: chargesError } = await supabase.from('charges').insert(chargeRows)
        if (chargesError) throw chargesError
      }
    }

    let paymentRecorded = true
    if ((Number(paymentAmount) || 0) > 0) {
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          reservation_id: reservationId,
          amount: Number(paymentAmount) || 0,
          payment_method: paymentMethod,
          created_at: checkoutDate,
        })
      if (paymentError) {
        if (isRlsPolicyError(paymentError)) {
          paymentRecorded = false
        } else {
          throw paymentError
        }
      }
    }

    const reservationUpdatePayload = {
      status: 'checked_out',
      actual_check_out: checkoutDate,
    }
    const { error: reservationUpdateError } = await supabase
      .from('reservations')
      .update(reservationUpdatePayload)
      .eq('id', reservationId)
    if (reservationUpdateError) throw reservationUpdateError

    const { error: roomUpdateError } = await supabase
      .from('rooms')
      .update({ status: 'dirty' })
      .eq('id', selectedRoom.room_id)
    if (roomUpdateError) throw roomUpdateError

    const guestName = selectedRoom.guestName || selectedRoom.guest_name || 'Guest'
    const paymentEventToApply = checkoutPaymentEvent || ((Number(paymentAmount) || 0) > 0
      ? makePaymentEvent({ amount: Number(paymentAmount) || 0, method: paymentMethod, timestamp: checkoutDate, stage: 'check_out' })
      : null)
    setRoomData((prev) => prev.map((room) => {
      if (room.room === occupiedPanelRoomId || room.roomNumber === occupiedPanelRoomId) {
        return {
          ...room,
          status: 'dirty',
          check_out: checkoutDate,
          checkOut: checkoutDate,
          actual_check_out: checkoutDate,
          balanceDue: 0,
          last_checkout_receipt_snapshot: receiptSnapshot || null,
          payment_history: paymentEventToApply ? appendPaymentEvent(room.payment_history, paymentEventToApply) : room.payment_history,
        }
      }
      return room
    }))
    setOccupiedPanelRoomId(null)
    if (paymentRecorded) {
      notify(`✅ ${guestName} checked out from Room ${roomNumber}. Room needs cleaning.`, 'success')
    } else {
      notify(`✅ ${guestName} checked out from Room ${roomNumber}. Payment log was blocked by DB policy (RLS).`, 'warning')
    }
  }, [notify, occupiedPanelRoomId, occupiedRoomOverlay, roomStatusMap])

  const handleTransferGuest = useCallback(async ({
    fromRoomId,
    toRoomId,
    reason,
    managerOverride,
    approver,
    applyRateChange,
    newRatePerNight,
  }) => {
    const sourceRoom = roomStatusMap[fromRoomId] ?? roomStatusMap[canonicalRoomKey(fromRoomId)]
    const targetRoom = roomStatusMap[toRoomId] ?? roomStatusMap[canonicalRoomKey(toRoomId)]
    if (!sourceRoom?.room_id || !targetRoom?.room_id) {
      throw new Error('Source or destination room is missing a room record id.')
    }
    const targetStatus = normalizeRoomStatus(targetRoom.status || 'available')
    const blockedStatuses = new Set(['occupied', 'checked_in', 'maintenance', 'out_of_order', 'unavailable'])
    if (blockedStatuses.has(targetStatus) && !managerOverride) {
      throw new Error(`Room ${toRoomId} cannot be assigned while status is "${targetStatus}".`)
    }
    const reservationId = sourceRoom?.reservation_id
    if (!reservationId) throw new Error('No active reservation found for transfer.')

    const nowIso = new Date().toISOString()
    const sourceRoomDbId = sourceRoom.room_id
    const targetRoomDbId = targetRoom.room_id
    const sourceRate = Number(sourceRoom.rate_per_night ?? sourceRoom.ratePerNight ?? 0) || 0
    const effectiveRate = applyRateChange ? (Number(newRatePerNight) || 0) : sourceRate

    const { error: reservationUpdateError } = await supabase
      .from('reservations')
      .update({
        room_id: targetRoomDbId,
        ...(applyRateChange ? { rate_per_night: effectiveRate } : {}),
      })
      .eq('id', reservationId)
    if (reservationUpdateError) throw reservationUpdateError

    const { error: targetUpdateError } = await supabase
      .from('rooms')
      .update({ status: 'occupied' })
      .eq('id', targetRoomDbId)
    if (targetUpdateError) {
      await supabase.from('reservations').update({ room_id: sourceRoomDbId }).eq('id', reservationId)
      throw targetUpdateError
    }

    const { error: sourceUpdateError } = await supabase
      .from('rooms')
      .update({ status: 'dirty' })
      .eq('id', sourceRoomDbId)
    if (sourceUpdateError) {
      await supabase.from('rooms').update({ status: sourceRoom.status || 'occupied' }).eq('id', targetRoomDbId)
      await supabase.from('reservations').update({ room_id: sourceRoomDbId }).eq('id', reservationId)
      throw sourceUpdateError
    }

    const logPayload = {
      reservation_id: reservationId,
      guest_name: sourceRoom.guest_name || sourceRoom.guestName || null,
      from_room: fromRoomId,
      to_room: toRoomId,
      reason: String(reason || '').trim() || 'Room transfer',
      transferred_by: approver || 'Front Desk',
      manager_override: !!managerOverride,
      approved_by: approver || null,
      old_rate_per_night: sourceRate,
      new_rate_per_night: effectiveRate,
      housekeeping_impact: 'source_room_dirty',
      maintenance_impact: targetStatus === 'maintenance' ? 'override_to_occupied' : null,
      created_at: nowIso,
    }
    const taskPayload = {
      room_id: sourceRoomDbId,
      reservation_id: reservationId,
      status: 'dirty',
      priority: 'high',
      notes: `Room transfer from ${fromRoomId} to ${toRoomId}. ${String(reason || '').trim()}`,
      created_at: nowIso,
    }
    const occupancyPayload = [
      { room_id: sourceRoomDbId, reservation_id: reservationId, event_type: 'ROOM_STATUS_CHANGED', status: 'dirty', created_at: nowIso },
      { room_id: targetRoomDbId, reservation_id: reservationId, event_type: 'ROOM_TRANSFER_COMPLETED', status: 'occupied', created_at: nowIso },
    ]
    const auditPayload = {
      event_type: 'ROOM_TRANSFER_COMPLETED',
      entity_type: 'reservation',
      entity_id: reservationId,
      payload: logPayload,
      created_at: nowIso,
    }

    const optionalWrites = [
      supabase.from('room_transfer_log').insert(logPayload),
      supabase.from('housekeeping_tasks').insert(taskPayload),
      supabase.from('occupancy_events').insert(occupancyPayload),
      supabase.from('audit_log').insert(auditPayload),
    ]
    const optionalResults = await Promise.all(optionalWrites)
    optionalResults.forEach((result) => {
      if (result.error && !isMissingRelationError(result.error) && !isRlsPolicyError(result.error)) {
        console.warn('Optional room-transfer write failed:', result.error?.message || result.error)
      }
    })

    setRoomData((prev) => {
      const source = prev.find((room) => room.room === fromRoomId || room.roomNumber === fromRoomId) || null
      return prev.map((room) => {
        if (room.room === fromRoomId || room.roomNumber === fromRoomId) {
          return {
            ...room,
            status: 'dirty',
            reservation_id: null,
            room_transfer_out_at: nowIso,
            room_transfer_reason: String(reason || '').trim(),
          }
        }
        if (room.room === toRoomId || room.roomNumber === toRoomId) {
          return {
            ...room,
            ...(source ? {
              guestName: source.guestName ?? source.guest_name ?? room.guestName,
              guest_name: source.guest_name ?? source.guestName ?? room.guest_name,
              checkIn: source.checkIn ?? source.check_in ?? room.checkIn,
              check_in: source.check_in ?? source.checkIn ?? room.check_in,
              checkOut: source.checkOut ?? source.check_out ?? room.checkOut,
              check_out: source.check_out ?? source.checkOut ?? room.check_out,
              actual_check_in: source.actual_check_in ?? room.actual_check_in,
              adults: source.adults ?? room.adults,
              children: source.children ?? room.children,
              payment_history: source.payment_history ?? room.payment_history,
              reservation_id: source.reservation_id ?? room.reservation_id,
              id_scan_url: source.id_scan_url ?? room.id_scan_url,
              id_scan_name: source.id_scan_name ?? room.id_scan_name,
            } : {}),
            status: 'occupied',
            room_transfer_in_at: nowIso,
            room_transfer_reason: String(reason || '').trim(),
            rate_per_night: effectiveRate,
          }
        }
        return room
      })
    })

    setOccupiedPanelRoomId(toRoomId)
    notify(`Guest moved from Room ${fromRoomId} to Room ${toRoomId}. Housekeeping task created for Room ${fromRoomId}.`, 'success')
  }, [notify, roomStatusMap])

  const handleAppendPaymentEntry = useCallback(async (roomId, entry) => {
    if (!roomId || !entry) return
    const selectedRoom = roomStatusMap[roomId] ?? roomStatusMap[canonicalRoomKey(roomId)]
    if (!selectedRoom?.reservation_id) {
      throw new Error('No active reservation found for this room.')
    }
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        reservation_id: selectedRoom.reservation_id,
        amount: Number(entry.amount) || 0,
        payment_method: entry.method || 'Unknown',
        created_at: entry.timestamp || new Date().toISOString(),
      })
    if (paymentError && !isRlsPolicyError(paymentError)) {
      throw paymentError
    }

    setRoomData((prev) => prev.map((room) => {
      if (room.room === roomId || room.roomNumber === roomId) {
        return {
          ...room,
          payment_history: appendPaymentEvent(room.payment_history, entry),
        }
      }
      return room
    }))
    if (paymentError && isRlsPolicyError(paymentError)) {
      notify('Ledger saved locally, but payment insert was blocked by DB policy (RLS).', 'warning')
    }
  }, [notify, roomStatusMap])

  const handleMarkCleaningInProgress = useCallback(async ({ assignedTo, notes, startedAt }) => {
    if (!housekeepingPanelRoomId) throw new Error('No room selected.')
    const roomNumber = getRoomDisplayLabel(housekeepingPanelRoomId, housekeepingRoomOverlay)
    const selectedRoom = roomStatusMap[housekeepingPanelRoomId] ?? roomStatusMap[canonicalRoomKey(housekeepingPanelRoomId)]
    if (!selectedRoom?.room_id) throw new Error(`Room ${roomNumber} is missing a room record id.`)

    const { error: roomUpdateError } = await supabase
      .from('rooms')
      .update({ status: 'maintenance' })
      .eq('id', selectedRoom.room_id)
    if (roomUpdateError) throw roomUpdateError

    setRoomData((prev) => prev.map((room) => {
      if (room.room === housekeepingPanelRoomId || room.roomNumber === housekeepingPanelRoomId) {
        return {
          ...room,
          status: 'maintenance',
          cleaning_assigned_to: assignedTo || room.cleaning_assigned_to || null,
          maintenance_started_at: startedAt,
          maintenance_notes: notes || room.maintenance_notes || null,
        }
      }
      return room
    }))
    setHousekeepingPanelRoomId(null)
    notify(`Room ${roomNumber} cleaning in progress`, 'info')
  }, [housekeepingPanelRoomId, housekeepingRoomOverlay, notify, roomStatusMap])

  const handleMarkRoomClean = useCallback(async ({ assignedTo, notes }) => {
    if (!housekeepingPanelRoomId) throw new Error('No room selected.')
    const roomNumber = getRoomDisplayLabel(housekeepingPanelRoomId, housekeepingRoomOverlay)
    const selectedRoom = roomStatusMap[housekeepingPanelRoomId] ?? roomStatusMap[canonicalRoomKey(housekeepingPanelRoomId)]
    if (!selectedRoom?.room_id) throw new Error(`Room ${roomNumber} is missing a room record id.`)

    const nowIso = new Date().toISOString()
    const { error: roomUpdateError } = await supabase
      .from('rooms')
      .update({ status: 'available' })
      .eq('id', selectedRoom.room_id)
    if (roomUpdateError) throw roomUpdateError

    const { error: housekeepingInsertError } = await supabase
      .from('housekeeping')
      .insert({
        room_id: selectedRoom.room_id,
        assigned_to: assignedTo || null,
        status: 'completed',
        notes: notes || null,
        completed_at: nowIso,
      })
    if (housekeepingInsertError) throw housekeepingInsertError

    setRoomData((prev) => prev.map((room) => {
      if (room.room === housekeepingPanelRoomId || room.roomNumber === housekeepingPanelRoomId) {
        return {
          ...room,
          status: 'available',
          guestName: null,
          guest_name: null,
          checkIn: null,
          check_in: null,
          checkOut: null,
          check_out: null,
          actual_check_out: null,
          last_checkout_receipt_snapshot: null,
          payment_history: null,
          cleaning_assigned_to: null,
          maintenance_started_at: null,
          maintenance_notes: null,
        }
      }
      return room
    }))
    setHousekeepingPanelRoomId(null)
    notify(`✅ Room ${roomNumber} is clean and available!`, 'success')
  }, [housekeepingPanelRoomId, housekeepingRoomOverlay, notify, roomStatusMap])

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
        setRoomData(addMock(mappedRows.map((room) => clearGuestContextForAvailableRoom(room))))
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
    setRoomData(addMock(mappedRows.map((room) => clearGuestContextForAvailableRoom(room))))
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
          <CommandCenterHeader
            appName="Hospitality Command Center"
            facilityName={brandName.replace(/\s*-\s*Live Command Center$/i, '').replace(/\s*Command Center$/i, '')}
            facilityType={brandSubtitle}
            mode="Command Center"
            logoFallback={String(brandIcon || 'M').replace(/[^\w]/g, '').slice(0, 2) || 'M'}
            className="-mx-4 -mt-4"
          />
        )}

        {!commandCenterMode && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="inline-flex rounded-xl border border-white/15 overflow-hidden">
              <button
                type="button"
                onClick={() => setRoomViewMode('map')}
                className={`px-3 py-2 text-sm font-semibold ${roomViewMode === 'map' ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
              >
                Map View
              </button>
              <button
                type="button"
                onClick={() => setRoomViewMode('table')}
                className={`px-3 py-2 text-sm font-semibold ${roomViewMode === 'table' ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
              >
                Table View
              </button>
              <button
                type="button"
                onClick={() => setRoomViewMode('stats')}
                className={`px-3 py-2 text-sm font-semibold ${roomViewMode === 'stats' ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
              >
                Statistics
              </button>
            </div>
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

        <div className={`flex flex-col flex-1 min-h-0 w-full ${commandCenterMode ? 'lg:flex-row gap-3 lg:gap-4 lg:max-w-[1920px] lg:mx-auto lg:self-center' : 'lg:flex-row gap-4'}`}>
        <div
          ref={containerRef}
          className={`relative rounded-2xl border border-[#1e3a5f] overflow-hidden bg-[#020817] flex-[1_1_70%] min-w-0 min-h-[60vh] flex flex-col shadow-[0_0_10px_rgba(0,0,0,0.4)] ${commandCenterMode ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
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
            className={`w-full flex-1 min-h-0 ${roomViewMode === 'map' ? 'flex items-center justify-center' : ''}`}
            style={roomViewMode === 'map'
              ? {
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                transformOrigin: 'center center',
                minHeight: commandCenterMode ? 520 : 620,
              }
              : {
                minHeight: commandCenterMode ? 520 : 620,
              }}
          >
            {error ? (
              <div className="text-center py-16 text-red-400">
                <p className="font-semibold">{error}</p>
                <button type="button" onClick={fetchRoomStatus} className="mt-4 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600">Retry</button>
              </div>
            ) : loading && roomData.length === 0 ? (
              <div className="text-slate-400">Loading floor map…</div>
            ) : roomViewMode === 'table' ? (
              <div className="w-full h-full min-h-0">
                <RoomStatusTable
                  roomOverlays={roomOverlays}
                  roomStatusMap={roomStatusMapWithTimeline}
                  statusFilter={statusFilter}
                  isInfrastructureCheck={checkInfrastructureOverlay}
                  onSelectRoom={(roomId) => handleRoomClick(roomId)}
                />
              </div>
            ) : roomViewMode === 'stats' ? (
              <div className="w-full h-full min-h-0">
                <VisualizationStatisticsPanel
                  roomOverlays={roomOverlays}
                  roomStatusMap={roomStatusMapWithTimeline}
                  metrics={metrics}
                  isInfrastructureCheck={checkInfrastructureOverlay}
                />
              </div>
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
          {!commandCenterMode && roomViewMode === 'map' && (
          <div className="absolute bottom-4 right-4 flex flex-col gap-1">
            <button type="button" onClick={() => setScale((s) => Math.min(3, s + 0.2))} className="w-10 h-10 rounded-lg bg-slate-800/90 border border-white/10 flex items-center justify-center text-lg hover:bg-slate-700">+</button>
            <button type="button" onClick={() => setScale((s) => Math.max(0.5, s - 0.2))} className="w-10 h-10 rounded-lg bg-slate-800/90 border border-white/10 flex items-center justify-center text-lg hover:bg-slate-700">−</button>
            <button type="button" onClick={toggleFullscreenMap} className="w-10 h-10 rounded-lg bg-slate-800/90 border border-white/10 flex items-center justify-center text-sm hover:bg-slate-700" title={isFullscreen ? 'Exit full screen (Esc)' : 'Full screen map'}>
              {isFullscreen ? '✕' : '⛶'}
            </button>
          </div>
          )}
          {hoveredRoomData && !commandCenterMode && roomViewMode === 'map' && (
            <RoomTooltip
              roomData={hoveredRoomData}
              tooltipPos={tooltipPos}
              unit={activeRoomId ? roomIdToUnit.get(activeRoomId) : null}
              roomOverlays={roomOverlays}
            />
          )}
        </div>

        {/* Right-side context/alerts panel intentionally hidden for now. */}
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
      <ReservedCheckInPanel
        isOpen={!!checkInPanelRoomId}
        roomOverlay={checkInRoomOverlay}
        roomData={checkInRoomData}
        onClose={() => setCheckInPanelRoomId(null)}
        onComplete={handleCompleteCheckIn}
        onCancelReservation={handleCancelReservation}
        onMarkNoShow={handleMarkNoShow}
        onAddRemark={handleAddRemark}
        hotelName={brandName}
      />
      <OccupiedRoomPanel
        isOpen={!!occupiedPanelRoomId}
        roomOverlay={occupiedRoomOverlay}
        roomData={occupiedRoomData}
        onClose={() => setOccupiedPanelRoomId(null)}
        onCompleteCheckout={handleCompleteCheckout}
        onAppendPaymentEntry={handleAppendPaymentEntry}
        onTransferGuest={handleTransferGuest}
        transferCandidates={transferCandidateRooms}
      />
      <HousekeepingPanel
        isOpen={!!housekeepingPanelRoomId}
        roomOverlay={housekeepingRoomOverlay}
        roomData={housekeepingRoomData}
        onClose={() => setHousekeepingPanelRoomId(null)}
        onMarkInProgress={handleMarkCleaningInProgress}
        onMarkAsClean={handleMarkRoomClean}
      />
    </div>
  )
}

export default MotelCommandCenter
