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
  categoricalColumns 
}) {
  const [layouts, setLayouts] = useState({})
  const [widgetVisibility, setWidgetVisibility] = useState({})
  const [isDragging, setIsDragging] = useState(false)

  // Initialize layouts and visibility
  useEffect(() => {
    const savedLayouts = loadLayouts()
    const savedVisibility = loadWidgetVisibility()
    
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

  // Save layouts when they change (but not during drag)
  useEffect(() => {
    if (layouts && typeof layouts === 'object' && Object.keys(layouts).length > 0 && !isDragging) {
      saveLayouts(layouts)
    }
  }, [layouts, isDragging])

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

  return (
    <div className="w-full" style={{ minHeight: '600px' }}>
      <GridLayout
        className="layout"
        layouts={currentLayouts}
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

