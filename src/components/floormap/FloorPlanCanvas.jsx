import { useRef, useCallback, useState, useEffect } from 'react';
import { RoomOverlay } from './RoomOverlay';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.15;

export function FloorPlanCanvas({
  imageUrl,
  imageDimensions,
  rooms,
  selectedRoomId,
  onSelectRoom,
  onUpdateRoom,
  onAddRoom,
}) {
  const containerRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastTransform, setLastTransform] = useState({ x: 0, y: 0, scale: 1 });

  const screenToImage = useCallback(
    (screenX, screenY) => {
      if (!containerRef.current || !imageDimensions) return null;
      const rect = containerRef.current.getBoundingClientRect();
      const relX = (screenX - rect.left - transform.x) / transform.scale;
      const relY = (screenY - rect.top - transform.y) / transform.scale;
      const imgRect = containerRef.current.querySelector('.floor-image')?.getBoundingClientRect();
      if (!imgRect) return null;
      const scaleX = imageDimensions.width / (imgRect.width / transform.scale);
      const scaleY = imageDimensions.height / (imgRect.height / transform.scale);
      return {
        x: Math.round(relX * scaleX),
        y: Math.round(relY * scaleY),
      };
    },
    [transform, imageDimensions]
  );

  const handleWheel = useCallback(
    (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      const newScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, transform.scale + delta));
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const scaleFactor = newScale / transform.scale;
      const newX = mouseX - (mouseX - transform.x) * scaleFactor;
      const newY = mouseY - (mouseY - transform.y) * scaleFactor;
      setTransform({ x: newX, y: newY, scale: newScale });
    },
    [transform]
  );

  const handleMouseDown = useCallback(
    (e) => {
      if (e.target.closest('.room-overlay') || e.target.closest('.room-center')) return;
      if (e.button === 0) {
        setIsDragging(true);
        setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
        setLastTransform(transform);
      }
    },
    [transform]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (isDragging) {
        setTransform({
          ...lastTransform,
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    },
    [isDragging, dragStart, lastTransform]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDoubleClick = useCallback(
    (e) => {
      const pt = screenToImage(e.clientX, e.clientY);
      if (pt && imageDimensions) {
        const w = 80;
        const h = 60;
        const x = Math.max(0, Math.min(pt.x - w / 2, imageDimensions.width - w));
        const y = Math.max(0, Math.min(pt.y - h / 2, imageDimensions.height - h));
        onAddRoom?.(x, y, w, h);
      }
    },
    [screenToImage, imageDimensions, onAddRoom]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  if (!imageUrl) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-100 text-slate-500">
        <p className="text-sm">Upload a floor plan to begin</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-slate-200 cursor-grab active:cursor-grabbing select-none"
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      style={{ touchAction: 'none' }}
    >
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: '0 0',
        }}
      >
        <img
          src={imageUrl}
          alt="Floor plan"
          className="floor-image max-w-none max-h-none object-contain"
          draggable={false}
          style={{
            maxWidth: '90vw',
            maxHeight: '80vh',
          }}
        />
      </div>

      {imageDimensions && (
        <RoomOverlay
          rooms={rooms}
          selectedRoomId={selectedRoomId}
          onSelectRoom={onSelectRoom}
          onUpdateRoom={onUpdateRoom}
          imageDimensions={imageDimensions}
          containerRef={containerRef}
          transform={transform}
        />
      )}

      <div className="absolute bottom-4 right-4 flex flex-col gap-1 bg-white/90 rounded-lg shadow-lg p-2 border border-slate-200">
        <button
          type="button"
          onClick={() =>
            setTransform((t) => ({
              ...t,
              scale: Math.min(MAX_ZOOM, t.scale + ZOOM_STEP),
            }))
          }
          className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
          aria-label="Zoom in"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() =>
            setTransform((t) => ({
              ...t,
              scale: Math.max(MIN_ZOOM, t.scale - ZOOM_STEP),
            }))
          }
          className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
          aria-label="Zoom out"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
          </svg>
        </button>
        <div className="text-[10px] text-slate-500 px-1">{Math.round(transform.scale * 100)}%</div>
      </div>
    </div>
  );
}
