/**
 * Predictive Bed Map - Room data with ADT-derived predictions
 * Future: Replace mock with REST API / WebSocket / HL7 ADT feed
 */

export type RoomStatus = 'occupied' | 'available' | 'dirty' | 'closed'

export interface RoomData {
  id: string
  label: string
  status: RoomStatus
  patientName?: string
  age?: number
  reasonForVisit?: string
  team?: string
  comments?: string
  critical?: boolean
  isolation?: boolean
  lastUpdated?: string
  /** Predicted availability timestamp (ISO string) */
  predictedAvailableAt?: string
  /** Predicted availability in minutes (e.g. 45 = "Avail ~45m") */
  predictedInMinutes?: number
  /** Predicted status when room becomes available */
  predictedStatus?: RoomStatus
  /** For waiting room: number of patients waiting */
  waitingCount?: number
}
