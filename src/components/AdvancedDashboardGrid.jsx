import { useState, useEffect, useMemo } from 'react'
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
  
  // Handle adding a new widget
  const handleAddWidget = (widgetId) => {
    const config = WIDGET_CONFIGS[widgetId]
    if (!config) return
    
    // Make widget visible
    setWidgetVisibility(prev => ({
      ...prev,
      [widgetId]: true
    }))
    
    // Add widget to layouts for all breakpoints
    setLayouts(prevLayouts => {
      const newLayouts = { ...prevLayouts }
      const breakpoints = ['lg', 'md', 'sm', 'xs', 'xxs']
      
      breakpoints.forEach(bp => {
        if (!newLayouts[bp]) {
          newLayouts[bp] = []
        }
        
        // Check if widget already exists in this breakpoint
        const exists = newLayouts[bp].some(item => item.i === widgetId)
        if (exists) return
        
        // Find the highest y position to place new widget below existing ones
        let maxY = 0
        newLayouts[bp].forEach(item => {
          if (item.y + item.h > maxY) {
            maxY = item.y + item.h
          }
        })
        
        // Create new layout item
        const defaultLayout = { ...config.defaultLayout }
        const newItem = {
          i: widgetId,
          x: defaultLayout.x || 0,
          y: maxY + 1, // Place below existing widgets
          w: defaultLayout.w || 6,
          h: defaultLayout.h || 4,
          minW: config.minW,
          minH: config.minH,
          maxW: config.maxW,
          maxH: config.maxH
        }
        
        newLayouts[bp] = [...newLayouts[bp], newItem]
      })
      
      return newLayouts
    })
  }

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
  useEffect(() => {
    if (layouts && typeof layouts === 'object' && Object.keys(layouts).length > 0 && !isDragging) {
      saveLayouts(layouts)
      // Notify parent component of layout changes for sharing
      if (externalOnLayoutChange) {
        externalOnLayoutChange({ layouts, widgetVisibility })
      }
    }
  }, [layouts, widgetVisibility, isDragging, externalOnLayoutChange])

  // Save visibility when it changes
  useEffect(() => {
    if (widgetVisibility && typeof widgetVisibility === 'object' && Object.keys(widgetVisibility).length > 0) {
      saveWidgetVisibility(widgetVisibility)
    }
  }, [widgetVisibility])

  // Get visible widgets
  const visibleWidgets = useMemo(() => {
    if (!widgetVisibility || Object.keys(widgetVisibility).length === 0) {
      return DEFAULT_WIDGETS
    }
    return DEFAULT_WIDGETS.filter(id => widgetVisibility[id] !== false)
  }, [widgetVisibility])

  // Handle layout change
  const handleLayoutChange = (currentLayout, allLayouts) => {
    // Only update if not currently dragging (to avoid updates during drag)
    if (!isDragging) {
      setLayouts(allLayouts)
    }
  }

  // Handle widget delete
  const handleDeleteWidget = (widgetId) => {
    setWidgetVisibility(prev => ({
      ...prev,
      [widgetId]: false
    }))
  }

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
      
      // Filter to only include visible widgets
      const filtered = {}
      if (baseLayouts && typeof baseLayouts === 'object') {
        Object.keys(baseLayouts).forEach(breakpoint => {
          if (Array.isArray(baseLayouts[breakpoint])) {
            filtered[breakpoint] = baseLayouts[breakpoint].filter(item => {
              if (!item || !item.i) return false
              // If widgetVisibility is not initialized yet, show all widgets
              if (!widgetVisibility || typeof widgetVisibility !== 'object' || Object.keys(widgetVisibility).length === 0) {
                return true
              }
              return widgetVisibility[item.i] !== false
            })
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
  }, [layouts, widgetVisibility])

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
    <div className="w-full" style={{ minHeight: '600px' }}>
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

