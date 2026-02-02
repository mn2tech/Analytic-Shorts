import { useMemo } from 'react'
import { parseNumericValue } from '../../utils/numberUtils'

/**
 * USASpendingInsightsWidget - Automatically generates insights from USA Spending data
 */
function USASpendingInsightsWidget({ data, selectedNumeric, selectedCategorical, selectedDate }) {
  const insights = useMemo(() => {
    if (!data || data.length === 0 || !selectedNumeric) {
      return []
    }

    const insights = []
    const numericColumn = selectedNumeric
    const categoryColumn = selectedCategorical || 'Awarding Agency' || 'Recipient Name' || 'Award Type'
    const dateColumn = selectedDate || 'Award Date' || 'Start Date'

    // Group data
    const categoryTotals = {}
    const categoryCounts = {}
    const dateValues = new Map()
    const recipientTotals = {}
    const agencyTotals = {}

    data.forEach((row) => {
      const category = row[categoryColumn] || 'Unknown'
      const value = parseNumericValue(row[numericColumn])
      const date = row[dateColumn]
      const recipient = row['Recipient Name'] || row['recipient_name'] || ''
      const agency = row['Awarding Agency'] || row['awarding_agency'] || ''

      if (!isNaN(value) && isFinite(value)) {
        categoryTotals[category] = (categoryTotals[category] || 0) + value
        categoryCounts[category] = (categoryCounts[category] || 0) + 1

        if (recipient) {
          recipientTotals[recipient] = (recipientTotals[recipient] || 0) + value
        }
        if (agency) {
          agencyTotals[agency] = (agencyTotals[agency] || 0) + value
        }

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

    // Insight 1: Total Spending
    const totalSpending = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0)
    insights.push({
      type: 'total',
      title: '💰 Total Federal Spending',
      content: `Total federal awards in this dataset: $${(totalSpending / 1000000).toFixed(1)}M across ${data.length} awards.`,
      icon: '💰',
      color: 'blue'
    })

    // Insight 2: Top Agency/Recipient
    const sortedCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    if (sortedCategories.length > 0) {
      const topCategory = sortedCategories[0]
      const topPercentage = ((topCategory[1] / totalSpending) * 100).toFixed(1)
      
      insights.push({
        type: 'top',
        title: '🏆 Top Spender',
        content: `${topCategory[0]} accounts for $${(topCategory[1] / 1000000).toFixed(1)}M (${topPercentage}% of total) with ${categoryCounts[topCategory[0]]} awards.`,
        icon: '🏆',
        color: 'blue'
      })
    }

    // Insight 3: Top Recipient (if Recipient Name column exists)
    if (Object.keys(recipientTotals).length > 0) {
      const sortedRecipients = Object.entries(recipientTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 1)
      
      if (sortedRecipients.length > 0) {
        const topRecipient = sortedRecipients[0]
        insights.push({
          type: 'recipient',
          title: '🏢 Top Recipient',
          content: `${topRecipient[0]} received the largest award: $${(topRecipient[1] / 1000000).toFixed(1)}M.`,
          icon: '🏢',
          color: 'purple'
        })
      }
    }

    // Insight 4: Top Agency (if Awarding Agency column exists)
    if (Object.keys(agencyTotals).length > 0) {
      const sortedAgencies = Object.entries(agencyTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 1)
      
      if (sortedAgencies.length > 0) {
        const topAgency = sortedAgencies[0]
        const agencyPercentage = ((topAgency[1] / totalSpending) * 100).toFixed(1)
        insights.push({
          type: 'agency',
          title: '🏛️ Top Awarding Agency',
          content: `${topAgency[0]} awarded $${(topAgency[1] / 1000000).toFixed(1)}M (${agencyPercentage}% of total spending).`,
          icon: '🏛️',
          color: 'green'
        })
      }
    }

    // Insight 5: Category Comparison
    if (sortedCategories.length >= 2) {
      const [first, second] = sortedCategories
      const ratio = (first[1] / second[1]).toFixed(1)
      insights.push({
        type: 'comparison',
        title: '📊 Spending Comparison',
        content: `${first[0]} spending is ${ratio}x larger than ${second[0]} ($${(first[1] / 1000000).toFixed(1)}M vs $${(second[1] / 1000000).toFixed(1)}M).`,
        icon: '📊',
        color: 'purple'
      })
    }

    // Insight 6: Time Trends (if date data available)
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
          title: '📈 Spending Trend',
          content: `Award spending ${trend} by ${Math.abs(changePercent)}% from ${firstDate[0]} to ${lastDate[0]} ($${Math.abs(change / 1000000).toFixed(1)}M ${change > 0 ? 'increase' : 'decrease'}).`,
          icon: change > 0 ? '📈' : '📉',
          color: change > 0 ? 'green' : 'red'
        })
      }
    }

    // Insight 7: Average Award Size
    const avgAward = totalSpending / data.length
    insights.push({
      type: 'average',
      title: '📊 Average Award Size',
      content: `Average award amount: $${(avgAward / 1000).toFixed(0)}K per award.`,
      icon: '📊',
      color: 'orange'
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
          <span>USA Spending Insights</span>
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Key findings from federal spending data
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
          💡 Tip: Filter by Awarding Agency, Recipient Name, or Award Type to explore specific spending patterns
        </p>
      </div>
    </div>
  )
}

export default USASpendingInsightsWidget
