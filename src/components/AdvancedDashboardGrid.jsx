import { useState, useEffect, useMemo, useCallback } from 'react'
import GridLayout from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import DashboardWidget from './DashboardWidget'
import WidgetRenderer from './widgets/WidgetRenderer'
import { WIDGET_CONFIGS, DEFAULT_WIDGETS, getDefaultLayouts } from '../config/widgetConfig'
import { saveLayouts, loadLayouts, saveWidgetVisibility, loadWidgetVisibility, validateAndFixLayouts } from '../utils/layoutPersistence'

function AdvancedDashboardGrid({ 
  data, 
  filteredData, 
  selectedNumeric, 
  selectedCategorical, 
  selectedDate, 
  onChartFilter, 
  chartFilter, 
  categoricalColumns,
  onLayoutChange: externalOnLayoutChange, // Callback to notify parent of layout changes
  onAddWidgetReady // Callback to pass addWidget function to parent
}) {
  const [layouts, setLayouts] = useState({})
  const [widgetVisibility, setWidgetVisibility] = useState({})
  const [isDragging, setIsDragging] = useState(false)
  
  // Handle adding a new widget - optimized with batched updates and async processing
  const handleAddWidget = useCallback((widgetId) => {
    const config = WIDGET_CONFIGS[widgetId]
    if (!config) return
    
    // Defer all state updates to next tick to prevent blocking
    setTimeout(() => {
      // Batch both state updates together
      setWidgetVisibility(prev => {
        // Check if already visible to avoid unnecessary update
        if (prev[widgetId] === true) return prev
        
        return {
          ...prev,
          [widgetId]: true
        }
      })
      
      setLayouts(prevLayouts => {
        const newLayouts = { ...prevLayouts }
        const breakpoints = ['lg', 'md', 'sm', 'xs', 'xxs']
        let hasChanges = false
        
        breakpoints.forEach(bp => {
          if (!newLayouts[bp]) {
            newLayouts[bp] = []
          }
          
          // Check if widget already exists in this breakpoint
          const exists = newLayouts[bp].some(item => item.i === widgetId)
          if (exists) return
          
          hasChanges = true
          
          // Find next available position that doesn't overlap
          const defaultLayout = { ...config.defaultLayout }
          const cols = bp === 'lg' ? 12 : bp === 'md' ? 10 : bp === 'sm' ? 6 : 6
          const width = defaultLayout.w || 6
          const height = defaultLayout.h || 4
          
          // Find position that doesn't overlap with existing widgets
          let foundPosition = false
          let testY = 0
          let testX = 0
          
          while (!foundPosition && testY < 50) {
            const testItem = { x: testX, y: testY, w: width, h: height }
            const overlaps = newLayouts[bp].some(item => {
              return !(
                testItem.x + testItem.w <= item.x ||
                item.x + item.w <= testItem.x ||
                testItem.y + testItem.h <= item.y ||
                item.y + item.h <= testItem.y
              )
            })
            
            if (!overlaps) {
              foundPosition = true
            } else {
              testX += width
              if (testX + width > cols) {
                testX = 0
                testY += height + 1 // Add spacing between rows
              }
            }
          }
          
          // Fallback: place at bottom if no position found
          if (!foundPosition) {
            let maxY = 0
            newLayouts[bp].forEach(item => {
              if (item.y + item.h > maxY) {
                maxY = item.y + item.h
              }
            })
            testX = 0
            testY = maxY + 1
          }
          
          const newItem = {
            i: widgetId,
            x: testX,
            y: testY,
            w: width,
            h: height,
            minW: config.minW,
            minH: config.minH,
            maxW: config.maxW,
            maxH: config.maxH
          }
          
          newLayouts[bp] = [...newLayouts[bp], newItem]
        })
        
        // Only return new object if there were changes
        return hasChanges ? newLayouts : prevLayouts
      })
    }, 0) // Defer to next event loop tick
  }, [])

  // Initialize layouts and visibility
  useEffect(() => {
    // Check if layouts were passed from shared dashboard (via URL params or localStorage)
    const urlParams = new URLSearchParams(window.location.search)
    const pathParts = window.location.pathname.split('/shared/')
    const shareId = urlParams.get('share') || (pathParts.length > 1 ? pathParts[1] : null)
    
    let savedLayouts = null
    let savedVisibility = null
    
    if (shareId) {
      // Try to load from shared dashboard
      try {
        const sharedData = localStorage.getItem(`shared_dashboard_${shareId}`)
        if (sharedData) {
          const parsed = JSON.parse(sharedData)
          if (parsed.layouts) savedLayouts = parsed.layouts
          if (parsed.widgetVisibility) savedVisibility = parsed.widgetVisibility
        }
      } catch (error) {
        console.error('Error loading shared layouts:', error)
      }
    }
    
    // Fallback to user's saved layouts
    if (!savedLayouts) {
      savedLayouts = loadLayouts()
    }
    if (!savedVisibility) {
      savedVisibility = loadWidgetVisibility()
    }
    
    // Validate and fix saved layouts
    const validatedLayouts = savedLayouts ? validateAndFixLayouts(savedLayouts) : null
    
    if (validatedLayouts && typeof validatedLayouts === 'object' && !Array.isArray(validatedLayouts) && Object.keys(validatedLayouts).length > 0) {
      setLayouts(validatedLayouts)
    } else {
      const defaultLayouts = getDefaultLayouts()
      setLayouts(defaultLayouts)
    }
    
    if (savedVisibility && typeof savedVisibility === 'object' && !Array.isArray(savedVisibility) && Object.keys(savedVisibility).length > 0) {
      setWidgetVisibility(savedVisibility)
    } else {
      // All widgets visible by default
      const defaultVisibility = {}
      DEFAULT_WIDGETS.forEach(id => {
        defaultVisibility[id] = true
      })
      setWidgetVisibility(defaultVisibility)
    }
  }, [])

  // Save layouts when they change (but not during drag) and notify parent
  // Use debouncing to prevent excessive updates
  useEffect(() => {
    if (layouts && typeof layouts === 'object' && Object.keys(layouts).length > 0 && !isDragging) {
      // Save to localStorage immediately (lightweight operation)
      saveLayouts(layouts)
      
      // Debounce parent notification to avoid blocking UI
      const timeoutId = setTimeout(() => {
        if (externalOnLayoutChange) {
          // Create stable references to prevent infinite loops
          externalOnLayoutChange({ 
            layouts: { ...layouts }, 
            widgetVisibility: { ...widgetVisibility } 
          })
        }
      }, 100) // 100ms debounce
      
      return () => clearTimeout(timeoutId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layouts, widgetVisibility, isDragging]) // Removed externalOnLayoutChange from deps to prevent loops

  // Save visibility when it changes
  useEffect(() => {
    if (widgetVisibility && typeof widgetVisibility === 'object' && Object.keys(widgetVisibility).length > 0) {
      saveWidgetVisibility(widgetVisibility)
    }
  }, [widgetVisibility])

  // Get visible widgets - include all widgets that are visible, not just DEFAULT_WIDGETS
  // But only include widgets that have layouts defined
  // Optimized: Create a Set of widget IDs with layouts for O(1) lookup
  const visibleWidgets = useMemo(() => {
    // First, get all widget IDs that should be visible based on visibility state
    let candidateWidgets = []
    
    if (!widgetVisibility || typeof widgetVisibility !== 'object' || Object.keys(widgetVisibility).length === 0) {
      // If no visibility state, use defaults
      candidateWidgets = DEFAULT_WIDGETS
    } else {
      // Get all widget IDs that are visible (either true or not set to false)
      const allWidgetIds = Object.keys(WIDGET_CONFIGS)
      candidateWidgets = allWidgetIds.filter(id => widgetVisibility[id] !== false)
    }
    
    // Create a Set of widget IDs that have layouts (for fast lookup)
    const widgetsWithLayoutsSet = new Set()
    if (layouts && typeof layouts === 'object') {
      const breakpoints = ['lg', 'md', 'sm', 'xs', 'xxs']
      breakpoints.forEach(bp => {
        if (layouts[bp] && Array.isArray(layouts[bp])) {
          layouts[bp].forEach(item => {
            if (item && item.i) {
              widgetsWithLayoutsSet.add(item.i)
            }
          })
        }
      })
    }
    
    // Filter candidate widgets using Set lookup (O(1) instead of O(n))
    const widgetsWithLayouts = candidateWidgets.filter(widgetId => 
      widgetsWithLayoutsSet.has(widgetId)
    )
    
    // If no widgets have layouts yet, return defaults (for initial render)
    return widgetsWithLayouts.length > 0 ? widgetsWithLayouts : DEFAULT_WIDGETS
  }, [widgetVisibility, layouts])

  // Handle layout change
  const handleLayoutChange = (currentLayout, allLayouts) => {
    // Only update if not currently dragging (to avoid updates during drag)
    if (!isDragging) {
      setLayouts(allLayouts)
    }
  }

  // Handle widget delete
  const handleDeleteWidget = useCallback((widgetId) => {
    // Set visibility to false
    setWidgetVisibility(prev => ({
      ...prev,
      [widgetId]: false
    }))
    
    // Also remove from layouts
    setLayouts(prevLayouts => {
      const newLayouts = { ...prevLayouts }
      const breakpoints = ['lg', 'md', 'sm', 'xs', 'xxs']
      
      breakpoints.forEach(bp => {
        if (newLayouts[bp] && Array.isArray(newLayouts[bp])) {
          newLayouts[bp] = newLayouts[bp].filter(item => item.i !== widgetId)
        }
      })
      
      return newLayouts
    })
  }, [])

  // Helper function to fix overlapping widgets in a layout
  const fixOverlappingWidgets = useCallback((layoutArray, cols = 12) => {
    if (!Array.isArray(layoutArray) || layoutArray.length === 0) return layoutArray
    
    const fixed = []
    
    layoutArray.forEach(item => {
      if (!item || !item.i) return
      
      // Check if this item overlaps with any already processed item
      let overlaps = false
      let newX = item.x
      let newY = item.y
      
      for (const existing of fixed) {
        if (!(
          newX + item.w <= existing.x ||
          existing.x + existing.w <= newX ||
          newY + item.h <= existing.y ||
          existing.y + existing.h <= newY
        )) {
          overlaps = true
          break
        }
      }
      
      // If overlaps, find next available position
      if (overlaps) {
        let found = false
        let testY = 0
        let testX = 0
        
        while (!found && testY < 50) {
          const testOverlaps = fixed.some(existing => {
            return !(
              testX + item.w <= existing.x ||
              existing.x + existing.w <= testX ||
              testY + item.h <= existing.y ||
              existing.y + existing.h <= testY
            )
          })
          
          if (!testOverlaps) {
            newX = testX
            newY = testY
            found = true
          } else {
            testX += item.w
            if (testX + item.w > cols) {
              testX = 0
              testY += item.h + 1
            }
          }
        }
        
        // Fallback: place at bottom
        if (!found) {
          const maxY = fixed.length > 0 
            ? Math.max(...fixed.map(existing => existing.y + existing.h))
            : 0
          newX = 0
          newY = maxY + 1
        }
      }
      
      fixed.push({
        ...item,
        x: newX,
        y: newY
      })
    })
    
    return fixed
  }, [])

  // Initialize default layouts if not loaded and filter to only include visible widgets
  const currentLayouts = useMemo(() => {
    try {
      // Get base layouts
      let baseLayouts
      if (!layouts || typeof layouts !== 'object' || Object.keys(layouts).length === 0) {
        baseLayouts = getDefaultLayouts()
      } else {
        baseLayouts = layouts
      }
      
      // Ensure baseLayouts is valid
      if (!baseLayouts || typeof baseLayouts !== 'object' || Array.isArray(baseLayouts)) {
        baseLayouts = getDefaultLayouts()
      }
      
      // Filter to only include visible widgets and fix overlaps
      const filtered = {}
      if (baseLayouts && typeof baseLayouts === 'object') {
        Object.keys(baseLayouts).forEach(breakpoint => {
          if (Array.isArray(baseLayouts[breakpoint])) {
            // First filter by visibility
            let visibleItems = baseLayouts[breakpoint].filter(item => {
              if (!item || !item.i) return false
              // If widgetVisibility is not initialized yet, show all widgets
              if (!widgetVisibility || typeof widgetVisibility !== 'object' || Object.keys(widgetVisibility).length === 0) {
                return true
              }
              return widgetVisibility[item.i] !== false
            })
            
            // Then fix any overlaps
            const cols = breakpoint === 'lg' ? 12 : breakpoint === 'md' ? 10 : 6
            filtered[breakpoint] = fixOverlappingWidgets(visibleItems, cols)
          }
        })
      }
      
      // Ensure we have at least the default layouts
      if (Object.keys(filtered).length === 0) {
        return getDefaultLayouts()
      }
      
      return filtered
    } catch (error) {
      console.error('Error calculating currentLayouts:', error)
      return getDefaultLayouts()
    }
  }, [layouts, widgetVisibility, fixOverlappingWidgets])

  // Grid layout breakpoints (matching Tailwind breakpoints)
  const breakpoints = { lg: 1200, md: 768, sm: 640, xs: 480, xxs: 0 }
  const cols = { lg: 12, md: 10, sm: 6, xs: 6, xxs: 6 }

  // Don't render until layouts are initialized
  if (!currentLayouts || typeof currentLayouts !== 'object' || Object.keys(currentLayouts).length === 0) {
    return (
      <div className="w-full flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading dashboard layout...</div>
      </div>
    )
  }

  // Ensure currentLayouts is valid before rendering GridLayout
  const safeLayouts = useMemo(() => {
    try {
      if (!currentLayouts || typeof currentLayouts !== 'object' || Array.isArray(currentLayouts)) {
        return getDefaultLayouts()
      }
      // Ensure all breakpoints have valid arrays
      const safe = {}
      const requiredBreakpoints = ['lg', 'md', 'sm', 'xs', 'xxs']
      
      requiredBreakpoints.forEach(bp => {
        if (currentLayouts[bp] && Array.isArray(currentLayouts[bp])) {
          safe[bp] = currentLayouts[bp]
        } else {
          // If breakpoint is missing, use lg layout as fallback
          if (currentLayouts.lg && Array.isArray(currentLayouts.lg)) {
            safe[bp] = currentLayouts.lg
          } else {
            // Last resort: use default layouts
            const defaults = getDefaultLayouts()
            safe[bp] = defaults[bp] || defaults.lg || []
          }
        }
      })
      
      // Ensure we have at least one valid breakpoint
      if (Object.keys(safe).length === 0) {
        return getDefaultLayouts()
      }
      
      return safe
    } catch (error) {
      console.error('Error creating safeLayouts:', error)
      return getDefaultLayouts()
    }
  }, [currentLayouts])

  return (
    <div 
      className="w-full" 
      style={{ minHeight: '600px' }}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
      }}
    >
      <GridLayout
        className="layout"
        layouts={safeLayouts}
        breakpoints={breakpoints}
        cols={cols}
        rowHeight={60}
        onLayoutChange={handleLayoutChange}
        onDragStart={() => {
          setIsDragging(true)
        }}
        onDrag={(layout, oldItem, newItem, placeholder, e, element) => {
          // Keep dragging state active during drag
        }}
        onDragStop={(layout, oldItem, newItem, placeholder, e, element) => {
          setIsDragging(false)
          // Update layouts after drag stops - preserve all breakpoints
          if (currentLayouts && typeof currentLayouts === 'object' && !Array.isArray(currentLayouts)) {
            const allLayouts = { ...currentLayouts }
            // Update the current breakpoint's layout
            // React Grid Layout will determine which breakpoint we're on
            // For now, update all breakpoints with the new layout
            if (allLayouts && typeof allLayouts === 'object') {
              Object.keys(allLayouts).forEach(bp => {
                allLayouts[bp] = layout
              })
              setLayouts(allLayouts)
            }
          }
        }}
        onResizeStart={() => {
          setIsDragging(true)
        }}
        onResize={(layout, oldItem, newItem, placeholder, e, element) => {
          // Keep dragging state active during resize
        }}
        onResizeStop={(layout, oldItem, newItem, placeholder, e, element) => {
          setIsDragging(false)
          // Update layouts after resize stops - preserve all breakpoints
          if (currentLayouts && typeof currentLayouts === 'object' && !Array.isArray(currentLayouts)) {
            const allLayouts = { ...currentLayouts }
            // Update the current breakpoint's layout
            if (allLayouts && typeof allLayouts === 'object') {
              Object.keys(allLayouts).forEach(bp => {
                allLayouts[bp] = layout
              })
              setLayouts(allLayouts)
            }
          }
        }}
        isDraggable={true}
        isResizable={true}
        resizeHandles={['s', 'w', 'e', 'n', 'sw', 'nw', 'se', 'ne']} // Enable all resize handles
        draggableHandle=".drag-handle"
        compactType={null}
        preventCollision={true}
        margin={[16, 16]}
        containerPadding={[16, 16]}
        onDrop={(layout, layoutItem, e) => {
          // Handle drop from external source (widget palette)
          const widgetId = e.dataTransfer?.getData('widgetId')
          if (widgetId && WIDGET_CONFIGS[widgetId]) {
            // Make widget visible
            setWidgetVisibility(prev => ({
              ...prev,
              [widgetId]: true
            }))
            
            // Add widget to layouts at drop position
            setLayouts(prevLayouts => {
              const newLayouts = { ...prevLayouts }
              const breakpoints = ['lg', 'md', 'sm', 'xs', 'xxs']
              
              breakpoints.forEach(bp => {
                if (!newLayouts[bp]) {
                  newLayouts[bp] = []
                }
                
                // Check if widget already exists
                const exists = newLayouts[bp].some(item => item.i === widgetId)
                if (!exists) {
                  const config = WIDGET_CONFIGS[widgetId]
                  const newItem = {
                    i: widgetId,
                    x: layoutItem.x || 0,
                    y: layoutItem.y || 0,
                    w: layoutItem.w || config.defaultLayout.w || 6,
                    h: layoutItem.h || config.defaultLayout.h || 4,
                    minW: config.minW,
                    minH: config.minH,
                    maxW: config.maxW,
                    maxH: config.maxH
                  }
                  newLayouts[bp] = [...newLayouts[bp], newItem]
                }
              })
              
              return newLayouts
            })
          }
        }}
        droppingItem={{ i: '__dropping-elem__', w: 6, h: 4 }}
      >
        {visibleWidgets.map(widgetId => {
          const config = WIDGET_CONFIGS[widgetId]
          if (!config) return null
          
          try {
            return (
              <div key={widgetId}>
                <DashboardWidget
                  id={widgetId}
                  title={config.title}
                  onDelete={handleDeleteWidget}
                  isDragging={isDragging}
                >
                  <WidgetRenderer
                    widgetId={widgetId}
                    data={data}
                    filteredData={filteredData}
                    selectedNumeric={selectedNumeric}
                    selectedCategorical={selectedCategorical}
                    selectedDate={selectedDate}
                    chartFilter={chartFilter}
                    onChartFilter={onChartFilter}
                    categoricalColumns={categoricalColumns}
                  />
                </DashboardWidget>
              </div>
            )
          } catch (error) {
            console.error(`Error rendering widget ${widgetId}:`, error)
            return (
              <div key={widgetId}>
                <div className="bg-white rounded-lg shadow-sm p-4 border border-red-200">
                  <p className="text-red-600">Error loading widget: {config.title}</p>
                </div>
              </div>
            )
          }
        })}
      </GridLayout>
    </div>
  )
}

export default AdvancedDashboardGrid

