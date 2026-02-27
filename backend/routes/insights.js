const express = require('express')
const OpenAI = require('openai')
const { createClient } = require('@supabase/supabase-js')
const { checkInsightLimit } = require('../middleware/usageLimits')
require('dotenv').config()

const router = express.Router()

// Initialize Supabase for authentication (optional)
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Validate URL before creating client
let supabase = null
if (supabaseUrl && supabaseServiceKey) {
  try {
    // Basic URL validation
    if (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://')) {
      supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          persistSession: false
        }
      })
    } else {
      console.warn('Invalid Supabase URL format. Insight tracking will not work.')
    }
  } catch (error) {
    console.warn('Error initializing Supabase client:', error.message)
  }
}

if (!supabase) {
  console.warn('Supabase not configured. Insight tracking will not work.')
}

// Middleware to get user from JWT token (optional)
const getUserFromToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null
      return next()
    }

    const token = authHeader.split(' ')[1]

    if (!supabase || !token) {
      req.user = null
      return next()
    }

    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data || !data.user) {
      req.user = null
      return next()
    }

    req.user = data.user
    next()
  } catch (error) {
    req.user = null
    next()
  }
}

// Initialize OpenAI (optional - can work without it)
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

// Insights route with optional auth and usage limits
router.post('/', getUserFromToken, async (req, res, next) => {
  // If user is authenticated, check usage limits
  if (req.user && req.user.id) {
    const allowed = await checkInsightLimit(req, res, null)
    if (!allowed) {
      // Limit check failed, response already sent
      return
    }
  }
  if (next) next()
}, async (req, res) => {
  try {
    const { data, columns, isFiltered, totalRows, filteredRows, analyzedRows, stats, chartContext, chartType, forecastData, historicalData, trend, selectedNumeric, evidence, mode } = req.body

    // Evidence-only path (Studio): narration from Evidence DTO only, no numeric invention
    if (evidence && typeof evidence === 'object') {
      const evidenceResult = await generateEvidenceNarration(evidence, mode)
      return res.json(evidenceResult)
    }

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

    // Add chart-specific context if provided
    const chartSpecificContext = chartContext 
      ? `\n\nCHART CONTEXT: ${chartContext}Focus your analysis specifically on what this chart is showing. Provide insights that are relevant to this particular visualization.`
      : ''

    // Add forecast-specific context if available
    let forecastContext = ''
    if (chartType === 'forecast' && forecastData && historicalData && trend) {
      const lastHistorical = historicalData[historicalData.length - 1]
      const firstForecast = forecastData[0]
      const lastForecast = forecastData[forecastData.length - 1]
      const changePercent = lastHistorical && firstForecast
        ? ((firstForecast.value - lastHistorical.value) / lastHistorical.value * 100).toFixed(1)
        : '0'
      
      const overallChange = lastHistorical && lastForecast
        ? ((lastForecast.value - lastHistorical.value) / lastHistorical.value * 100).toFixed(1)
        : '0'
      
      forecastContext = `\n\nFORECAST ANALYSIS - EXPLAIN IN SIMPLE TERMS:
- Historical data points: ${historicalData.length}
- Forecast periods: ${forecastData.length}
- Trend direction: ${trend.direction} (confidence: ${(trend.confidence * 100).toFixed(1)}%)
- Last historical value: ${lastHistorical?.value.toLocaleString()}
- First forecast value: ${firstForecast?.value.toLocaleString()} (${changePercent > 0 ? '+' : ''}${changePercent}% change)
- Final forecast value: ${lastForecast?.value.toLocaleString()} (${overallChange > 0 ? '+' : ''}${overallChange}% total change)
- Forecast trend slope: ${trend.slope > 0 ? '+' : ''}${trend.slope.toFixed(4)}

IMPORTANT: Explain the forecast in SIMPLE, NON-TECHNICAL language that anyone can understand. Structure your response as follows:

1. **What This Forecast Means (Simple Explanation)**: 
   - Explain in plain language what the forecast is predicting
   - Use simple analogies if helpful (e.g., "like predicting tomorrow's weather based on today's patterns")
   - Explain what the ${selectedNumeric} values mean in practical terms

2. **Current Prediction Summary**:
   - Is the forecast showing improvement, decline, or stability?
   - What does the ${trend.direction} trend mean in simple terms?
   - How confident is this prediction? (${(trend.confidence * 100).toFixed(1)}% confidence)

3. **What You Can Do to Make It More Positive** (Actionable Recommendations):
   - Provide 3-5 specific, actionable steps to improve the forecasted outcomes
   - Base recommendations on the data patterns you see
   - Make suggestions practical and achievable
   - Focus on what actions could shift the trend in a positive direction
   - Consider what factors might influence ${selectedNumeric} based on the data context

4. **Key Takeaways**:
   - What should the user focus on most?
   - What are the biggest opportunities or risks?

Write in a friendly, conversational tone. Avoid jargon. Make it feel like you're explaining to a friend.`
    }

    // Add chart type specific guidance
    const chartTypeGuidance = chartType === 'forecast'
      ? 'CRITICAL: For forecast charts, you MUST explain everything in simple terms and provide actionable steps to improve outcomes. Focus on: 1) Simple explanation of what the forecast means, 2) What the prediction shows, 3) Specific actionable steps to make it more positive, 4) Key takeaways. Write conversationally, avoid technical jargon.'
      : chartType === 'line'
      ? 'Focus on trends over time, identify patterns, peaks, valleys, and any notable changes in the time series.'
      : chartType === 'pie'
      ? 'Focus on the distribution and proportions. Identify which categories dominate, which are underrepresented, and any notable imbalances.'
      : chartType === 'bar'
      ? 'Focus on comparisons between categories. Identify top performers, outliers, and any significant differences between categories.'
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
        // Special formatting for forecast charts
        const isForecastChart = chartType === 'forecast'
        const basePrompt = isForecastChart
          ? `You are analyzing a forecast/prediction chart. Your task is to explain the forecast in SIMPLE TERMS and provide actionable recommendations to improve outcomes.${filterContext}${chartSpecificContext}${forecastContext}${chartTypeGuidance ? `\n\n${chartTypeGuidance}` : ''}${statsContext}

Columns: ${columns.join(', ')}
Analyzing ${analyzedCount} rows from the filtered dataset.
Sample data (first 15 rows):
${JSON.stringify(data.slice(0, 15), null, 2)}

IMPORTANT: 
- Explain everything in SIMPLE, NON-TECHNICAL language
- Provide SPECIFIC, ACTIONABLE steps to make the forecast more positive
- Structure your response with clear sections as requested
- Write conversationally, like explaining to a friend
- Focus on practical recommendations based on the data patterns

${statsContext ? 'Make sure to include explanations of the Sum, Average, and Trend values in your insights.' : ''}

Provide insights in this format (one per line, no numbering):
- Insight 1
- Insight 2
- Insight 3`
          : `Analyze this dataset and provide 3-5 short, actionable insights. Be concise and specific. Focus on trends, patterns, and notable findings.${filterContext}${chartSpecificContext}${forecastContext}${chartTypeGuidance ? `\n\n${chartTypeGuidance}` : ''}${statsContext}

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

        const prompt = basePrompt

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

const EVIDENCE_SYSTEM_ANALYST = `You are a data analyst. You will receive a JSON object called "evidence" containing KPIs, trends, breakdowns, and drivers. Your task is to write a short narrative using ONLY the numbers and facts present in that evidence. Do not invent any metrics, percentages, or figures. If the evidence does not support a claim, do not make it. If you are unsure, say "not enough information." Be concise and factual.`

const EVIDENCE_SYSTEM_AGENCY = `You are writing for a client-facing monthly performance report. You will receive a JSON object called "evidence" containing KPIs, trends, breakdowns, and drivers. Write a short narrative using ONLY the numbers and facts present in that evidence. Do not invent any metrics or figures. Tone: professional, client-ready, executive summary style. Be concise and factual.`

async function generateEvidenceNarration(evidence, mode) {
  const executiveSummary = ''
  const topInsights = []
  const suggestedQuestions = []
  const isAgency = mode === 'agency'
  const systemContent = isAgency ? EVIDENCE_SYSTEM_AGENCY : EVIDENCE_SYSTEM_ANALYST

  const prompt = `Use only the numbers in the evidence JSON below; do not invent metrics. If unsure, say "not enough information."
${isAgency ? ' Write for a client-facing monthly performance report.' : ''}

Evidence:
${JSON.stringify(evidence, null, 2)}

Respond with valid JSON only, no markdown, with exactly these keys:
- "executiveSummary": string (2-3 sentences summarizing the evidence).
- "topInsights": array of exactly 3 strings (bullet points).
- "suggestedQuestions": array of exactly 3 strings (questions the user could explore).`

  if (openai) {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: prompt },
        ],
        max_tokens: 400,
        temperature: 0.3,
      })
      const raw = completion.choices[0].message.content
      const parsed = (() => {
        const trimmed = raw.replace(/^```json\s*/i, '').replace(/\s*```\s*$/i, '').trim()
        try {
          return JSON.parse(trimmed)
        } catch {
          return null
        }
      })()
      if (parsed && typeof parsed === 'object') {
        return {
          executiveSummary: typeof parsed.executiveSummary === 'string' ? parsed.executiveSummary : executiveSummary,
          topInsights: Array.isArray(parsed.topInsights) ? parsed.topInsights.slice(0, 3) : topInsights,
          suggestedQuestions: Array.isArray(parsed.suggestedQuestions) ? parsed.suggestedQuestions.slice(0, 3) : suggestedQuestions,
        }
      }
    } catch (err) {
      console.error('Evidence narration OpenAI error:', err)
    }
  }

  return {
    executiveSummary: 'Summary could not be generated. Review the metrics and charts above.',
    topInsights: [
      'Review the key metrics and trend for the primary measure.',
      'Check top drivers and breakdowns for contributing factors.',
      'Use filters to explore specific segments.',
    ],
    suggestedQuestions: [
      'Which dimension contributes most to the primary metric?',
      'How does the trend compare across time periods?',
      'What would you like to filter or drill into?',
    ],
  }
}

module.exports = router

