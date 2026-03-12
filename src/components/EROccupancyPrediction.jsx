/**
 * ER Occupancy Prediction Component
 * Displays ER occupancy, growth rate, and prediction to 95% capacity
 */
import { useMemo } from 'react'
import { calculateEROccupancyPrediction } from '../utils/erOccupancyPrediction'

export default function EROccupancyPrediction({
  rooms = [],
  roomIdToUnit = new Map(),
  currentTime = null,
}) {
  const prediction = useMemo(() => {
    return calculateEROccupancyPrediction(rooms, roomIdToUnit, currentTime)
  }, [rooms, roomIdToUnit, currentTime])

  const { occupancy, flowRate, prediction: pred } = prediction

  const showAlert = pred.willReach95 && pred.minutesTo95 !== null && pred.minutesTo95 < 60

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          ER Occupancy Prediction
        </h3>
        {showAlert && (
          <span className="text-xs text-red-400 font-medium animate-pulse">⚠ Alert</span>
        )}
      </div>

      {/* Current Occupancy */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">Current Occupancy</span>
        <span className="text-sm font-semibold text-white">
          {occupancy.occupiedBeds} / {occupancy.totalBeds} ({Math.round(occupancy.occupancyPct)}%)
        </span>
      </div>

      {/* Growth Rate */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">Net Growth Rate</span>
        <span className={`text-sm font-medium ${
          flowRate.netGrowthRate > 0 ? 'text-red-400' : 
          flowRate.netGrowthRate < 0 ? 'text-green-400' : 
          'text-slate-400'
        }`}>
          {flowRate.netGrowthRate > 0 ? '+' : ''}{flowRate.netGrowthRate.toFixed(2)} beds/min
        </span>
      </div>

      {/* Flow Details */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-slate-500">Arrivals (2h):</span>
          <span className="ml-1 text-slate-300">{flowRate.arrivals}</span>
        </div>
        <div>
          <span className="text-slate-500">Discharges (2h):</span>
          <span className="ml-1 text-slate-300">{flowRate.discharges}</span>
        </div>
      </div>

      {/* Prediction */}
      {pred.willReach95 && pred.minutesTo95 !== null ? (
        <div className={`pt-2 border-t border-slate-700/50 ${
          showAlert ? 'bg-red-500/10 border-red-500/30 rounded p-2' : ''
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Time to 95%</span>
            <span className={`text-sm font-semibold ${
              showAlert ? 'text-red-400' : 'text-amber-400'
            }`}>
              {pred.minutesTo95 === 0 ? 'Now' : `${pred.minutesTo95} min`}
            </span>
          </div>
          {pred.predictedTime && pred.minutesTo95 > 0 && (
            <div className="text-xs text-slate-500 mt-1">
              Est: {pred.predictedTime}
            </div>
          )}
        </div>
      ) : (
        <div className="pt-2 border-t border-slate-700/50">
          <div className="text-xs text-slate-500">
            {flowRate.netGrowthRate <= 0 
              ? 'No capacity risk - growth rate is stable or declining'
              : 'Insufficient data for prediction'}
          </div>
        </div>
      )}
    </div>
  )
}
