import { useState, useEffect, useMemo, useCallback } from 'react'
import GridLayout from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import DashboardWidget from './DashboardWidget'
import WidgetRenderer from './widgets/WidgetRenderer'
import WidgetConfigModal from './WidgetConfigModal'
import { WIDGET_CONFIGS, DEFAULT_WIDGETS, getDefaultLayouts } from '../config/widgetConfig'
import { saveLayouts, loadLayouts, saveWidgetVisibility, loadWidgetVisibility, validateAndFixLayouts } from '../utils/layoutPersistence'
import { analyzeDataAndSuggestWidgets, generateDynamicLayouts } from '../utils/dataAnalysis'

function AdvancedDashboardGrid({ 
  data, 
  filteredData, 
  selectedNumeric, 
  selectedCategorical, 
  selectedDate, 
  onChartFilter, 
  chartFilter, 
  categoricalColumns,
  numericColumns = [],
  dateColumns = [],
  viewMode = 'edit',
  onLayoutChange: externalOnLayoutChange // Callback to notify parent of layout changes
}) {
  const [layouts, setLayouts] = useState({})
  const [widgetVisibility, setWidgetVisibility] = useState({})
  const [widgetConfigs, setWidgetConfigs] = useState({}) // Store per-widget configurations
  const [isDragging, setIsDragging] = useState(false)
  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [configuringWidgetId, setConfiguringWidgetId] = useState(null)
  
  // Helper function to fix overlapping widgets in a layout
  // This function ensures NO widgets overlap by repositioning them in a clean grid
  const fixOverlappingWidgets = (layoutArray, cols = 12) => {
    if (!Array.isArray(layoutArray) || layoutArray.length === 0) return layoutArray
    
    // Sort by y position first, then x, to process top-to-bottom, left-to-right
    const sorted = [...layoutArray].sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y
      return a.x - b.x
    })
    
    const fixed = []
    
    sorted.forEach(item => {
      if (!item || !item.i) return
      
      let newX = item.x
      let newY = item.y
      let overlaps = false
      
      // Check if this item overlaps with any already processed item
      for (const existing of fixed) {
        // Check for overlap: two rectangles overlap if they intersect
        const itemRight = newX + item.w
        const itemBottom = newY + item.h
        const existingRight = existing.x + existing.w
        const existingBottom = existing.y + existing.h
        
        // Overlap occurs when NOT separated
        if (!(itemRight <= existing.x || existingRight <= newX || itemBottom <= existing.y || existingBottom <= newY)) {
          overlaps = true
          break
        }
      }
      
      // If overlaps, find next available position in a grid pattern
      if (overlaps) {
        let found = false
        let testY = 0
        let testX = 0
        const maxAttempts = 200 // Safety limit
        
        for (let attempt = 0; attempt < maxAttempts && !found; attempt++) {
          // Check if this position overlaps with any existing widget
          const testRight = testX + item.w
          const testBottom = testY + item.h
          
          const testOverlaps = fixed.some(existing => {
            const existingRight = existing.x + existing.w
            const existingBottom = existing.y + existing.h
            return !(testRight <= existing.x || existingRight <= testX || testBottom <= existing.y || existingBottom <= testY)
          })
          
          if (!testOverlaps) {
            newX = testX
            newY = testY
            found = true
          } else {
            // Move to next grid position
            testX += item.w
            if (testX + item.w > cols) {
              testX = 0
              // Move to next row with spacing
              const maxY = fixed.length > 0 
                ? Math.max(...fixed.map(existing => existing.y + existing.h))
                : 0
              testY = Math.max(testY + item.h + 1, maxY + 1)
            }
          }
        }
        
        // Fallback: place at bottom of all existing widgets
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
  }
  
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

  // Analyze data and generate dynamic widgets
  const dataAnalysis = useMemo(() => {
    if (!data || data.length === 0) {
      return { suggestedWidgets: [], widgetConfigs: {}, defaultSelections: {} }
    }
    return analyzeDataAndSuggestWidgets(data, numericColumns, categoricalColumns, dateColumns)
  }, [data, numericColumns, categoricalColumns, dateColumns])

  // Initialize layouts and visibility based on data analysis
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
    
    // If we have saved layouts, use them
    if (validatedLayouts && typeof validatedLayouts === 'object' && !Array.isArray(validatedLayouts) && Object.keys(validatedLayouts).length > 0) {
      // ALWAYS fix overlaps in validated layouts
      const fixedLayouts = {}
      Object.keys(validatedLayouts).forEach(bp => {
        if (Array.isArray(validatedLayouts[bp])) {
          const cols = bp === 'lg' ? 12 : bp === 'md' ? 10 : 6
          fixedLayouts[bp] = fixOverlappingWidgets(validatedLayouts[bp], cols)
        } else {
          fixedLayouts[bp] = []
        }
      })
      
      // Check if insights widgets are suggested but not in saved layouts
      // If so, add them to the layouts
      const insightsWidgets = ['budget-insights', 'unemployment-insights', 'health-insights', 'sales-insights', 'usaspending-insights', 'contract-map']
      
      insightsWidgets.forEach(widgetId => {
        if (dataAnalysis.suggestedWidgets.includes(widgetId)) {
          console.log(`💰 ${widgetId} widget detected! Checking if it needs to be added to layouts...`)
          const breakpoints = ['lg', 'md', 'sm', 'xs', 'xxs']
          let widgetAdded = false
          
          breakpoints.forEach(bp => {
            const exists = fixedLayouts[bp]?.some(item => item.i === widgetId)
            if (!exists) {
              widgetAdded = true
              if (!fixedLayouts[bp]) {
                fixedLayouts[bp] = []
              }
              
              const config = WIDGET_CONFIGS[widgetId]
              if (config) {
                // Find next available position (prefer top-left)
                const cols = bp === 'lg' ? 12 : bp === 'md' ? 10 : 6
                const width = config.defaultLayout?.w || 6
                const height = config.defaultLayout?.h || 4
                
                // Try to place at top-left first
                let foundPosition = false
                let testY = 0
                let testX = 0
                
                while (!foundPosition && testY < 50) {
                  const testItem = { x: testX, y: testY, w: width, h: height }
                  const overlaps = fixedLayouts[bp].some(item => {
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
                      testY += height + 1
                    }
                  }
                }
                
                // Fallback: place at bottom if no position found
                if (!foundPosition) {
                  let maxY = 0
                  fixedLayouts[bp].forEach(item => {
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
                
                fixedLayouts[bp] = [...fixedLayouts[bp], newItem]
              }
            }
          })
          
          // Set widget configs if widget was added
          if (widgetAdded && dataAnalysis.widgetConfigs[widgetId]) {
            console.log(`✅ ${widgetId} widget added to layouts!`)
            setWidgetConfigs(prev => ({
              ...prev,
              [widgetId]: dataAnalysis.widgetConfigs[widgetId]
            }))
          } else if (dataAnalysis.suggestedWidgets.includes(widgetId)) {
            console.log(`ℹ️ ${widgetId} widget already exists in layouts`)
          }
        }
      })
      
      setLayouts(fixedLayouts)
    } else if (dataAnalysis.suggestedWidgets.length > 0) {
      // Generate dynamic layouts based on data analysis
      const dynamicLayouts = generateDynamicLayouts(dataAnalysis.suggestedWidgets)
      setLayouts(dynamicLayouts)
      // Set widget configs from analysis
      setWidgetConfigs(dataAnalysis.widgetConfigs)
    } else {
      // Fallback to default layouts if no data or suggestions
      const defaultLayouts = getDefaultLayouts()
      const fixedDefaults = {}
      Object.keys(defaultLayouts).forEach(bp => {
        if (Array.isArray(defaultLayouts[bp])) {
          const cols = bp === 'lg' ? 12 : bp === 'md' ? 10 : 6
          fixedDefaults[bp] = fixOverlappingWidgets(defaultLayouts[bp], cols)
        } else {
          fixedDefaults[bp] = []
        }
      })
      setLayouts(fixedDefaults)
    }
    
    // Set widget visibility based on suggested widgets or saved state
    if (savedVisibility && typeof savedVisibility === 'object' && !Array.isArray(savedVisibility) && Object.keys(savedVisibility).length > 0) {
      // Ensure insights widgets are visible if they're suggested
      const updatedVisibility = { ...savedVisibility }
      const insightsWidgets = ['budget-insights', 'unemployment-insights', 'health-insights', 'sales-insights', 'usaspending-insights', 'contract-map']
      insightsWidgets.forEach(widgetId => {
        if (dataAnalysis.suggestedWidgets.includes(widgetId)) {
          updatedVisibility[widgetId] = true
        }
      })
      setWidgetVisibility(updatedVisibility)
    } else if (dataAnalysis.suggestedWidgets.length > 0) {
      // Make suggested widgets visible
      const dynamicVisibility = {}
      dataAnalysis.suggestedWidgets.forEach(id => {
        dynamicVisibility[id] = true
      })
      setWidgetVisibility(dynamicVisibility)
    } else {
      // All default widgets visible
      const defaultVisibility = {}
      DEFAULT_WIDGETS.forEach(id => {
        defaultVisibility[id] = true
      })
      setWidgetVisibility(defaultVisibility)
    }
  }, [dataAnalysis])

  // Save layouts when they change (but not during drag) and notify parent
  // Use debouncing to prevent excessive updates
  useEffect(() => {
    if (layouts && typeof layouts === 'object' && Object.keys(layouts).length > 0 && !isDragging) {
      // Save to localStorage immediately (lightweight operation)
      saveLayouts(layouts)
      // Debug: Check if layouts are saved
      console.log('Saved layouts:', localStorage.getItem('dashboard_layouts'))
      console.log('Saved visibility:', localStorage.getItem('dashboard_widget_visibility'))
      
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
      // Debug: Check if visibility is saved
      console.log('Saved visibility:', localStorage.getItem('dashboard_widget_visibility'))
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

  // Handle layout change - always fix overlaps
  const handleLayoutChange = (currentLayout, allLayouts) => {
    // Only update if not currently dragging (to avoid updates during drag)
    if (!isDragging && allLayouts && typeof allLayouts === 'object' && !Array.isArray(allLayouts)) {
      // ALWAYS fix overlaps when layout changes
      const fixedLayouts = {}
      try {
        const keys = Object.keys(allLayouts)
        keys.forEach(bp => {
          if (Array.isArray(allLayouts[bp])) {
            const cols = bp === 'lg' ? 12 : bp === 'md' ? 10 : 6
            fixedLayouts[bp] = fixOverlappingWidgets(allLayouts[bp], cols)
          } else {
            fixedLayouts[bp] = []
          }
        })
        setLayouts(fixedLayouts)
      } catch (error) {
        console.error('Error in handleLayoutChange:', error)
      }
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

  // Initialize default layouts if not loaded and filter to only include visible widgets
  // ALWAYS use clean defaults to prevent ANY overlaps - FORCE clean layout
  const currentLayouts = useMemo(() => {
    try {
      // ALWAYS start with clean defaults - this ensures perfect grid layout
      const cleanDefaults = getDefaultLayouts()
      const fixedDefaults = {}
      if (cleanDefaults && typeof cleanDefaults === 'object' && !Array.isArray(cleanDefaults)) {
        try {
          const defaultKeys = Object.keys(cleanDefaults)
          defaultKeys.forEach(bp => {
            if (Array.isArray(cleanDefaults[bp])) {
              const cols = bp === 'lg' ? 12 : bp === 'md' ? 10 : 6
              fixedDefaults[bp] = fixOverlappingWidgets(cleanDefaults[bp], cols)
            } else {
              fixedDefaults[bp] = []
            }
          })
        } catch (e) {
          console.error('Error processing clean defaults:', e)
        }
      }
      
      // Get base layouts from state
      let baseLayouts
      if (!layouts || typeof layouts !== 'object' || Array.isArray(layouts)) {
        return fixedDefaults
      } else {
        // Safely check if layouts has keys
        try {
          const keys = Object.keys(layouts)
          if (keys.length === 0) {
            return fixedDefaults
          } else {
            baseLayouts = layouts
          }
        } catch (e) {
          return fixedDefaults
        }
      }
      
      // Ensure baseLayouts is valid
      if (!baseLayouts || typeof baseLayouts !== 'object' || Array.isArray(baseLayouts)) {
        return fixedDefaults
      }
      
      // Filter to only include visible widgets and ALWAYS fix overlaps
      const filtered = {}
      let hasOverlaps = false
      
      if (baseLayouts && typeof baseLayouts === 'object' && !Array.isArray(baseLayouts)) {
        try {
          const breakpoints = Object.keys(baseLayouts)
          breakpoints.forEach(breakpoint => {
            if (Array.isArray(baseLayouts[breakpoint])) {
              // First filter by visibility
              let visibleItems = baseLayouts[breakpoint].filter(item => {
                if (!item || !item.i) return false
                // If widgetVisibility is not initialized yet, show all widgets
                if (!widgetVisibility || typeof widgetVisibility !== 'object' || Array.isArray(widgetVisibility)) {
                  return true
                }
                try {
                  const visKeys = Object.keys(widgetVisibility)
                  if (visKeys.length === 0) {
                    return true
                  }
                } catch (e) {
                  return true
                }
                return widgetVisibility[item.i] !== false
              })
              
              // ALWAYS fix overlaps
              const cols = breakpoint === 'lg' ? 12 : breakpoint === 'md' ? 10 : 6
              const fixed = fixOverlappingWidgets(visibleItems, cols)
              
              // Double-check for overlaps after fixing
              for (let i = 0; i < fixed.length; i++) {
                for (let j = i + 1; j < fixed.length; j++) {
                  const item1 = fixed[i]
                  const item2 = fixed[j]
                  if (item1 && item2) {
                    const item1Right = item1.x + item1.w
                    const item1Bottom = item1.y + item1.h
                    const item2Right = item2.x + item2.w
                    const item2Bottom = item2.y + item2.h
                    if (!(item1Right <= item2.x || item2Right <= item1.x || item1Bottom <= item2.y || item2Bottom <= item1.y)) {
                      hasOverlaps = true
                      break
                    }
                  }
                }
                if (hasOverlaps) break
              }
              
              // If overlaps detected, use clean defaults for this breakpoint
              if (hasOverlaps) {
                filtered[breakpoint] = fixedDefaults[breakpoint] || []
              } else {
                filtered[breakpoint] = fixed
              }
            } else {
              filtered[breakpoint] = fixedDefaults[breakpoint] || []
            }
          })
        } catch (e) {
          console.error('Error processing baseLayouts:', e)
          return fixedDefaults
        }
      }
      
      // If any overlaps were detected, return clean defaults
      if (hasOverlaps) {
        return fixedDefaults
      }
      
      // Ensure we have at least the default layouts
      try {
        const filteredKeys = Object.keys(filtered)
        if (filteredKeys.length === 0) {
          return fixedDefaults
        }
      } catch (e) {
        console.error('Error checking filtered keys:', e)
        return fixedDefaults
      }
      
      return filtered
    } catch (error) {
      console.error('Error calculating currentLayouts:', error)
      // Always return clean defaults on error
      const defaults = getDefaultLayouts()
      const fixedDefaults = {}
      if (defaults && typeof defaults === 'object' && !Array.isArray(defaults)) {
        try {
          const defaultKeys = Object.keys(defaults)
          defaultKeys.forEach(bp => {
            if (Array.isArray(defaults[bp])) {
              const cols = bp === 'lg' ? 12 : bp === 'md' ? 10 : 6
              fixedDefaults[bp] = fixOverlappingWidgets(defaults[bp], cols)
            }
          })
        } catch (e) {
          console.error('Error processing defaults in catch:', e)
        }
      }
      return fixedDefaults
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
          // Update layouts after resize stops - preserve all breakpoints and fix overlaps
          if (currentLayouts && typeof currentLayouts === 'object' && !Array.isArray(currentLayouts)) {
            const allLayouts = { ...currentLayouts }
            // Update the current breakpoint's layout
            if (allLayouts && typeof allLayouts === 'object') {
              Object.keys(allLayouts).forEach(bp => {
                allLayouts[bp] = layout
              })
              
              // ALWAYS fix overlaps after resize
              const fixedLayouts = {}
              Object.keys(allLayouts).forEach(bp => {
                if (Array.isArray(allLayouts[bp])) {
                  const cols = bp === 'lg' ? 12 : bp === 'md' ? 10 : 6
                  fixedLayouts[bp] = fixOverlappingWidgets(allLayouts[bp], cols)
                } else {
                  fixedLayouts[bp] = []
                }
              })
              setLayouts(fixedLayouts)
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
        allowOverlap={false}
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
          
          // Use dynamic config if available, otherwise use defaults
          const widgetConfig = widgetConfigs[widgetId] || {}
          const widgetTitle = widgetConfig.title || config.title
          const widgetNumeric = widgetConfig.selectedNumeric || selectedNumeric
          const widgetCategorical = widgetConfig.selectedCategorical || selectedCategorical
          const widgetDate = widgetConfig.selectedDate || selectedDate
          
          try {
            return (
              <div key={widgetId}>
                <DashboardWidget
                  id={widgetId}
                  title={widgetTitle}
                  onDelete={handleDeleteWidget}
                  onConfigure={(id) => {
                    setConfiguringWidgetId(id)
                    setConfigModalOpen(true)
                  }}
                  isConfigured={!!(widgetConfig.selectedNumeric || widgetConfig.selectedCategorical || widgetConfig.selectedDate)}
                  isDragging={isDragging}
                  viewMode={viewMode}
                >
                  <WidgetRenderer
                    widgetId={widgetId}
                    data={data}
                    filteredData={filteredData}
                    selectedNumeric={widgetNumeric}
                    selectedCategorical={widgetCategorical}
                    selectedDate={widgetDate}
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
      
      {/* Widget Configuration Modal */}
      {configModalOpen && configuringWidgetId && (
        <WidgetConfigModal
          isOpen={configModalOpen}
          widgetId={configuringWidgetId}
          currentConfig={widgetConfigs[configuringWidgetId] || {}}
          numericColumns={numericColumns}
          categoricalColumns={categoricalColumns}
          dateColumns={dateColumns}
          onSave={(config) => {
            setWidgetConfigs(prev => ({
              ...prev,
              [configuringWidgetId]: config
            }))
            setConfigModalOpen(false)
            setConfiguringWidgetId(null)
          }}
          onClose={() => {
            setConfigModalOpen(false)
            setConfiguringWidgetId(null)
          }}
        />
      )}
    </div>
  )
}

export default AdvancedDashboardGrid

