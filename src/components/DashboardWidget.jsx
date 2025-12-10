import { memo } from 'react'

/**
 * DashboardWidget - Wrapper component for dashboard widgets with drag handle and delete button
 * 
 * @param {Object} props
 * @param {string} props.id - Widget ID
 * @param {string} props.title - Widget title
 * @param {React.ReactNode} props.children - Widget content
 * @param {Function} props.onDelete - Callback when delete button is clicked
 * @param {boolean} props.isDragging - Whether widget is currently being dragged
 */
function DashboardWidget({ id, title, children, onDelete, isDragging }) {
  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow ${
        isDragging ? 'shadow-lg opacity-90' : ''
      }`}
      style={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header with drag handle and delete button */}
      <div
        className="drag-handle flex justify-between items-center p-4 border-b border-gray-200 cursor-move"
        style={{ 
          // Make entire header a drag handle
          userSelect: 'none',
          WebkitUserSelect: 'none'
        }}
      >
        <h3 className="text-lg font-semibold text-gray-900 flex-1">
          {title}
        </h3>
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (window.confirm(`Remove "${title}" widget?`)) {
                onDelete(id)
              }
            }}
            className="ml-2 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Remove widget"
            aria-label={`Remove ${title} widget`}
          >
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
          </button>
        )}
      </div>
      
      {/* Widget content */}
      <div className="flex-1 p-4 overflow-auto" style={{ minHeight: 0 }}>
        {children}
      </div>
    </div>
  )
}

export default memo(DashboardWidget)

