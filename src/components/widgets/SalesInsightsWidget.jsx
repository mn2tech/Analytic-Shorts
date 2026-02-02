import { useMemo } from 'react'
import { parseNumericValue } from '../../utils/numberUtils'

/**
 * SalesInsightsWidget - Automatically generates insights from sales data
 */
function SalesInsightsWidget({ data, selectedNumeric, selectedCategorical, selectedDate }) {
  const insights = useMemo(() => {
    if (!data || data.length === 0 || !selectedNumeric) {
      return []
    }

    const insights = []
    const numericColumn = selectedNumeric
    const categoryColumn = selectedCategorical || 'Product' || 'Category' || 'Region'
    const dateColumn = selectedDate || 'Date' || 'Month' || 'Year'

    // Group data
    const categoryTotals = {}
    const dateValues = new Map()

    data.forEach((row) => {
      const category = row[categoryColumn] || 'Unknown'
      const value = parseNumericValue(row[numericColumn])
      const date = row[dateColumn]

      if (!isNaN(value) && isFinite(value)) {
        categoryTotals[category] = (categoryTotals[category] || 0) + value

        if (date) {
          if (!dateValues.has(date)) {
            dateValues.set(date, { total: 0, categories: {} })
          }
          const dateData = dateValues.get(date)
          dateData.total += value
          dateData.categories[category] = (dateData.categories[category] || 0) + value
        }
      }
    })

    // Insight 1: Top Performer
    const sortedCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    if (sortedCategories.length > 0) {
      const total = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0)
      const topCategory = sortedCategories[0]
      const topPercentage = ((topCategory[1] / total) * 100).toFixed(1)
      
      insights.push({
        type: 'top',
        title: '🏆 Top Performer',
        content: `${topCategory[0]} leads with ${topCategory[1].toLocaleString(undefined, { maximumFractionDigits: 0 })} in sales (${topPercentage}% of total).`,
        icon: '🏆',
        color: 'blue'
      })
    }

    // Insight 2: Category Comparison
    if (sortedCategories.length >= 2) {
      const [first, second] = sortedCategories
      const ratio = (first[1] / second[1]).toFixed(1)
      insights.push({
        type: 'comparison',
        title: '📊 Sales Comparison',
        content: `${first[0]} generates ${ratio}x more sales than ${second[0]} (${first[1].toLocaleString(undefined, { maximumFractionDigits: 0 })} vs ${second[1].toLocaleString(undefined, { maximumFractionDigits: 0 })}).`,
        icon: '📊',
        color: 'purple'
      })
    }

    // Insight 3: Time Trends
    if (dateValues.size >= 2) {
      const sortedDates = Array.from(dateValues.entries()).sort()
      const firstDate = sortedDates[0]
      const lastDate = sortedDates[sortedDates.length - 1]
      const firstTotal = firstDate[1].total
      const lastTotal = lastDate[1].total
      const change = lastTotal - firstTotal
      const changePercent = ((change / firstTotal) * 100).toFixed(1)

      if (Math.abs(changePercent) > 1) {
        const trend = change > 0 ? 'increased' : 'decreased'
        insights.push({
          type: 'trend',
          title: '📈 Sales Trend',
          content: `Total sales ${trend} by ${Math.abs(changePercent)}% from ${firstDate[0]} to ${lastDate[0]} (${change > 0 ? '+' : ''}${change.toLocaleString(undefined, { maximumFractionDigits: 0 })}).`,
          icon: change > 0 ? '📈' : '📉',
          color: change > 0 ? 'green' : 'red'
        })
      }
    }

    // Insight 4: Fastest Growing
    if (dateValues.size >= 2 && sortedCategories.length > 0) {
      const sortedDates = Array.from(dateValues.entries()).sort()
      const categoryGrowth = {}

      sortedCategories.forEach(([category]) => {
        const firstValue = sortedDates[0][1].categories[category] || 0
        const lastValue = sortedDates[sortedDates.length - 1][1].categories[category] || 0
        
        if (firstValue > 0) {
          const growth = ((lastValue - firstValue) / firstValue) * 100
          categoryGrowth[category] = growth
        }
      })

      const fastestGrowing = Object.entries(categoryGrowth)
        .sort((a, b) => b[1] - a[1])[0]

      if (fastestGrowing && fastestGrowing[1] > 5) {
        insights.push({
          type: 'growth',
          title: '🚀 Fastest Growing',
          content: `${fastestGrowing[0]} shows the strongest growth at ${fastestGrowing[1].toFixed(1)}% increase over the period.`,
          icon: '🚀',
          color: 'green'
        })
      }
    }

    // Insight 5: Total Sales
    const totalSales = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0)
    insights.push({
      type: 'total',
      title: '💰 Total Sales',
      content: `Combined sales across all ${Object.keys(categoryTotals).length} categories total ${totalSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}.`,
      icon: '💰',
      color: 'blue'
    })

    return insights
  }, [data, selectedNumeric, selectedCategorical, selectedDate])

  if (insights.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm p-4">
        <div className="text-center">
          <p>No insights available</p>
          <p className="text-xs text-gray-400 mt-1">Ensure data has numeric and category columns</p>
        </div>
      </div>
    )
  }

  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    purple: 'bg-purple-50 border-purple-200 text-purple-900',
    green: 'bg-green-50 border-green-200 text-green-900',
    red: 'bg-red-50 border-red-200 text-red-900',
    orange: 'bg-orange-50 border-orange-200 text-orange-900'
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-3">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span>📖</span>
          <span>Sales Insights</span>
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Key findings from your sales data
        </p>
      </div>

      {insights.map((insight, index) => (
        <div
          key={index}
          className={`border-l-4 rounded-lg p-4 ${colorClasses[insight.color] || colorClasses.blue}`}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">{insight.icon}</span>
            <div className="flex-1">
              <h4 className="font-semibold mb-1">{insight.title}</h4>
              <p className="text-sm leading-relaxed">{insight.content}</p>
            </div>
          </div>
        </div>
      ))}

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          💡 Tip: Use filters to analyze specific products, regions, or time periods
        </p>
      </div>
    </div>
  )
}

export default SalesInsightsWidget
