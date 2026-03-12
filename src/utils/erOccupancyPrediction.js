/**
 * ER Occupancy Prediction Utility
 * Calculates ER occupancy, growth rate, and predicts time to reach 95% capacity
 */

import { patientMovements, parseTime } from '../data/patientMovements'
import { INFRASTRUCTURE_ROOM_IDS, NON_PATIENT_ROOM_TYPES } from '../config/hospitalBedData'

/**
 * Get current ER occupancy
 * @param {Array} rooms - Room data array
 * @param {Map} roomIdToUnit - Map of room ID to unit
 * @returns {Object} { totalBeds, occupiedBeds, occupancyPct }
 */
export function getEROccupancy(rooms, roomIdToUnit) {
  if (!roomIdToUnit || !Array.isArray(rooms)) {
    return { totalBeds: 0, occupiedBeds: 0, occupancyPct: 0 }
  }

  const erRooms = rooms.filter((r) => {
    const unit = roomIdToUnit.get(r.room)
    return unit === 'ER' && !INFRASTRUCTURE_ROOM_IDS.has(r.room) && !NON_PATIENT_ROOM_TYPES.has(r.type)
  })

  const totalBeds = erRooms.length
  const occupiedBeds = erRooms.filter((r) => r.status === 'occupied' || r.status === 'reserved').length
  const occupancyPct = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0

  return { totalBeds, occupiedBeds, occupancyPct }
}

/**
 * Track patient arrivals and discharges in ER over a time window
 * @param {number} windowMinutes - Time window in minutes (default: 30)
 * @param {string} currentTime - Current time string (HH:MM format) or null for now
 * @returns {Object} { arrivals, discharges, arrivalsPerMinute, dischargesPerMinute, netGrowthRate }
 */
export function getERFlowRate(windowMinutes = 30, currentTime = null) {
  // If no current time provided, use a time that has good ER activity in the demo data
  // Use 12:00 (noon) as reference - this captures morning ER activity (08:00-12:00)
  let now
  if (currentTime) {
    now = parseTime(currentTime)
  } else {
    // Use 12:00 as reference time - this gives us a good window to look back from
    // and captures morning ER activity (events from 11:30-12:00 range)
    // For demo purposes, we'll use a 2-hour window to get more meaningful data
    now = parseTime('12:00')
    // Use 2-hour window instead of 30 minutes for more data points
    windowMinutes = 120
  }
  const windowStart = now - windowMinutes

  let arrivals = 0
  let discharges = 0

  // Track events in the time window
  for (const patient of patientMovements) {
    for (let i = 0; i < patient.events.length; i++) {
      const event = patient.events[i]
      const eventTime = parseTime(event.time)
      
      // Only count events within the time window (inclusive of window start)
      if (eventTime >= windowStart && eventTime <= now) {
        // Arrival: admitted to ER or roomed from waiting
        // Check if this is an ER arrival event
        if (event.department === 'ER' && (event.action === 'admitted' || event.action === 'roomed')) {
          arrivals++
        }
        // Also count if event has 'to' pointing to an ER room (even if department isn't set)
        else if (event.to && event.to.startsWith('ROOM_') && (event.action === 'admitted' || event.action === 'roomed')) {
          // Check if the 'to' room is an ER room by looking at room overlays or checking room ID pattern
          // For now, we'll rely on department being set, but this is a fallback
          // Most ER rooms in the data are ROOM_001-010, ROOM_023-024, ROOM_027-028, ROOM_030-032, ROOM_057, ROOM_064
          const erRoomPattern = /^ROOM_(00[1-9]|010|02[34]|02[78]|03[012]|057|064)$/
          if (erRoomPattern.test(event.to)) {
            arrivals++
          }
        }
        
        // Discharge: transfer out of ER
        // Check if this event represents leaving ER (transfer from ER to another dept)
        if (event.from && event.to && event.action === 'transfer') {
          // Find the previous event for this patient to see where they came from
          let prevEvent = null
          for (let j = i - 1; j >= 0; j--) {
            if (patient.events[j].time === event.time || parseTime(patient.events[j].time) < eventTime) {
              prevEvent = patient.events[j]
              break
            }
          }
          // If previous event was in ER and this event is not in ER, it's a discharge
          if (prevEvent && prevEvent.department === 'ER' && event.department !== 'ER') {
            discharges++
          }
        } else if (event.action === 'discharge') {
          // Direct discharge - check if patient was in ER
          let prevEvent = null
          for (let j = i - 1; j >= 0; j--) {
            if (parseTime(patient.events[j].time) < eventTime) {
              prevEvent = patient.events[j]
              break
            }
          }
          if (prevEvent && prevEvent.department === 'ER') {
            discharges++
          }
        }
      }
    }
  }

  const arrivalsPerMinute = windowMinutes > 0 ? arrivals / windowMinutes : 0
  const dischargesPerMinute = windowMinutes > 0 ? discharges / windowMinutes : 0
  const netGrowthRate = arrivalsPerMinute - dischargesPerMinute

  return {
    arrivals,
    discharges,
    arrivalsPerMinute,
    dischargesPerMinute,
    netGrowthRate,
  }
}

/**
 * Predict time to reach 95% ER occupancy
 * @param {Object} occupancy - Current occupancy { totalBeds, occupiedBeds, occupancyPct }
 * @param {Object} flowRate - Flow rate { netGrowthRate }
 * @returns {Object} { minutesTo95, predictedTime, willReach95 }
 */
export function predictTimeTo95Percent(occupancy, flowRate) {
  const { totalBeds, occupiedBeds } = occupancy
  const { netGrowthRate } = flowRate

  if (totalBeds === 0 || netGrowthRate <= 0) {
    return {
      minutesTo95: null,
      predictedTime: null,
      willReach95: false,
    }
  }

  const targetBeds = Math.ceil(totalBeds * 0.95)
  const bedsNeeded = targetBeds - occupiedBeds

  if (bedsNeeded <= 0) {
    // Already at or above 95%
    return {
      minutesTo95: 0,
      predictedTime: 'now',
      willReach95: true,
    }
  }

  const minutesTo95 = Math.ceil(bedsNeeded / netGrowthRate)
  
  // Calculate predicted time
  const now = new Date()
  const predictedDate = new Date(now.getTime() + minutesTo95 * 60000)
  const predictedTime = predictedDate.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  })

  return {
    minutesTo95,
    predictedTime,
    willReach95: true,
  }
}

/**
 * Get ER occupancy history for trend chart
 * @param {number} hoursBack - Number of hours to look back (default: 2)
 * @param {Array} roomStatusHistory - Historical room status data
 * @param {Array} roomOverlays - Room overlay data
 * @param {Map} roomIdToUnit - Map of room ID to unit
 * @returns {Array} Array of { time, occupancyPct } points
 */
export function getEROccupancyHistory(hoursBack = 2, roomStatusHistory = [], roomOverlays = [], roomIdToUnit = new Map()) {
  if (!roomStatusHistory || roomStatusHistory.length === 0) {
    return []
  }

  // Use the latest snapshot time as reference, or default to 14:00
  let referenceTimeMinutes = 0
  if (roomStatusHistory.length > 0) {
    const latestSnapshot = roomStatusHistory[roomStatusHistory.length - 1]
    referenceTimeMinutes = parseTime(latestSnapshot.time)
  } else {
    referenceTimeMinutes = parseTime('14:00')
  }

  const cutoffMinutes = referenceTimeMinutes - (hoursBack * 60)

  const history = []
  
  for (const snapshot of roomStatusHistory) {
    const snapshotTimeMinutes = parseTime(snapshot.time)
    
    // Only include snapshots within the time window (last N hours from reference time)
    if (snapshotTimeMinutes < cutoffMinutes) continue

    const erRooms = roomOverlays.filter((r) => {
      // Use unit from roomOverlays directly, or fallback to roomIdToUnit map
      const unit = r.unit || roomIdToUnit.get(r.id)
      return unit === 'ER' && !INFRASTRUCTURE_ROOM_IDS.has(r.id) && !NON_PATIENT_ROOM_TYPES.has(r.type)
    })

    const totalBeds = erRooms.length
    if (totalBeds === 0) continue

    let occupiedBeds = 0
    erRooms.forEach((r) => {
      const status = snapshot.rooms?.[r.id]
      if (status === 'occupied' || status === 'reserved') {
        occupiedBeds++
      }
    })

    const occupancyPct = (occupiedBeds / totalBeds) * 100

    history.push({
      time: snapshot.time,
      occupancyPct: Math.round(occupancyPct),
    })
  }

  return history.sort((a, b) => parseTime(a.time) - parseTime(b.time))
}

/**
 * Calculate complete ER occupancy prediction
 * @param {Array} rooms - Current room data
 * @param {Map} roomIdToUnit - Map of room ID to unit
 * @param {string} currentTime - Current time string or null
 * @returns {Object} Complete prediction data
 */
export function calculateEROccupancyPrediction(rooms, roomIdToUnit, currentTime = null) {
  const occupancy = getEROccupancy(rooms, roomIdToUnit)
  const flowRate = getERFlowRate(30, currentTime)
  const prediction = predictTimeTo95Percent(occupancy, flowRate)

  return {
    occupancy,
    flowRate,
    prediction,
  }
}
