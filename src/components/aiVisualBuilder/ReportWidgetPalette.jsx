/**
 * Draggable palette of filters and charts for Tableau-style report building.
 * Drag items onto the report canvas to add them to the dashboard spec.
 */

import { FILTER_TYPES } from './FilterTypeIcons'
import { CHART_TYPES } from './ChartTypeIcons'

const DRAG_TYPE = 'application/x-report-widget'

function getFilterSpecType(paletteId) {
  const map = { date_slider: 'date_range', dropdown: 'select' }
  return map[paletteId] || paletteId
}

export function createFilterPayload(paletteId) {
  const type = getFilterSpecType(paletteId)
  return { kind: 'filter', filterType: type }
}

export function createChartPayload(chartType) {
  return { kind: 'chart', chartType }
}

function handleDragStart(e, payload) {
  e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(payload))
  e.dataTransfer.effectAllowed = 'copy'
  e.dataTransfer.setData('text/plain', JSON.stringify(payload))
}

export default function ReportWidgetPalette({ disabled, className = '' }) {
  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Filters</span>
        <div className="flex flex-wrap gap-2">
          {FILTER_TYPES.map(({ id, label, icon }) => (
            <div
              key={id}
              draggable={!disabled}
              onDragStart={(e) => handleDragStart(e, createFilterPayload(id))}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 cursor-grab active:cursor-grabbing hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={`Drag to report: ${label}`}
            >
              <span className="text-gray-500">{icon}</span>
              <span className="text-sm font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Charts &amp; widgets</span>
        <div className="flex flex-wrap gap-2">
          {CHART_TYPES.map(({ id, label, icon }) => (
            <div
              key={id}
              draggable={!disabled}
              onDragStart={(e) => handleDragStart(e, createChartPayload(id))}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 cursor-grab active:cursor-grabbing hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={`Drag to report: ${label}`}
            >
              <span className="text-gray-500">{icon}</span>
              <span className="text-sm font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export { DRAG_TYPE }
