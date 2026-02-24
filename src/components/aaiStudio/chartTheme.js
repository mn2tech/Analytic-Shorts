// Shared chart styling for AAI Studio (matches app card styles; no hardcoded colors beyond theme)
export const CHART_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#14b8a6',
]
export const CHART_HEIGHT = 320
export const TREND_CHART_HEIGHT = Math.round(CHART_HEIGHT * 1.2) // 384 — 20% taller for trend
export const TOOLTIP_STYLE = {
  backgroundColor: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
}
export const GRID_STROKE = '#e5e7eb'
export const LIGHT_GRID_STROKE = '#f3f4f6' // subtle grid for executive polish
export const AXIS_STROKE = '#6b7280'
export const FONT_SIZE_AXIS = 12
export const BAR_RADIUS = [0, 4, 4, 0]
export const SELECTED_COLOR = '#ef4444'
export const PRIMARY_COLOR = '#3b82f6'
export const NEGATIVE_COLOR = '#ef4444'
export const POSITIVE_COLOR = '#10b981'
