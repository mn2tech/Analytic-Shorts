/**
 * Toolbar - Actions for detect, add room, export, clear.
 * Healthcare operations styling.
 */
export default function Toolbar({
  onDetectRooms,
  onExport,
  onAddRoom,
  onClearAll,
  isDetecting,
  isExporting,
  hasImage,
  hasRooms,
}) {
  const handleAddRoom = () => {
    onAddRoom?.({ x: 100, y: 100, width: 80, height: 60 })
  }

  return (
    <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-white border-b border-slate-200">
      <button
        type="button"
        onClick={onDetectRooms}
        disabled={!hasImage || isDetecting}
        className="px-3 py-1.5 text-sm font-medium rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {isDetecting ? (
          <>
            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Detecting...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Detect Rooms
          </>
        )}
      </button>
      <button
        type="button"
        onClick={handleAddRoom}
        disabled={!hasImage}
        className="px-3 py-1.5 text-sm font-medium rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Add Room
      </button>
      <button
        type="button"
        onClick={onExport}
        disabled={!hasImage || !hasRooms || isExporting}
        className="px-3 py-1.5 text-sm font-medium rounded-md bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {isExporting ? (
          <>
            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export JSON
          </>
        )}
      </button>
      <button
        type="button"
        onClick={onClearAll}
        disabled={!hasRooms}
        className="px-3 py-1.5 text-sm font-medium rounded-md border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Clear All
      </button>
    </div>
  )
}
