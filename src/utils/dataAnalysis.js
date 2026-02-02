/**
 * Data Analysis Utilities
 * Analyzes data structure and suggests appropriate widgets and configurations
 */

/**
 * Analyze data structure and suggest appropriate widgets
 * @param {Array} data - The data array
 * @param {Array} numericColumns - Array of numeric column names
 * @param {Array} categoricalColumns - Array of categorical column names
 * @param {Array} dateColumns - Array of date column names
 * @returns {Object} Suggested widgets and configurations
 */
export function analyzeDataAndSuggestWidgets(data, numericColumns, categoricalColumns, dateColumns) {
  if (!data || data.length === 0) {
    return {
      suggestedWidgets: [],
      widgetConfigs: {},
      defaultSelections: {}
    }
  }

  const hasNumeric = numericColumns && numericColumns.length > 0
  const hasCategorical = categoricalColumns && categoricalColumns.length > 0
  const hasDate = dateColumns && dateColumns.length > 0
  const hasMultipleNumeric = numericColumns && numericColumns.length > 1
  const hasMultipleCategorical = categoricalColumns && categoricalColumns.length > 1

  const suggestedWidgets = []
  const widgetConfigs = {}
  const defaultSelections = {
    selectedNumeric: numericColumns?.[0] || null,
    selectedCategorical: categoricalColumns?.[0] || null,
    selectedDate: dateColumns?.[0] || null
  }

  // Analyze column names to generate meaningful titles
  const getColumnDisplayName = (colName) => {
    if (!colName) return 'Value'
    // Convert snake_case or camelCase to Title Case
    return colName
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()
  }

  const getNumericColumnName = () => {
    if (!hasNumeric) return 'Value'
    // Prefer columns with common metric names
    const preferred = numericColumns.find(col => 
      /amount|total|sum|count|quantity|price|cost|revenue|sales|income|value|score|rating/i.test(col)
    )
    return preferred || numericColumns[0]
  }

  const getCategoricalColumnName = () => {
    if (!hasCategorical) return 'Category'
    // Prefer columns with common category names
    const preferred = categoricalColumns.find(col => 
      /category|type|status|name|label|group|class|department|region|country|city/i.test(col)
    )
    return preferred || categoricalColumns[0]
  }

  const getDateColumnName = () => {
    if (!hasDate) return 'Date'
    // Prefer columns with common date names
    const preferred = dateColumns.find(col => 
      /date|time|created|updated|timestamp|when/i.test(col)
    )
    return preferred || dateColumns[0]
  }

  const numericCol = getNumericColumnName()
  const categoricalCol = getCategoricalColumnName()
  const dateCol = getDateColumnName()

  // Suggest widgets based on available columns
  let widgetIndex = 0
  const getNextPosition = (width = 6, height = 4) => {
    const x = (widgetIndex % 2) * 6
    const y = Math.floor(widgetIndex / 2) * 4
    widgetIndex++
    return { x, y, w: width, h: height }
  }

  // 1. Line Chart - if we have date + numeric
  if (hasDate && hasNumeric) {
    suggestedWidgets.push('line-chart')
    widgetConfigs['line-chart'] = {
      title: `${getColumnDisplayName(numericCol)} Over Time`,
      selectedNumeric: numericCol,
      selectedDate: dateCol,
      selectedCategorical: hasMultipleCategorical ? categoricalCol : null
    }
  }

  // 2. Bar Chart - if we have categorical + numeric
  if (hasCategorical && hasNumeric) {
    suggestedWidgets.push('bar-chart')
    widgetConfigs['bar-chart'] = {
      title: `${getColumnDisplayName(numericCol)} by ${getColumnDisplayName(categoricalCol)}`,
      selectedNumeric: numericCol,
      selectedCategorical: categoricalCol
    }
  }

  // Detect if this is budget data
  const isBudgetData = numericColumns?.some(col => 
    col.toLowerCase().includes('budget') || col.toLowerCase().includes('amount')
  ) && categoricalColumns?.some(col => 
    col.toLowerCase().includes('budget') || col.toLowerCase().includes('category')
  )

  // Budget Insights Widget - automatically add FIRST for budget data
  if (isBudgetData && hasNumeric && hasCategorical) {
    console.log('💰 Budget data detected!', {
      numericColumns,
      categoricalColumns,
      numericCol,
      categoricalCol
    })
    suggestedWidgets.unshift('budget-insights') // Add to beginning so it appears first
    widgetConfigs['budget-insights'] = {
      title: 'Budget Insights',
      selectedNumeric: numericCol,
      selectedCategorical: categoricalCol,
      selectedDate: dateCol
    }
    console.log('✅ Budget Insights widget added to suggested widgets')
  } else {
    console.log('🔍 Budget data check:', {
      isBudgetData,
      hasNumeric,
      hasCategorical,
      numericColumns,
      categoricalColumns
    })
  }

  // Detect unemployment data
  const isUnemploymentData = numericColumns?.some(col => 
    col.toLowerCase().includes('unemployment') || col.toLowerCase().includes('unemployment rate')
  ) || (numericCol && numericCol.toLowerCase().includes('unemployment'))

  // Unemployment Insights Widget
  if (isUnemploymentData && hasNumeric && hasDate) {
    console.log('📊 Unemployment data detected!')
    suggestedWidgets.unshift('unemployment-insights')
    widgetConfigs['unemployment-insights'] = {
      title: 'Unemployment Insights',
      selectedNumeric: numericCol,
      selectedCategorical: categoricalCol,
      selectedDate: dateCol
    }
  }

  // Detect health data
  const isHealthData = numericColumns?.some(col => 
    col.toLowerCase().includes('health') || col.toLowerCase().includes('death rate') || 
    col.toLowerCase().includes('birth rate') || col.toLowerCase().includes('life expectancy')
  ) || categoricalColumns?.some(col => 
    col.toLowerCase().includes('metric') && (numericCol?.toLowerCase().includes('health') || 
    numericCol?.toLowerCase().includes('death') || numericCol?.toLowerCase().includes('birth') ||
    numericCol?.toLowerCase().includes('life'))
  )

  // Health Insights Widget
  if (isHealthData && hasNumeric && hasCategorical) {
    console.log('💚 Health data detected!')
    suggestedWidgets.unshift('health-insights')
    widgetConfigs['health-insights'] = {
      title: 'Health Insights',
      selectedNumeric: numericCol,
      selectedCategorical: categoricalCol,
      selectedDate: dateCol
    }
  }

  // Detect USA Spending data FIRST (before sales to avoid conflicts)
  const isUSASpendingData = numericColumns?.some(col => 
    col.toLowerCase().includes('award amount') || col.toLowerCase().includes('award_amount')
  ) && (categoricalColumns?.some(col => 
    col.toLowerCase().includes('awarding agency') || col.toLowerCase().includes('recipient name') ||
    col.toLowerCase().includes('award type') || col.toLowerCase().includes('awarding_agency') ||
    col.toLowerCase().includes('recipient_name')
  ) || numericCol?.toLowerCase().includes('award amount'))

  // Detect sales data (but exclude USA Spending data)
  const isSalesData = !isUSASpendingData && numericColumns?.some(col => 
    col.toLowerCase().includes('sales') || col.toLowerCase().includes('revenue') || 
    (col.toLowerCase().includes('amount') && !col.toLowerCase().includes('award')) || 
    col.toLowerCase().includes('price')
  ) && (categoricalColumns?.some(col => 
    col.toLowerCase().includes('product') || col.toLowerCase().includes('category') ||
    col.toLowerCase().includes('region') || col.toLowerCase().includes('customer')
  ) || numericCol?.toLowerCase().includes('sales'))

  // Sales Insights Widget
  if (isSalesData && hasNumeric && (hasCategorical || hasDate)) {
    console.log('💰 Sales data detected!')
    suggestedWidgets.unshift('sales-insights')
    widgetConfigs['sales-insights'] = {
      title: 'Sales Insights',
      selectedNumeric: numericCol,
      selectedCategorical: categoricalCol,
      selectedDate: dateCol
    }
  }

  // USA Spending Insights Widget
  if (isUSASpendingData && hasNumeric && (hasCategorical || hasDate)) {
    console.log('🏛️ USA Spending data detected!')
    suggestedWidgets.unshift('usaspending-insights')
    widgetConfigs['usaspending-insights'] = {
      title: 'USA Spending Insights',
      selectedNumeric: numericCol,
      selectedCategorical: categoricalCol,
      selectedDate: dateCol
    }
  }

  // 3. Donut Chart - if we have categorical + numeric
  if (hasCategorical && hasNumeric) {
    suggestedWidgets.push('donut-chart')
    widgetConfigs['donut-chart'] = {
      title: `Distribution by ${getColumnDisplayName(categoricalCol)}`,
      selectedNumeric: numericCol,
      selectedCategorical: categoricalCol
    }
  }

  // 4. Distribution List - if we have categorical + numeric
  if (hasCategorical && hasNumeric) {
    suggestedWidgets.push('distribution-list')
    widgetConfigs['distribution-list'] = {
      title: `Top ${getColumnDisplayName(categoricalCol)}s`,
      selectedNumeric: numericCol,
      selectedCategorical: categoricalCol
    }
  }

  // 5. Sunburst Chart - if we have multiple categorical + numeric
  if (hasMultipleCategorical && hasNumeric) {
    suggestedWidgets.push('sunburst-chart')
    widgetConfigs['sunburst-chart'] = {
      title: `Hierarchical Distribution`,
      selectedNumeric: numericCol,
      selectedCategorical: categoricalColumns[0],
      secondaryCategory: categoricalColumns[1]
    }
  }

  // 6. Forecast Chart - if we have date + numeric
  if (hasDate && hasNumeric) {
    suggestedWidgets.push('forecast-chart')
    widgetConfigs['forecast-chart'] = {
      title: `${getColumnDisplayName(numericCol)} Forecast`,
      selectedNumeric: numericCol,
      selectedDate: dateCol
    }
  }

  // 7. Add filter widgets if we have the right columns
  if (hasCategorical) {
    suggestedWidgets.push('category-filter')
    widgetConfigs['category-filter'] = {
      title: `Filter by ${getColumnDisplayName(categoricalCol)}`,
      selectedCategorical: categoricalCol
    }
  }

  if (hasDate) {
    suggestedWidgets.push('date-range-filter')
    widgetConfigs['date-range-filter'] = {
      title: `Filter by ${getColumnDisplayName(dateCol)}`,
      selectedDate: dateCol
    }
  }

  if (hasNumeric) {
    suggestedWidgets.push('numeric-range-filter')
    widgetConfigs['numeric-range-filter'] = {
      title: `Filter by ${getColumnDisplayName(numericCol)}`,
      selectedNumeric: numericCol
    }
  }

  return {
    suggestedWidgets,
    widgetConfigs,
    defaultSelections
  }
}

/**
 * Generate dynamic widget layouts based on suggested widgets
 * @param {Array} widgetIds - Array of widget IDs to layout
 * @returns {Object} Layout configuration for all breakpoints
 */
export function generateDynamicLayouts(widgetIds) {
  if (!widgetIds || widgetIds.length === 0) {
    return {
      lg: [],
      md: [],
      sm: [],
      xs: [],
      xxs: []
    }
  }

  const allResizeHandles = ['s', 'e', 'w', 'se', 'sw', 'ne', 'nw', 'n']
  
  // Default widget sizes
  const widgetSizes = {
    'line-chart': { w: 6, h: 4 },
    'bar-chart': { w: 6, h: 4 },
    'donut-chart': { w: 6, h: 4 },
    'distribution-list': { w: 4, h: 5 },
    'sunburst-chart': { w: 4, h: 5 },
    'forecast-chart': { w: 12, h: 5 },
    'budget-insights': { w: 4, h: 6 },
    'category-filter': { w: 3, h: 3 },
    'date-range-filter': { w: 3, h: 3 },
    'numeric-range-filter': { w: 3, h: 3 }
  }

  const createLayout = (breakpoint, cols) => {
    const layout = []
    let currentY = 0
    let currentX = 0
    let maxYInRow = 0

    widgetIds.forEach((widgetId, index) => {
      const size = widgetSizes[widgetId] || { w: 6, h: 4 }
      let { w, h } = size

      // Adjust width for smaller screens
      if (breakpoint === 'md' && w > 5) w = 5
      if (breakpoint === 'sm' && w > 6) w = 6
      if (breakpoint === 'xs' || breakpoint === 'xxs') w = 6

      // Check if widget fits on current row
      if (currentX + w > cols) {
        // Move to next row
        currentX = 0
        currentY = maxYInRow
        maxYInRow = 0
      }

      layout.push({
        i: widgetId,
        x: currentX,
        y: currentY,
        w: w,
        h: h,
        minW: 3,
        minH: 3,
        maxW: 12,
        maxH: 8,
        resizeHandles: allResizeHandles
      })

      // Update position for next widget
      currentX += w
      maxYInRow = Math.max(maxYInRow, currentY + h)
    })

    return layout
  }

  return {
    lg: createLayout('lg', 12),
    md: createLayout('md', 10),
    sm: createLayout('sm', 6),
    xs: createLayout('xs', 6),
    xxs: createLayout('xxs', 6)
  }
}










