import { DATA_CENTER_STATUS_COLORS } from '../../utils/dataCenterDemoGenerator'

export default function DataCenterMapCanvas({
  layout = [],
  telemetry = [],
  movements = [],
  onRackHover,
  onRackLeave,
  onRackClick,
  selectedRackId,
}) {
  const telemetryMap = new Map(telemetry.map((item) => [item.id, item]))
  const width = layout.reduce((max, rack) => Math.max(max, rack.x + rack.width), 0) + 48
  const height = layout.reduce((max, rack) => Math.max(max, rack.y + rack.height), 0) + 48

  const movementSegments = movements
    .map((event) => {
      const from = layout.find((rack) => rack.id === event.fromRackId)
      const to = layout.find((rack) => rack.id === event.toRackId)
      if (!from || !to) return null
      return {
        ...event,
        x1: from.x + from.width / 2,
        y1: from.y + from.height / 2,
        x2: to.x + to.width / 2,
        y2: to.y + to.height / 2,
      }
    })
    .filter(Boolean)

  return (
    <div className="rounded-xl border border-white/10 bg-[#020617] p-4 overflow-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[520px]" preserveAspectRatio="xMidYMid meet">
        <rect x="0" y="0" width={width} height={height} fill="#020617" />
        <defs>
          <pattern id="dc-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#1e293b" strokeWidth="0.7" />
          </pattern>
        </defs>
        <rect x="0" y="0" width={width} height={height} fill="url(#dc-grid)" />

        {movementSegments.map((segment) => (
          <line
            key={segment.id}
            x1={segment.x1}
            y1={segment.y1}
            x2={segment.x2}
            y2={segment.y2}
            stroke={segment.status === 'in_progress' ? '#22d3ee' : '#64748b'}
            strokeWidth="2"
            strokeDasharray="6 5"
            opacity="0.75"
          />
        ))}

        {layout.map((rack) => {
          const rackData = telemetryMap.get(rack.id)
          const color = DATA_CENTER_STATUS_COLORS[rackData?.status] || '#334155'
          const selected = selectedRackId === rack.id
          return (
            <g
              key={rack.id}
              style={{ cursor: 'pointer' }}
              onMouseEnter={(event) => onRackHover?.(rack.id, event)}
              onMouseLeave={onRackLeave}
              onClick={() => onRackClick?.(rack.id)}
            >
              <rect
                x={rack.x}
                y={rack.y}
                width={rack.width}
                height={rack.height}
                fill="#0f172a"
                stroke={selected ? '#ffffff' : '#94a3b8'}
                strokeWidth={selected ? 2.2 : 1.1}
                rx="2"
              />
              <rect
                x={rack.x + rack.width - 5}
                y={rack.y}
                width="5"
                height={rack.height}
                fill={color}
                opacity="0.95"
              />
              <text
                x={rack.x + rack.width / 2}
                y={rack.y + rack.height / 2 + 4}
                textAnchor="middle"
                fontSize="10"
                fill="#e2e8f0"
                style={{ fontWeight: 700 }}
              >
                {rack.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
