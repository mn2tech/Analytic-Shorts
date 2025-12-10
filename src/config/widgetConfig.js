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

// Generate default layouts for all breakpoints
export const getDefaultLayouts = () => {
  const widgets = DEFAULT_WIDGETS.map(id => WIDGET_CONFIGS[id])
  
  return {
    lg: widgets.map((w, index) => {
      const layout = { ...w.defaultLayout }
      // Ensure widgets don't overlap - space them out properly
      // First row: line-chart (0,0) and donut-chart (6,0)
      // Second row: distribution-list (0,4), sunburst (4,4), bar-chart (8,4)
      // Third row: forecast (0,9)
      // Make sure y positions don't overlap
      if (index === 0) layout.y = 0 // line-chart
      if (index === 1) layout.y = 0 // donut-chart
      if (index === 2) layout.y = 4 // distribution-list
      if (index === 3) layout.y = 4 // sunburst
      if (index === 4) layout.y = 4 // bar-chart
      if (index === 5) layout.y = 9 // forecast
      
      return {
        ...layout,
        minW: w.minW,
        minH: w.minH,
        maxW: w.maxW,
        maxH: w.maxH
      }
    }),
    md: widgets.map(w => ({
      ...w.defaultLayout,
      w: Math.min(w.defaultLayout.w, 8), // Adjust for medium screens
      minW: w.minW,
      minH: w.minH,
      maxW: w.maxW,
      maxH: w.maxH
    })),
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

