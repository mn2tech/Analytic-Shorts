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
    
    if (validatedLayouts && Object.keys(validatedLayouts).length > 0) {
      setLayouts(validatedLayouts)
    } else {
      const defaultLayouts = getDefaultLayouts()
      setLayouts(defaultLayouts)
    }
    
    if (savedVisibility && Object.keys(savedVisibility).length > 0) {
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
    if (Object.keys(layouts).length > 0 && !isDragging) {
      saveLayouts(layouts)
    }
  }, [layouts, isDragging])

  // Save visibility when it changes
  useEffect(() => {
    if (Object.keys(widgetVisibility).length > 0) {
      saveWidgetVisibility(widgetVisibility)
    }
  }, [widgetVisibility])

  // Get visible widgets
  const visibleWidgets = useMemo(() => {
    return DEFAULT_WIDGETS.filter(id => widgetVisibility[id] !== false)
  }, [widgetVisibility])

  // Filter layouts to only include visible widgets
  const filterLayoutsForVisibleWidgets = (allLayouts) => {
    const filtered = {}
    Object.keys(allLayouts).forEach(breakpoint => {
      filtered[breakpoint] = allLayouts[breakpoint].filter(item => 
        widgetVisibility[item.i] !== false
      )
    })
    return filtered
  }

  // Initialize default layouts if not loaded
  const currentLayouts = useMemo(() => {
    let baseLayouts
    if (Object.keys(layouts).length === 0) {
      baseLayouts = getDefaultLayouts()
    } else {
      baseLayouts = layouts
    }
    // Filter to only include visible widgets
    return filterLayoutsForVisibleWidgets(baseLayouts)
  }, [layouts, widgetVisibility])

  // Grid layout breakpoints (matching Tailwind breakpoints)
  const breakpoints = { lg: 1200, md: 768, sm: 640, xs: 480, xxs: 0 }
  const cols = { lg: 12, md: 10, sm: 6, xs: 6, xxs: 6 }

  // Don't render until layouts are initialized
  if (Object.keys(currentLayouts).length === 0) {
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
          // Update layouts after drag stops
          const allLayouts = {}
          Object.keys(currentLayouts).forEach(bp => {
            allLayouts[bp] = layout
          })
          setLayouts(allLayouts)
        }}
        onResizeStart={() => {
          setIsDragging(true)
        }}
        onResize={(layout, oldItem, newItem, placeholder, e, element) => {
          // Keep dragging state active during resize
        }}
        onResizeStop={(layout, oldItem, newItem, placeholder, e, element) => {
          setIsDragging(false)
          // Update layouts after resize stops
          const allLayouts = {}
          Object.keys(currentLayouts).forEach(bp => {
            allLayouts[bp] = layout
          })
          setLayouts(allLayouts)
        }}
        isDraggable={true}
        isResizable={true}
        draggableHandle=".drag-handle"
        compactType="vertical"
        preventCollision={true}
        margin={[16, 16]}
        containerPadding={[16, 16]}
      >
        {visibleWidgets.map(widgetId => {
          const config = WIDGET_CONFIGS[widgetId]
          if (!config) return null
          
          return (
            <div key={widgetId} className="widget-container">
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
        })}
      </GridLayout>
    </div>
  )
}

export default AdvancedDashboardGrid

