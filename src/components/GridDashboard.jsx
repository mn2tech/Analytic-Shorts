import GridLayout from 'react-grid-layout/legacy'
import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { TD } from '../constants/terminalDashboardPalette'

const ROW_HEIGHT = 40
const COLS = 12
const MARGIN = 12

export function getChartHeight(layoutItem) {
  if (!layoutItem) return 280
  return Math.max(150, layoutItem.h * (ROW_HEIGHT + MARGIN) - MARGIN - 56)
}

function mergeLayoutForVisible(prevLayout, defaultLayout, visibleItemIds) {
  const defaultsById = new Map((defaultLayout || []).map((d) => [d.i, d]))
  const merged = Array.isArray(prevLayout) ? [...prevLayout] : []
  const seen = new Set(merged.map((m) => m.i))
  for (const id of visibleItemIds) {
    if (!seen.has(id)) {
      const def = defaultsById.get(id)
      if (def) {
        merged.push({ ...def })
        seen.add(id)
      }
    }
  }
  return merged
}

/**
 * Card chrome for react-grid-layout items (Advanced dashboard and similar).
 */
export function GridCard({
  id,
  title,
  value,
  layout,
  isDragging = false,
  onDelete,
  contentStyle = {},
  headerExtras,
  children,
}) {
  const item = useMemo(
    () => (Array.isArray(layout) ? layout.find((l) => String(l.i) === String(id)) : null),
    [layout, id]
  )
  const contentHeight = getChartHeight(item)

  return (
    <div
      className="group"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        opacity: isDragging ? 0.92 : 1,
        background: TD.CARD_BG,
        border: `0.5px solid ${TD.CARD_BORDER}`,
        borderRadius: '12px',
        overflow: 'hidden',
        color: TD.TEXT_1,
      }}
    >
      <div
        className="chart-drag-handle flex items-center justify-between gap-2"
        style={{
          padding: '10px 14px',
          borderBottom: `0.5px solid ${TD.CARD_BORDER}`,
          background: '#162032',
          flexShrink: 0,
          userSelect: 'none',
        }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span style={{ fontSize: '13px', fontWeight: 600, color: TD.TEXT_1 }}>{title}</span>
          {value != null && value !== '' && (
            <span className="tabular-nums text-sm font-medium" style={{ color: TD.TEXT_1 }}>
              {value}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {headerExtras}
          {typeof onDelete === 'function' && (
            <button
              type="button"
              onClick={onDelete}
              style={{
                background: 'none',
                border: 'none',
                color: '#475569',
                cursor: 'pointer',
                fontSize: '18px',
                lineHeight: 1,
              }}
              onMouseEnter={(e) => {
                e.target.style.color = '#ef4444'
              }}
              onMouseLeave={(e) => {
                e.target.style.color = '#475569'
              }}
              aria-label="Hide chart"
            >
              ×
            </button>
          )}
        </div>
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          padding: '12px',
          ...contentStyle,
        }}
      >
        {typeof children === 'function' ? children(contentHeight) : children}
      </div>
    </div>
  )
}

export default function GridDashboard({
  dashboardId = 'default',
  defaultLayout = [],
  visibleItemIds = [],
  className,
  children,
  onLayoutChange,
}) {
  const containerRef = useRef(null)
  const [width, setWidth] = useState(1200)
  const [layout, setLayout] = useState(() => {
    try {
      const saved = localStorage.getItem('grid-layout-' + dashboardId)
      const parsed = saved ? JSON.parse(saved) : null
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    } catch {
      /* ignore */
    }
    return Array.isArray(defaultLayout) ? [...defaultLayout] : []
  })

  const visKey = useMemo(() => JSON.stringify(visibleItemIds ?? []), [visibleItemIds])

  useEffect(() => {
    setLayout((prev) => mergeLayoutForVisible(prev, defaultLayout, visibleItemIds ?? []))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- visKey stabilizes visibleItemIds content
  }, [visKey, defaultLayout])

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const displayLayout = useMemo(() => {
    const vis = new Set(visibleItemIds ?? [])
    return layout.filter((l) => vis.has(l.i))
  }, [layout, visibleItemIds])

  const handleChange = useCallback(
    (newLayout) => {
      setLayout((prev) => {
        const merged = [...prev]
        for (const item of newLayout) {
          const idx = merged.findIndex((m) => m.i === item.i)
          if (idx >= 0) merged[idx] = { ...merged[idx], ...item }
          else merged.push({ ...item })
        }
        try {
          localStorage.setItem('grid-layout-' + dashboardId, JSON.stringify(merged))
        } catch {
          /* ignore */
        }
        onLayoutChange?.(merged)
        return merged
      })
    },
    [dashboardId, onLayoutChange]
  )

  const resetLayout = () => {
    setLayout(() => (Array.isArray(defaultLayout) ? [...defaultLayout] : []))
    try {
      localStorage.removeItem('grid-layout-' + dashboardId)
    } catch {
      /* ignore */
    }
  }

  const gridBody =
    typeof children === 'function'
      ? children({ layout: displayLayout, isDragging: false })
      : children

  if (displayLayout.length === 0) return null

  return (
    <div ref={containerRef} className={className} style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '4px 4px 8px',
        }}
      >
        <button
          type="button"
          onClick={resetLayout}
          style={{
            fontSize: '11px',
            color: '#64748b',
            background: 'none',
            border: '0.5px solid #334155',
            borderRadius: '6px',
            padding: '3px 10px',
            cursor: 'pointer',
          }}
        >
          Reset layout
        </button>
      </div>

      <GridLayout
        layout={displayLayout}
        cols={COLS}
        rowHeight={ROW_HEIGHT}
        width={width}
        margin={[MARGIN, MARGIN]}
        containerPadding={[0, 0]}
        onLayoutChange={handleChange}
        draggableHandle=".chart-drag-handle"
        resizeHandles={['se', 'sw', 'ne', 'nw', 'e', 'w', 'n', 's']}
        isDraggable
        isResizable
      >
        {gridBody}
      </GridLayout>
    </div>
  )
}
