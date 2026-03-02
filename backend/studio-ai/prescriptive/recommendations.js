/**
 * Prescriptive recommendations generator.
 * Takes CanonicalIR and produces evidence-backed ranked actions.
 */

const OpenAI = require('openai')
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

const RECOMMENDATIONS_SYSTEM = `You are a strategic advisor. Given analytics evidence (metrics, trends, drivers, forecasts), output ranked, actionable recommendations.
Each recommendation MUST cite specific metrics or findings from the evidence. Do not invent metrics.
Format: valid JSON only, no markdown, with key "recommendations" - array of objects:
- "action": string (concise actionable step)
- "supportingMetricsRefs": array of strings (e.g. ["kpi-01.latest.value", "trend-01.direction", "driver.Region.North.share"])
- "expectedImpact": string (brief qualitative impact, e.g. "May improve top-line by 5-10% if executed")
- "priority": number 1-5 (1=highest)
- "risk": "low" | "medium" | "high" (implementation risk)
Limit to 5 recommendations. Be specific and evidence-based.`

/**
 * Generate evidence-backed executive recommendations from CanonicalIR.
 * @param {Object} ir - CanonicalIR from studioRunToCanonicalIR
 * @returns {Promise<Array<{action: string, supportingMetricsRefs: string[], expectedImpact: string, priority: number, risk: string}>>}
 */
async function generateExecutiveRecommendations(ir) {
  const fallback = [
    {
      action: 'Review key metrics and trend for the primary measure.',
      supportingMetricsRefs: ['metrics[0]'],
      expectedImpact: 'Align strategy with current performance.',
      priority: 1,
      risk: 'low',
    },
    {
      action: 'Focus on top-performing segments identified in drivers.',
      supportingMetricsRefs: ['segments.driver'],
      expectedImpact: 'Capitalize on areas with highest contribution.',
      priority: 2,
      risk: 'low',
    },
    {
      action: 'Address underperforming segments or time periods.',
      supportingMetricsRefs: ['time_series', 'segments.compare_periods'],
      expectedImpact: 'Mitigate decline and stabilize performance.',
      priority: 3,
      risk: 'medium',
    },
  ]

  if (!openai || !ir) return fallback

  const evidenceSummary = {
    metrics: (ir.metrics || []).slice(0, 5).map((m) => ({
      id: m.id,
      primaryMeasure: m.primaryMeasure,
      latest: m.latest,
      change: m.change,
      periodTotal: m.periodTotal,
    })),
    segments: (ir.segments || []).slice(0, 5).map((s) => ({
      type: s.type,
      dimension: s.dimension,
      topRows: (s.rows || s.topDrivers || []).slice(0, 3),
    })),
    time_series: (ir.time_series || []).slice(0, 2).map((t) => ({
      measure: t.measure,
      grain: t.grain,
      lastValue: t.series?.length ? t.series[t.series.length - 1] : null,
      anomalies: t.anomalies,
    })),
    forecasts: (ir.forecasts || []).map((f) => ({
      measure: f.measure,
      trend: f.trend,
    })),
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: RECOMMENDATIONS_SYSTEM },
        {
          role: 'user',
          content: `Evidence summary:\n${JSON.stringify(evidenceSummary, null, 2)}\n\nOutput only valid JSON with key "recommendations":`,
        },
      ],
      max_tokens: 800,
      temperature: 0.3,
    })

    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const jsonMatch = raw.replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/, '$1')
    const parsed = JSON.parse(jsonMatch)
    const recs = Array.isArray(parsed.recommendations) ? parsed.recommendations : []

    return recs.slice(0, 5).map((r) => ({
      action: typeof r.action === 'string' ? r.action : String(r.action || ''),
      supportingMetricsRefs: Array.isArray(r.supportingMetricsRefs) ? r.supportingMetricsRefs : [],
      expectedImpact: typeof r.expectedImpact === 'string' ? r.expectedImpact : '',
      priority: Math.max(1, Math.min(5, Number(r.priority) || 3)),
      risk: ['low', 'medium', 'high'].includes(r.risk) ? r.risk : 'medium',
    }))
  } catch (err) {
    console.error('[recommendations] OpenAI error:', err?.message || err)
    return fallback
  }
}

module.exports = { generateExecutiveRecommendations }
