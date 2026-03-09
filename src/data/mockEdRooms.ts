/**
 * ED Bed Map - Mock room data
 * Future: Replace with fetch from REST API or WebSocket subscription
 */

import type { RoomData } from '../types/edRoom'

export const MOCK_ROOMS: RoomData[] = [
  { id: 'trauma1', label: 'TRAUMA 1', status: 'occupied', patientName: 'Jane Smith', age: 45, reasonForVisit: 'MVA', team: 'Red', comments: 'Stable', lastUpdated: '2026-03-06T15:20:00' },
  { id: 'trauma2', label: 'TRAUMA 2', status: 'available', lastUpdated: '2026-03-06T15:18:00' },
  { id: 'trauma3', label: 'TRAUMA 3', status: 'occupied', patientName: 'Robert Lee', age: 62, reasonForVisit: 'GSW', team: 'Red', critical: true, lastUpdated: '2026-03-06T15:22:00' },
  { id: 'trauma4', label: 'TRAUMA 4', status: 'dirty', lastUpdated: '2026-03-06T15:15:00' },
  { id: 'ct_xray', label: 'CT/X-RAY', status: 'occupied', patientName: 'Mary Johnson', age: 58, reasonForVisit: 'Head CT', team: 'Blue', lastUpdated: '2026-03-06T15:19:00' },
  { id: 'nurse_station', label: 'EMERGENCY NURSE STATION', status: 'available', lastUpdated: '2026-03-06T15:20:00' },
  { id: 'er101', label: 'ER 101', status: 'occupied', patientName: 'John Doe', age: 68, reasonForVisit: 'Chest Pain', team: 'Blue', comments: 'Awaiting lab review', critical: true, lastUpdated: '2026-03-06T15:20:00' },
  { id: 'er102', label: 'ER 102', status: 'available', lastUpdated: '2026-03-06T15:18:00' },
  { id: 'er103', label: 'ER 103', status: 'dirty', lastUpdated: '2026-03-06T15:10:00' },
  { id: 'er104', label: 'ER 104', status: 'occupied', patientName: 'Susan Brown', age: 34, reasonForVisit: 'Laceration', team: 'Green', lastUpdated: '2026-03-06T15:21:00' },
  { id: 'er105', label: 'ER 105', status: 'occupied', patientName: 'David Wilson', age: 72, reasonForVisit: 'Stroke symptoms', team: 'Red', critical: true, lastUpdated: '2026-03-06T15:23:00' },
  { id: 'er106', label: 'ER 106', status: 'closed', lastUpdated: '2026-03-06T14:00:00' },
  { id: 'triage1', label: 'TRIAGE 1', status: 'occupied', patientName: 'Amy Davis', age: 28, reasonForVisit: 'Abdominal pain', team: 'Green', lastUpdated: '2026-03-06T15:17:00' },
  { id: 'triage2', label: 'TRIAGE 2', status: 'available', lastUpdated: '2026-03-06T15:20:00' },
  { id: 'registration', label: 'REGISTRATION', status: 'available', lastUpdated: '2026-03-06T15:20:00' },
  { id: 'waiting_room', label: 'WAITING ROOM', status: 'available', waitingCount: 12, lastUpdated: '2026-03-06T15:20:00' },
  { id: 'lab', label: 'LAB', status: 'available', lastUpdated: '2026-03-06T15:19:00' },
  { id: 'consult', label: 'CONSULT', status: 'dirty', lastUpdated: '2026-03-06T15:12:00' },
  { id: 'supply', label: 'SUPPLY', status: 'closed', lastUpdated: '2026-03-06T14:30:00' },
]

export const mockRooms = MOCK_ROOMS
