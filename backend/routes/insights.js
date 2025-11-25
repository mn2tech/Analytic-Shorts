const express = require('express')
const OpenAI = require('openai')
require('dotenv').config()

const router = express.Router()

// Initialize OpenAI (optional - can work without it)
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

router.post('/', async (req, res) => {
  try {
    const { data, columns, isFiltered, totalRows, filteredRows, analyzedRows, stats } = req.body

    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: 'Invalid data provided' })
    }

    // Generate insights
    let insights = []

    // Create context about filtering
    const analyzedCount = analyzedRows || data.length
    const filterContext = isFiltered 
      ? `\n\nIMPORTANT: This is a FILTERED subset of the original dataset. The original dataset had ${totalRows} rows, but you are analyzing ${filteredRows} filtered rows (showing ${analyzedCount} rows in the sample). All insights should be based ONLY on this filtered data, not the original full dataset.`
      : analyzedCount < filteredRows
      ? `\n\nNote: Analyzing ${analyzedCount} rows from a dataset of ${filteredRows} total rows.`
      : ''

    // Add summary statistics context
    const statsContext = stats && stats.column
      ? `\n\nSummary Statistics for "${stats.column}" column in the filtered data:
- Sum: ${stats.sum.toLocaleString(undefined, { maximumFractionDigits: 2 })}
- Average: ${stats.avg.toLocaleString(undefined, { maximumFractionDigits: 2 })}
- Trend: ${stats.trend >= 0 ? '+' : ''}${stats.trend.toFixed(1)}% (comparing first half vs second half of the filtered data)

Please explain what these numbers mean in the context of the filtered dataset. Explain:
1. What the Sum represents and its significance
2. What the Average tells us about the typical value
3. What the Trend percentage indicates (is it increasing or decreasing, and by how much)`
      : ''

    if (openai) {
      // Use OpenAI for AI insights
      try {
        const prompt = `Analyze this dataset and provide 3-5 short, actionable insights. Be concise and specific. Focus on trends, patterns, and notable findings.${filterContext}${statsContext}

Columns: ${columns.join(', ')}
Analyzing ${analyzedCount} rows from the filtered dataset.
Sample data (first 15 rows):
${JSON.stringify(data.slice(0, 15), null, 2)}

IMPORTANT: Analyze ONLY the filtered data provided above. ${isFiltered ? 'This is filtered data - provide insights specific to this filtered subset only, not the original full dataset.' : 'Provide insights based on the complete dataset.'}

${statsContext ? 'Make sure to include explanations of the Sum, Average, and Trend values in your insights.' : ''}

Provide insights in this format (one per line, no numbering):
- Insight 1
- Insight 2
- Insight 3`

        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a data analyst. Provide concise, actionable insights from datasets.',
            },
            { role: 'user', content: prompt },
          ],
          max_tokens: 300,
          temperature: 0.7,
        })

        const responseText = completion.choices[0].message.content
        insights = responseText
          .split('\n')
          .map((line) => line.replace(/^[-•]\s*/, '').trim())
          .filter((line) => line.length > 0)
      } catch (error) {
        console.error('OpenAI error:', error)
        // Fall back to rule-based insights
        insights = generateRuleBasedInsights(data, columns, isFiltered, totalRows, filteredRows, stats)
      }
    } else {
      // Rule-based insights (fallback)
      insights = generateRuleBasedInsights(data, columns, isFiltered, totalRows, filteredRows, stats)
    }

    res.json({ insights })
  } catch (error) {
    console.error('Insights error:', error)
    res.status(500).json({ error: error.message || 'Failed to generate insights' })
  }
})

function generateRuleBasedInsights(data, columns, isFiltered, totalRows, filteredRows, stats) {
  const insights = []
  const filterNote = isFiltered ? ` (filtered from ${totalRows} total rows)` : ''

  // Add explanations for sum, average, and trend if stats are provided
  if (stats && stats.column) {
    insights.push(
      `Sum Explanation: The total sum of "${stats.column}" in the filtered data is ${stats.sum.toLocaleString(undefined, { maximumFractionDigits: 2 })}. This represents the cumulative total of all values in this column for the filtered dataset.`
    )
    
    insights.push(
      `Average Explanation: The average value of "${stats.column}" is ${stats.avg.toLocaleString(undefined, { maximumFractionDigits: 2 })}. This means the typical or mean value in the filtered data is ${stats.avg.toLocaleString(undefined, { maximumFractionDigits: 2 })}.`
    )
    
    if (Math.abs(stats.trend) > 0.1) {
      const trendDirection = stats.trend >= 0 ? 'increasing' : 'decreasing'
      const trendMagnitude = Math.abs(stats.trend)
      insights.push(
        `Trend Explanation: The trend shows a ${trendDirection} pattern of ${trendMagnitude.toFixed(1)}%. This means that when comparing the first half of the filtered data to the second half, the average value has ${trendDirection} by ${trendMagnitude.toFixed(1)}%, indicating a ${trendDirection} trend in the filtered dataset.`
      )
    } else {
      insights.push(
        `Trend Explanation: The trend is ${stats.trend >= 0 ? '+' : ''}${stats.trend.toFixed(1)}%, indicating a relatively stable pattern with minimal change between the first and second half of the filtered data.`
      )
    }
  }

  // Analyze numeric columns
  columns.forEach((column) => {
    const values = data
      .map((row) => parseFloat(row[column]))
      .filter((val) => !isNaN(val) && isFinite(val))

    if (values.length > 0) {
      const sum = values.reduce((a, b) => a + b, 0)
      const avg = sum / values.length
      const min = Math.min(...values)
      const max = Math.max(...values)

      // Compare first half vs second half for trend
      const mid = Math.floor(values.length / 2)
      if (mid > 0) {
        const firstHalf = values.slice(0, mid)
        const secondHalf = values.slice(mid)
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
        const change = ((secondAvg - firstAvg) / firstAvg) * 100

        if (Math.abs(change) > 5) {
          insights.push(
            `In the filtered data, ${column} shows a ${change >= 0 ? 'positive' : 'negative'} trend of ${Math.abs(change).toFixed(1)}% between the first and second half${filterNote}.`
          )
        }
      }

      if (max / avg > 2) {
        insights.push(`In the filtered dataset, ${column} has significant outliers, with maximum value ${max.toFixed(2)} being ${(max / avg).toFixed(1)}x the average${filterNote}.`)
      }
    }
  })

  // Analyze categorical columns
  columns.forEach((column) => {
    const valueCounts = {}
    data.forEach((row) => {
      const value = row[column]
      if (value) {
        valueCounts[value] = (valueCounts[value] || 0) + 1
      }
    })

    const entries = Object.entries(valueCounts).sort((a, b) => b[1] - a[1])
    if (entries.length > 0) {
      const topValue = entries[0]
      const percentage = (topValue[1] / data.length) * 100
      if (percentage > 30) {
        insights.push(
          `In the filtered data, ${topValue[0]} is the most common value in ${column}, appearing ${percentage.toFixed(1)}% of the time${filterNote}.`
        )
      }
    }
  })

  // Ensure we have at least 3 insights
  if (insights.length === 0) {
    insights.push(`Filtered dataset contains ${data.length} rows with ${columns.length} columns${filterNote}.`)
    insights.push('Analyze the filtered data to discover patterns specific to your selected criteria.')
  }

  return insights.slice(0, 5) // Limit to 5 insights
}

module.exports = router

