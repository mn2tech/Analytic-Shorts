import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

/**
 * DraggableConfigPanel - A draggable configuration panel that can dock to screen edges
 * Similar to DraggablePalette but for widget configuration
 */
function DraggableConfigPanel({ 
  children, 
  onClose,
  storageKey = 'widget_config_panel_position',
  width = 400,
  height = null
}) {
  const [position, setPosition] = useState({ x: 0, y: 0, docked: 'right' })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [hasMoved, setHasMoved] = useState(false)
  const panelRef = useRef(null)
  const containerRef = useRef(null)

  // Load saved position from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        const pos = JSON.parse(saved)
        setPosition(pos)
      } catch (e) {
        console.error('Error loading config panel position:', e)
        // Default: dock to right
        setPosition({ x: window.innerWidth - width, y: 0, docked: 'right' })
      }
    } else {
      // Default position: docked to right
      setPosition({ x: window.innerWidth - width, y: 0, docked: 'right' })
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
      if (!panelRef.current) return
      
      const rect = panelRef.current.getBoundingClientRect()
      const windowWidth = window.innerWidth
      const windowHeight = window.innerHeight
      
      setPosition(prev => {
        if (!prev) return { x: windowWidth - width, y: 0, docked: 'right' }
        
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
    if (!e.target.closest('.config-panel-header')) {
      return
    }
    
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    setHasMoved(false)
    
    if (panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect()
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
    if (panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect()
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
    if (panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect()
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
        height: height ? `${height}px` : '500px'
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

  // Don't render until position is initialized
  if (typeof window === 'undefined') {
    return null
  }

  // Ensure we have a valid position
  const currentPosition = position && (position.docked || position.x !== 0 || position.y !== 0)
    ? position
    : { x: window.innerWidth - width, y: 0, docked: 'right' }

  return (
    <div
      ref={containerRef}
      className="fixed z-[60]"
      style={{
        left: currentPosition.docked === 'left' || currentPosition.docked === 'top' || currentPosition.docked === 'bottom' ? '0' : currentPosition.docked === 'right' ? 'auto' : `${currentPosition.x}px`,
        right: currentPosition.docked === 'right' ? '0' : 'auto',
        top: currentPosition.docked === 'top' || currentPosition.docked === 'left' || currentPosition.docked === 'right' ? '0' : currentPosition.docked === 'bottom' ? 'auto' : `${currentPosition.y}px`,
        bottom: currentPosition.docked === 'bottom' ? '0' : 'auto',
        transition: isDragging ? 'none' : 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), top 0.3s cubic-bezier(0.4, 0, 0.2, 1), right 0.3s cubic-bezier(0.4, 0, 0.2, 1), bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      <div
        ref={panelRef}
        className="bg-white border-2 border-red-500 shadow-xl overflow-hidden flex flex-col"
        style={{
          ...panelStyle,
          cursor: isDragging ? 'grabbing' : 'default',
          minHeight: '400px',
          minWidth: '300px',
          backgroundColor: '#ffffff'
        }}
      >
        {/* Header with drag handle */}
        <div 
          className="config-panel-header flex items-center justify-between p-4 border-b-2 border-blue-500 bg-yellow-200 cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          style={{ backgroundColor: '#fef3c7' }}
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900">Widget Settings - TEST</h3>
            {currentPosition.docked && (
              <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                Docked: {currentPosition.docked}
              </span>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
              title="Close settings"
              aria-label="Close widget settings"
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
        <div className="flex-1 bg-green-100 flex flex-col" style={{ overflow: 'auto', minHeight: '300px', backgroundColor: '#dcfce7' }}>
          <div className="p-2 bg-red-200 text-red-800 font-bold text-xs">
            DEBUG: DraggableConfigPanel Content Area - Children count: {children ? '1' : '0'}
          </div>
          {children ? children : (
            <div className="p-4">
              <p className="text-red-500 font-bold text-lg">DEBUG: No children provided to DraggableConfigPanel</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DraggableConfigPanel

