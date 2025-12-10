// Widget configuration for the dashboard
// Each widget defines its default layout and constraints

export const WIDGET_CONFIGS = {
  'line-chart': {
    id: 'line-chart',
    title: 'Income Over Time',
    component: 'line-chart',
    defaultLayout: { i: 'line-chart', x: 0, y: 0, w: 6, h: 4 },
    minW: 4,
    minH: 3,
    maxW: 12,
    maxH: 6
  },
  'donut-chart': {
    id: 'donut-chart',
    title: 'Distribution by Category',
    component: 'donut-chart',
    defaultLayout: { i: 'donut-chart', x: 6, y: 0, w: 6, h: 4 },
    minW: 4,
    minH: 3,
    maxW: 8,
    maxH: 6
  },
  'distribution-list': {
    id: 'distribution-list',
    title: 'Distribution by Category',
    component: 'distribution-list',
    defaultLayout: { i: 'distribution-list', x: 0, y: 4, w: 4, h: 5 },
    minW: 3,
    minH: 3,
    maxW: 6,
    maxH: 8
  },
  'sunburst-chart': {
    id: 'sunburst-chart',
    title: 'Hierarchical Distribution',
    component: 'sunburst-chart',
    defaultLayout: { i: 'sunburst-chart', x: 4, y: 4, w: 4, h: 5 },
    minW: 3,
    minH: 3,
    maxW: 6,
    maxH: 8
  },
  'bar-chart': {
    id: 'bar-chart',
    title: 'Category Comparison',
    component: 'bar-chart',
    defaultLayout: { i: 'bar-chart', x: 8, y: 4, w: 4, h: 5 },
    minW: 3,
    minH: 3,
    maxW: 8,
    maxH: 8
  },
  'forecast-chart': {
    id: 'forecast-chart',
    title: 'Forecast & Prediction',
    component: 'forecast-chart',
    defaultLayout: { i: 'forecast-chart', x: 0, y: 9, w: 12, h: 5 },
    minW: 6,
    minH: 4,
    maxW: 12,
    maxH: 8
  }
}

// Default widget order and visibility
export const DEFAULT_WIDGETS = [
  'line-chart',
  'donut-chart',
  'distribution-list',
  'sunburst-chart',
  'bar-chart',
  'forecast-chart'
]

// Helper function to check if two layout items overlap
const doItemsOverlap = (item1, item2) => {
  return !(
    item1.x + item1.w <= item2.x ||
    item2.x + item2.w <= item1.x ||
    item1.y + item1.h <= item2.y ||
    item2.y + item2.h <= item1.y
  )
}

// Helper function to find next available position for a widget
const findNextAvailablePosition = (existingItems, width, height, cols = 12) => {
  let y = 0
  let x = 0
  
  // Try to find a position that doesn't overlap
  while (true) {
    const testItem = { x, y, w: width, h: height }
    const overlaps = existingItems.some(item => doItemsOverlap(testItem, item))
    
    if (!overlaps) {
      return { x, y }
    }
    
    // Move to next position
    x += width
    if (x + width > cols) {
      x = 0
      y += height
    }
    
    // Safety limit
    if (y > 100) break
  }
  
  // Fallback: place at bottom
  const maxY = existingItems.length > 0 
    ? Math.max(...existingItems.map(item => item.y + item.h))
    : 0
  return { x: 0, y: maxY + 1 }
}

// Generate default layouts for all breakpoints
export const getDefaultLayouts = () => {
  const widgets = DEFAULT_WIDGETS.map(id => WIDGET_CONFIGS[id])
  
  return {
    lg: widgets.map((w, index) => {
      const layout = { ...w.defaultLayout }
      
      // Arrange widgets in a clean grid pattern with NO overlaps
      // Row 1: line-chart (0,0, w:6, h:4) and donut-chart (6,0, w:6, h:4)
      // Row 2: distribution-list (0,5, w:4, h:5), sunburst (4,5, w:4, h:5), bar-chart (8,5, w:4, h:5)
      // Row 3: forecast (0,11, w:12, h:5)
      // Ensure y positions account for widget heights to prevent overlap
      
      if (index === 0) {
        // Line chart - top left
        layout.x = 0
        layout.y = 0
        layout.w = 6
        layout.h = 4
      } else if (index === 1) {
        // Donut chart - top right
        layout.x = 6
        layout.y = 0
        layout.w = 6
        layout.h = 4
      } else if (index === 2) {
        // Distribution list - second row, left
        layout.x = 0
        layout.y = 5 // Row 1 ends at y=4, so start at y=5
        layout.w = 4
        layout.h = 5
      } else if (index === 3) {
        // Sunburst - second row, middle
        layout.x = 4
        layout.y = 5
        layout.w = 4
        layout.h = 5
      } else if (index === 4) {
        // Bar chart - second row, right
        layout.x = 8
        layout.y = 5
        layout.w = 4
        layout.h = 5
      } else if (index === 5) {
        // Forecast - third row, full width
        layout.x = 0
        layout.y = 11 // Row 2 ends at y=10, so start at y=11
        layout.w = 12
        layout.h = 5
      }
      
      return {
        ...layout,
        minW: w.minW,
        minH: w.minH,
        maxW: w.maxW,
        maxH: w.maxH
      }
    }),
    md: widgets.map((w, index) => {
      const layout = { ...w.defaultLayout }
      // Arrange in 2-column grid for medium screens
      if (index === 0) { layout.x = 0; layout.y = 0; layout.w = 5 }
      else if (index === 1) { layout.x = 5; layout.y = 0; layout.w = 5 }
      else if (index === 2) { layout.x = 0; layout.y = 5; layout.w = 5 }
      else if (index === 3) { layout.x = 5; layout.y = 5; layout.w = 5 }
      else if (index === 4) { layout.x = 0; layout.y = 10; layout.w = 5 }
      else if (index === 5) { layout.x = 0; layout.y = 15; layout.w = 10 }
      
      return {
        ...layout,
        minW: w.minW,
        minH: w.minH,
        maxW: w.maxW,
        maxH: w.maxH
      }
    }),
    sm: widgets.map(w => ({
      ...w.defaultLayout,
      w: 6, // 2 columns on small screens
      x: w.defaultLayout.x < 6 ? 0 : 6,
      y: w.defaultLayout.y < 4 ? w.defaultLayout.y : w.defaultLayout.y + 2,
      minW: 3,
      minH: w.minH,
      maxW: 6,
      maxH: w.maxH
    })),
    xs: widgets.map(w => ({
      ...w.defaultLayout,
      w: 6, // 2 columns on extra small
      x: 0,
      y: widgets.indexOf(w) * 4, // Stack vertically
      minW: 3,
      minH: w.minH,
      maxW: 6,
      maxH: w.maxH
    })),
    xxs: widgets.map(w => ({
      ...w.defaultLayout,
      w: 6, // Full width on mobile
      x: 0,
      y: widgets.indexOf(w) * 4,
      minW: 6,
      minH: w.minH,
      maxW: 6,
      maxH: w.maxH
    }))
  }
}

