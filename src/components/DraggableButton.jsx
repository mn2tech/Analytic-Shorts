import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * DraggableButton - A button that can be dragged and docked to different positions
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Button content
 * @param {Function} props.onClick - Click handler
 * @param {string} props.storageKey - localStorage key to save position
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.title - Button title/tooltip
 */
function DraggableButton({ 
  children, 
  onClick, 
  storageKey = 'draggable_button_position',
  className = '',
  title = '',
  avoidArea = null // { x, y, width, height } - area to avoid (e.g., widget palette)
}) {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [hasMoved, setHasMoved] = useState(false)
  const [dockedPosition, setDockedPosition] = useState(null)
  const buttonRef = useRef(null)
  const containerRef = useRef(null)
  
  // Grid area to avoid (accounting for padding)
  const GRID_PADDING = 16
  const GRID_START_Y = 0 // Top of grid area

  // Load saved position from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        const pos = JSON.parse(saved)
        setPosition(pos)
      } catch (e) {
        console.error('Error loading button position:', e)
      }
    } else {
      // Default position: top-right
      setPosition({ x: window.innerWidth - 200, y: 16 })
    }
  }, [storageKey])

  // Save position to localStorage
  useEffect(() => {
    if (position.x !== 0 || position.y !== 0) {
      localStorage.setItem(storageKey, JSON.stringify(position))
    }
  }, [position, storageKey])

  // Handle window resize and avoidArea changes - keep button in bounds and avoid overlap
  useEffect(() => {
    const handleResize = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect()
        const maxX = window.innerWidth - rect.width
        const maxY = window.innerHeight - rect.height
        
        setPosition(prev => {
          let newX = Math.min(Math.max(0, prev.x), maxX)
          let newY = Math.min(Math.max(0, prev.y), maxY)
          
          // Check if button overlaps with avoidArea
          if (avoidArea) {
            const buttonRight = newX + rect.width
            const buttonBottom = newY + rect.height
            const avoidRight = avoidArea.x + avoidArea.width
            const avoidBottom = avoidArea.y + avoidArea.height
            
            if (!(buttonRight < avoidArea.x || newX > avoidRight || buttonBottom < avoidArea.y || newY > avoidBottom)) {
              // Overlap detected - move button away
              if (newX < window.innerWidth / 2) {
                newX = avoidArea.x - rect.width - GRID_PADDING
              } else {
                newX = Math.min(avoidArea.x - rect.width - GRID_PADDING, window.innerWidth - rect.width - GRID_PADDING)
              }
            }
          }
          
          return { x: newX, y: newY }
        })
      }
    }

    window.addEventListener('resize', handleResize)
    
    // Also check position when avoidArea changes
    if (avoidArea) {
      handleResize()
    }
    
    return () => window.removeEventListener('resize', handleResize)
  }, [avoidArea])

  // Calculate dock position (snap to corners/edges, avoiding widget areas)
  const calculateDockPosition = useCallback((x, y, width, height) => {
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight
    const snapDistance = 60 // pixels to snap (increased for better UX)
    
    // Account for widget palette if open (typically 256px wide on right side)
    const paletteWidth = avoidArea?.width || 0
    const safeRightEdge = windowWidth - paletteWidth - 16
    
    // Define safe docking zones (avoiding grid area and palette)
    const safeZones = {
      topLeft: { x: GRID_PADDING, y: GRID_PADDING },
      topRight: { x: Math.min(safeRightEdge - width, windowWidth - width - GRID_PADDING), y: GRID_PADDING },
      bottomLeft: { x: GRID_PADDING, y: windowHeight - height - GRID_PADDING },
      bottomRight: { x: Math.min(safeRightEdge - width, windowWidth - width - GRID_PADDING), y: windowHeight - height - GRID_PADDING },
      top: { x: Math.max(GRID_PADDING, Math.min(x, safeRightEdge - width)), y: GRID_PADDING },
      bottom: { x: Math.max(GRID_PADDING, Math.min(x, safeRightEdge - width)), y: windowHeight - height - GRID_PADDING },
      left: { x: GRID_PADDING, y: Math.max(GRID_PADDING, Math.min(y, windowHeight - height - GRID_PADDING)) },
      right: { x: Math.min(safeRightEdge - width, windowWidth - width - GRID_PADDING), y: Math.max(GRID_PADDING, Math.min(y, windowHeight - height - GRID_PADDING)) }
    }
    
    // Check corners first (highest priority)
    // Top-left
    if (x < snapDistance && y < snapDistance) {
      return { ...safeZones.topLeft, docked: 'top-left' }
    }
    // Top-right
    if (x > windowWidth - width - snapDistance && y < snapDistance) {
      return { ...safeZones.topRight, docked: 'top-right' }
    }
    // Bottom-left
    if (x < snapDistance && y > windowHeight - height - snapDistance) {
      return { ...safeZones.bottomLeft, docked: 'bottom-left' }
    }
    // Bottom-right
    if (x > windowWidth - width - snapDistance && y > windowHeight - height - snapDistance) {
      return { ...safeZones.bottomRight, docked: 'bottom-right' }
    }
    
    // Check edges (medium priority)
    // Top edge
    if (y < snapDistance) {
      return { ...safeZones.top, docked: 'top' }
    }
    // Bottom edge
    if (y > windowHeight - height - snapDistance) {
      return { ...safeZones.bottom, docked: 'bottom' }
    }
    // Left edge
    if (x < snapDistance) {
      return { ...safeZones.left, docked: 'left' }
    }
    // Right edge
    if (x > safeRightEdge - snapDistance || x > windowWidth - width - snapDistance) {
      return { ...safeZones.right, docked: 'right' }
    }
    
    // No docking - free position, but ensure it doesn't overlap with avoid area
    let finalX = x
    let finalY = y
    
    if (avoidArea) {
      const buttonRight = x + width
      const buttonBottom = y + height
      const avoidRight = avoidArea.x + avoidArea.width
      const avoidBottom = avoidArea.y + avoidArea.height
      
      // Check if button overlaps with avoid area
      if (!(buttonRight < avoidArea.x || x > avoidRight || buttonBottom < avoidArea.y || y > avoidBottom)) {
        // Overlap detected - move button away
        if (x < windowWidth / 2) {
          // Move to left side
          finalX = avoidArea.x - width - GRID_PADDING
        } else {
          // Move to right side (but not into palette)
          finalX = Math.min(safeRightEdge - width, windowWidth - width - GRID_PADDING)
        }
      }
    }
    
    return { x: finalX, y: finalY, docked: null }
  }, [avoidArea])

  const handleMouseDown = useCallback((e) => {
    // Only start drag on left mouse button
    if (e.button !== 0) return
    
    // Always allow dragging from anywhere on the button
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    setHasMoved(false)
    
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return
    
    // Mark that we've moved (to distinguish drag from click)
    if (!hasMoved) {
      const moveDistance = Math.abs(e.clientX - (position.x + dragOffset.x)) + Math.abs(e.clientY - (position.y + dragOffset.y))
      if (moveDistance > 5) {
        setHasMoved(true)
      }
    }
    
    const newX = e.clientX - dragOffset.x
    const newY = e.clientY - dragOffset.y
    
    // Keep button within bounds
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const maxX = window.innerWidth - rect.width
      const maxY = window.innerHeight - rect.height
      
      const boundedX = Math.max(0, Math.min(newX, maxX))
      const boundedY = Math.max(0, Math.min(newY, maxY))
      
      setPosition({ x: boundedX, y: boundedY })
    }
  }, [isDragging, dragOffset, hasMoved, position])

  const handleMouseUp = useCallback((e) => {
    if (!isDragging) return
    
    setIsDragging(false)
    
    // Calculate dock position
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const docked = calculateDockPosition(position.x, position.y, rect.width, rect.height)
      setPosition({ x: docked.x, y: docked.y })
      setDockedPosition(docked.docked)
      
      // Clear docked indicator after animation
      setTimeout(() => setDockedPosition(null), 1000)
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

  const handleClick = useCallback((e) => {
    // Only trigger onClick if we didn't just drag (moved more than 5px)
    if (!hasMoved && onClick) {
      e.stopPropagation()
      onClick(e)
    }
  }, [hasMoved, onClick])

  return (
    <div
      ref={containerRef}
      className="fixed z-50"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transition: isDragging ? 'none' : 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), top 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      <div
        ref={buttonRef}
        className="relative group"
        onMouseDown={handleMouseDown}
        style={{
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      >
        {/* Dock indicator - shows when button is docked */}
        {dockedPosition && (
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none animate-fade-in">
            Docked: {dockedPosition.replace('-', ' ')}
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
          </div>
        )}
        
        {/* Drag handle indicator - visible on hover */}
        <div 
          className="absolute -left-1 -top-1 w-6 h-6 bg-gray-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing flex items-center justify-center z-10"
          title="Drag to move and dock button"
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </div>
        
        <button
          onClick={handleClick}
          className={`relative ${className}`}
          title={title || 'Drag to move and dock, click to toggle'}
          onMouseDown={(e) => {
            // Allow button to be draggable but also clickable
            // The parent's handleMouseDown will handle the drag
            // This click handler will only fire if we didn't drag
          }}
        >
          {children}
        </button>
      </div>
    </div>
  )
}

export default DraggableButton

