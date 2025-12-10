import { useState, useEffect, useMemo } from 'react'
import GridLayout from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import DashboardWidget from './DashboardWidget'
import WidgetRenderer from './widgets/WidgetRenderer'
import { WIDGET_CONFIGS, DEFAULT_WIDGETS, getDefaultLayouts } from '../config/widgetConfig'
import { saveLayouts, loadLayouts, saveWidgetVisibility, loadWidgetVisibility } from '../utils/layoutPersistence'

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
    
    if (savedLayouts && Object.keys(savedLayouts).length > 0) {
      setLayouts(savedLayouts)
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

  // Save layouts when they change
  useEffect(() => {
    if (Object.keys(layouts).length > 0) {
      saveLayouts(layouts)
    }
  }, [layouts])

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

  // Handle layout change
  const handleLayoutChange = (currentLayout, allLayouts) => {
    setLayouts(allLayouts)
  }

  // Handle widget delete
  const handleDeleteWidget = (widgetId) => {
    setWidgetVisibility(prev => ({
      ...prev,
      [widgetId]: false
    }))
  }

  // Initialize default layouts if not loaded
  const currentLayouts = useMemo(() => {
    if (Object.keys(layouts).length === 0) {
      return getDefaultLayouts()
    }
    return layouts
  }, [layouts])

  // Grid layout breakpoints (matching Tailwind breakpoints)
  const breakpoints = { lg: 1200, md: 768, sm: 640, xs: 480, xxs: 0 }
  const cols = { lg: 12, md: 10, sm: 6, xs: 6, xxs: 6 }

  return (
    <div className="w-full">
      <GridLayout
        className="layout"
        layouts={currentLayouts}
        breakpoints={breakpoints}
        cols={cols}
        rowHeight={60}
        onLayoutChange={handleLayoutChange}
        onDragStart={() => setIsDragging(true)}
        onDragStop={() => setIsDragging(false)}
        onResizeStart={() => setIsDragging(true)}
        onResizeStop={() => setIsDragging(false)}
        isDraggable={true}
        isResizable={true}
        draggableHandle=".drag-handle"
        compactType="vertical"
        preventCollision={false}
        margin={[16, 16]}
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

