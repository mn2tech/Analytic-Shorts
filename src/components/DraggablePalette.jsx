import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

/**
 * DraggablePalette - A draggable panel that can dock to screen edges
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Palette content
 * @param {Function} props.onClose - Close handler
 * @param {string} props.storageKey - localStorage key to save position
 * @param {number} props.width - Panel width (default: 256)
 * @param {number} props.height - Panel height (default: auto/full height)
 */
function DraggablePalette({ 
  children, 
  onClose,
  storageKey = 'widget_palette_position',
  width = 256,
  height = null
}) {
  const [position, setPosition] = useState({ x: 0, y: 0, docked: 'right' })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [hasMoved, setHasMoved] = useState(false)
  const paletteRef = useRef(null)
  const containerRef = useRef(null)

  // Load saved position from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        const pos = JSON.parse(saved)
        setPosition(pos)
      } catch (e) {
        console.error('Error loading palette position:', e)
        // Default: dock to right
        setPosition({ x: typeof window !== 'undefined' ? window.innerWidth - width : 0, y: 0, docked: 'right' })
      }
    } else {
      // Default position: docked to right
      if (typeof window !== 'undefined') {
        setPosition({ x: window.innerWidth - width, y: 0, docked: 'right' })
      }
    }
  }, [storageKey, width])

  // Save position to localStorage
  useEffect(() => {
    if (position.x !== 0 || position.y !== 0 || position.docked) {
      localStorage.setItem(storageKey, JSON.stringify(position))
    }
  }, [position, storageKey])

  // Handle window resize - adjust position if docked
  useEffect(() => {
    const handleResize = () => {
      if (!paletteRef.current) return
      
      const rect = paletteRef.current.getBoundingClientRect()
      const windowWidth = window.innerWidth
      const windowHeight = window.innerHeight
      
      setPosition(prev => {
        // If docked, recalculate position based on dock side
        if (prev.docked) {
          switch (prev.docked) {
            case 'left':
              return { ...prev, x: 0, y: 0 }
            case 'right':
              return { ...prev, x: windowWidth - width, y: 0 }
            case 'top':
              return { ...prev, x: 0, y: 0 }
            case 'bottom':
              return { ...prev, x: 0, y: windowHeight - (height || rect.height) }
            default:
              return prev
          }
        }
        
        // If not docked, keep within bounds
        const maxX = windowWidth - rect.width
        const maxY = windowHeight - rect.height
        return {
          ...prev,
          x: Math.min(Math.max(0, prev.x), maxX),
          y: Math.min(Math.max(0, prev.y), maxY)
        }
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [width, height])

  // Calculate dock position (snap to edges)
  const calculateDockPosition = useCallback((x, y, panelWidth, panelHeight) => {
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight
    const snapDistance = 80 // pixels to snap
    
    // Check which edge is closest
    const distanceToLeft = x
    const distanceToRight = windowWidth - x - panelWidth
    const distanceToTop = y
    const distanceToBottom = windowHeight - y - panelHeight
    
    const minDistance = Math.min(distanceToLeft, distanceToRight, distanceToTop, distanceToBottom)
    
    // If close enough to an edge, dock there
    if (minDistance < snapDistance) {
      if (minDistance === distanceToLeft) {
        return { x: 0, y: 0, docked: 'left' }
      } else if (minDistance === distanceToRight) {
        return { x: windowWidth - panelWidth, y: 0, docked: 'right' }
      } else if (minDistance === distanceToTop) {
        return { x: 0, y: 0, docked: 'top' }
      } else {
        return { x: 0, y: windowHeight - panelHeight, docked: 'bottom' }
      }
    }
    
    // No docking - free position
    return { x, y, docked: null }
  }, [])

  const handleMouseDown = useCallback((e) => {
    // Only start drag on left mouse button
    if (e.button !== 0) return
    
    // Don't start drag if clicking on interactive elements
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) {
      return
    }
    
    // Only drag from header area
    if (!e.target.closest('.palette-header')) {
      return
    }
    
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    setHasMoved(false)
    
    if (paletteRef.current) {
      const rect = paletteRef.current.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return
    
    // Mark that we've moved
    if (!hasMoved) {
      const moveDistance = Math.abs(e.clientX - (position.x + dragOffset.x)) + Math.abs(e.clientY - (position.y + dragOffset.y))
      if (moveDistance > 5) {
        setHasMoved(true)
      }
    }
    
    const newX = e.clientX - dragOffset.x
    const newY = e.clientY - dragOffset.y
    
    // Keep panel within bounds
    if (paletteRef.current) {
      const rect = paletteRef.current.getBoundingClientRect()
      const maxX = window.innerWidth - rect.width
      const maxY = window.innerHeight - rect.height
      
      const boundedX = Math.max(0, Math.min(newX, maxX))
      const boundedY = Math.max(0, Math.min(newY, maxY))
      
      setPosition(prev => ({ ...prev, x: boundedX, y: boundedY, docked: null }))
    }
  }, [isDragging, dragOffset, hasMoved, position])

  const handleMouseUp = useCallback((e) => {
    if (!isDragging) return
    
    setIsDragging(false)
    
    // Calculate dock position
    if (paletteRef.current) {
      const rect = paletteRef.current.getBoundingClientRect()
      const docked = calculateDockPosition(position.x, position.y, rect.width, rect.height)
      setPosition(docked)
    }
    
    setHasMoved(false)
  }, [isDragging, position, calculateDockPosition])

  // Global mouse event handlers
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'grabbing'
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.userSelect = ''
        document.body.style.cursor = ''
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Calculate panel dimensions based on dock position
  const panelStyle = useMemo(() => {
    if (position.docked === 'left' || position.docked === 'right') {
      return {
        width: `${width}px`,
        height: height ? `${height}px` : '100vh'
      }
    } else if (position.docked === 'top' || position.docked === 'bottom') {
      return {
        width: '100vw',
        height: height ? `${height}px` : '400px'
      }
    } else {
      // Free position
      return {
        width: `${width}px`,
        height: height ? `${height}px` : '80vh',
        maxHeight: '80vh'
      }
    }
  }, [position.docked, width, height])

  return (
    <div
      ref={containerRef}
      className="fixed z-40"
      style={{
        left: position.docked === 'left' || position.docked === 'top' || position.docked === 'bottom' ? '0' : position.docked === 'right' ? 'auto' : `${position.x}px`,
        right: position.docked === 'right' ? '0' : 'auto',
        top: position.docked === 'top' || position.docked === 'left' || position.docked === 'right' ? '0' : position.docked === 'bottom' ? 'auto' : `${position.y}px`,
        bottom: position.docked === 'bottom' ? '0' : 'auto',
        transition: isDragging ? 'none' : 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), top 0.3s cubic-bezier(0.4, 0, 0.2, 1), right 0.3s cubic-bezier(0.4, 0, 0.2, 1), bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      <div
        ref={paletteRef}
        className="bg-white border border-gray-200 shadow-xl overflow-hidden flex flex-col"
        style={{
          ...panelStyle,
          cursor: isDragging ? 'grabbing' : 'default'
        }}
      >
        {/* Header with drag handle */}
        <div 
          className="palette-header flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900">Add Widgets</h3>
            {position.docked && (
              <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                Docked: {position.docked}
              </span>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
              title="Close palette"
              aria-label="Close widget palette"
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
        
        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}

export default DraggablePalette

