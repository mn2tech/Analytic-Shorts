import { TD } from '../constants/terminalDashboardPalette'

/**
 * Lets Recharts expand past the card width when there are many points/bars;
 * the user can scroll horizontally (trackpad, shift+mouse wheel, or scrollbar).
 */
export function ChartHorizontalScroll({ pointCount, pxPerPoint = 20, height, children, className = '', fillMinHeight = 240 }) {
  const n = Math.max(0, Number(pointCount) || 0)
  const minInner = `max(100%, ${Math.max(n, 1) * pxPerPoint}px)`
  const isFillHeight = String(height).trim() === '100%'

  return (
    <div
      className={`w-full overflow-x-auto overflow-y-hidden ${className}`}
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: `${TD.GRID} ${TD.PAGE_BG}`,
        WebkitOverflowScrolling: 'touch',
        // Percentage height only resolves if the parent has height; minHeight keeps Recharts from
        // collapsing to 0px inside flex + grid layouts (e.g. Advanced dashboard line/bar cards).
        ...(isFillHeight ? { height: '100%', minHeight: fillMinHeight } : {}),
      }}
      title={n > 12 ? 'Scroll horizontally to see the full chart' : undefined}
    >
      <div
        style={{
          minWidth: minInner,
          ...(isFillHeight
            ? { height: '100%', minHeight: Math.max(200, fillMinHeight - 24) }
            : { height }),
        }}
      >
        {children}
      </div>
    </div>
  )
}
