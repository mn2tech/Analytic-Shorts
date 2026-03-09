import { useCallback, useMemo } from 'react';

const STATUS_COLORS = {
  available: 'rgba(34, 197, 94, 0.35)',
  occupied: 'rgba(239, 68, 68, 0.35)',
  cleaning: 'rgba(234, 179, 8, 0.35)',
  maintenance: 'rgba(107, 114, 128, 0.35)',
  reserved: 'rgba(59, 130, 246, 0.35)',
};

const STROKE_COLORS = {
  default: 'rgba(15, 23, 42, 0.6)',
  selected: 'rgb(30, 64, 175)',
};

export function RoomOverlay({
  rooms,
  selectedRoomId,
  onSelectRoom,
  onUpdateRoom,
  imageDimensions,
  containerRef,
  transform,
}) {
  const imgRect = useMemo(() => {
    const img = containerRef?.current?.querySelector('.floor-image');
    return img ? img.getBoundingClientRect() : null;
  }, [containerRef, transform]);

  const { scaleX, scaleY } = useMemo(() => {
    if (!imgRect || !imageDimensions) return { scaleX: 1, scaleY: 1 };
    return {
      scaleX: (imgRect.width / transform.scale) / imageDimensions.width,
      scaleY: (imgRect.height / transform.scale) / imageDimensions.height,
    };
  }, [imgRect, imageDimensions, transform.scale]);

  const containerRect = containerRef?.current?.getBoundingClientRect();

  const handleCenterDrag = useCallback(
    (roomId, e) => {
      e.stopPropagation();
      const room = rooms.find((r) => r.room_id === roomId);
      if (!room || !imageDimensions) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const startCenter = { ...room.center };

      const onMove = (ev) => {
        const dx = (ev.clientX - startX) / (scaleX || 1);
        const dy = (ev.clientY - startY) / (scaleY || 1);
        const newCenter = {
          x: Math.round(Math.max(0, Math.min(imageDimensions.width, startCenter.x + dx))),
          y: Math.round(Math.max(0, Math.min(imageDimensions.height, startCenter.y + dy))),
        };
        const bbox = room.bbox;
        const newBbox = {
          x: newCenter.x - bbox.width / 2,
          y: newCenter.y - bbox.height / 2,
          width: bbox.width,
          height: bbox.height,
        };
        const polygon = [
          [newBbox.x, newBbox.y],
          [newBbox.x + newBbox.width, newBbox.y],
          [newBbox.x + newBbox.width, newBbox.y + newBbox.height],
          [newBbox.x, newBbox.y + newBbox.height],
        ];
        onUpdateRoom?.(roomId, { bbox: newBbox, center: newCenter, polygon });
      };

      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [rooms, imageDimensions, scaleX, scaleY, onUpdateRoom]
  );

  if (!imgRect || !imageDimensions) return null;

  const baseX = (containerRect?.width ?? 0) / 2 - (imgRect.width / transform.scale) / 2 + transform.x;
  const baseY = (containerRect?.height ?? 0) / 2 - (imgRect.height / transform.scale) / 2 + transform.y;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
      }}
    >
      <svg
        className="absolute pointer-events-auto"
        style={{
          left: baseX,
          top: baseY,
          width: imgRect.width / transform.scale,
          height: imgRect.height / transform.scale,
        }}
        viewBox={`0 0 ${imageDimensions.width} ${imageDimensions.height}`}
        preserveAspectRatio="none"
      >
        {rooms.map((room) => {
          const isSelected = room.room_id === selectedRoomId;
          const fill = STATUS_COLORS[room.status] || STATUS_COLORS.available;
          const stroke = isSelected ? STROKE_COLORS.selected : STROKE_COLORS.default;
          const strokeWidth = isSelected ? 3 : 1.5;

          return (
            <g key={room.room_id} className="room-overlay">
              <rect
                x={room.bbox.x}
                y={room.bbox.y}
                width={room.bbox.width}
                height={room.bbox.height}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                className="pointer-events-auto cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectRoom?.(room.room_id);
                }}
              />
              <circle
                cx={room.center.x}
                cy={room.center.y}
                r={6}
                fill="rgb(30, 64, 175)"
                stroke="white"
                strokeWidth={2}
                className="room-center pointer-events-auto cursor-move"
                onMouseDown={(e) => handleCenterDrag(room.room_id, e)}
              />
              <text
                x={room.center.x}
                y={room.center.y - 10}
                textAnchor="middle"
                className="pointer-events-none select-none"
                style={{ fontSize: 10, fill: '#0f172a', fontWeight: 600 }}
              >
                {room.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
