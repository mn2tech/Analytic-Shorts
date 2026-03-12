/**
 * Ambulance icon for ER entrance - subtly animates when inbound impact is High.
 */
export default function AmbulanceIcon({ x, y, impact = 'Low', viewBox }) {
  const isHigh = impact === 'High'

  return (
    <g
      className={`pointer-events-none ${isHigh ? 'animate-pulse' : ''}`}
      transform={`translate(${x}, ${y})`}
    >
      <rect
        x={-12}
        y={-8}
        width={24}
        height={16}
        rx={2}
        fill="rgba(234, 179, 8, 0.3)"
        stroke="rgba(234, 179, 8, 0.6)"
        strokeWidth={1}
      />
      <path
        d="M-6 -4 L2 -4 L2 -2 L6 0 L6 4 L-6 4 Z M0 0 L4 0"
        fill="rgba(234, 179, 8, 0.9)"
        stroke="rgba(234, 179, 8, 0.5)"
        strokeWidth={0.5}
      />
      <circle cx={-4} cy={6} r={2} fill="rgba(30,41,59,0.8)" />
      <circle cx={4} cy={6} r={2} fill="rgba(30,41,59,0.8)" />
      <text
        x={0}
        y={-12}
        textAnchor="middle"
        style={{ fontSize: 8, fill: 'rgba(234,179,8,0.9)', fontWeight: 700 }}
      >
        Incoming
      </text>
    </g>
  )
}
