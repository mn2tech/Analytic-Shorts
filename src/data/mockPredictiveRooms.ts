/**
 * Predictive Bed Map - Mock room data with prediction fields
 * Future: Replace with fetch from REST API or WebSocket subscription
 */

import type { RoomData } from '../types/predictiveRoom'

export const MOCK_PREDICTIVE_ROOMS: RoomData[] = [
  { id: 'trauma1', label: 'TRAUMA 1', status: 'occupied', patientName: 'Jane Smith', age: 45, reasonForVisit: 'MVA', team: 'Red', critical: false, isolation: false, lastUpdated: '2026-03-06T15:20:00', predictedInMinutes: 45, predictedStatus: 'available' },
  { id: 'trauma2', label: 'TRAUMA 2', status: 'available', lastUpdated: '2026-03-06T15:18:00' },
  { id: 'trauma3', label: 'TRAUMA 3', status: 'occupied', patientName: 'Robert Lee', age: 62, reasonForVisit: 'GSW', team: 'Red', critical: true, lastUpdated: '2026-03-06T15:22:00', predictedInMinutes: 90, predictedStatus: 'available' },
  { id: 'trauma4', label: 'TRAUMA 4', status: 'dirty', lastUpdated: '2026-03-06T15:15:00', predictedInMinutes: 20, predictedStatus: 'available' },
  { id: 'ct_xray', label: 'CT/X-RAY', status: 'occupied', patientName: 'Mary Johnson', age: 58, reasonForVisit: 'Head CT', team: 'Blue', lastUpdated: '2026-03-06T15:19:00', predictedInMinutes: 30, predictedStatus: 'available' },
  { id: 'nurse_station', label: 'NURSE STATION', status: 'available', lastUpdated: '2026-03-06T15:20:00' },
  { id: 'er101', label: 'ER101', status: 'occupied', patientName: 'John Doe', age: 68, reasonForVisit: 'Chest Pain', team: 'Blue', critical: true, comments: 'Awaiting lab review', lastUpdated: '2026-03-06T15:20:00', predictedInMinutes: 60, predictedStatus: 'available' },
  { id: 'er102', label: 'ER102', status: 'available', lastUpdated: '2026-03-06T15:18:00' },
  { id: 'er103', label: 'ER103', status: 'dirty', lastUpdated: '2026-03-06T15:10:00', predictedInMinutes: 15, predictedStatus: 'available' },
  { id: 'er104', label: 'ER104', status: 'occupied', patientName: 'Susan Brown', age: 34, reasonForVisit: 'Laceration', team: 'Green', lastUpdated: '2026-03-06T15:21:00', predictedInMinutes: 25, predictedStatus: 'available' },
  { id: 'er105', label: 'ER105', status: 'occupied', patientName: 'David Wilson', age: 72, reasonForVisit: 'Stroke symptoms', team: 'Red', critical: true, lastUpdated: '2026-03-06T15:23:00', predictedInMinutes: 120, predictedStatus: 'available' },
  { id: 'er106', label: 'ER106', status: 'closed', lastUpdated: '2026-03-06T14:00:00' },
  { id: 'triage1', label: 'TRIAGE 1', status: 'occupied', patientName: 'Amy Davis', age: 28, reasonForVisit: 'Abdominal pain', team: 'Green', lastUpdated: '2026-03-06T15:17:00', predictedInMinutes: 35, predictedStatus: 'available' },
  { id: 'triage2', label: 'TRIAGE 2', status: 'available', lastUpdated: '2026-03-06T15:20:00' },
  { id: 'registration', label: 'REGISTRATION', status: 'available', lastUpdated: '2026-03-06T15:20:00' },
  { id: 'waiting_room', label: 'WAITING ROOM', status: 'available', waitingCount: 12, lastUpdated: '2026-03-06T15:20:00' },
  { id: 'lab', label: 'LAB', status: 'available', lastUpdated: '2026-03-06T15:19:00' },
  { id: 'consult', label: 'CONSULT', status: 'dirty', lastUpdated: '2026-03-06T15:12:00', predictedInMinutes: 45, predictedStatus: 'available' },
  { id: 'supply', label: 'SUPPLY', status: 'closed', lastUpdated: '2026-03-06T14:30:00' },
]

export const mockPredictiveRooms = MOCK_PREDICTIVE_ROOMS
