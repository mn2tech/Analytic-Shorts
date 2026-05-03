import { useState, useEffect, useRef, useCallback } from 'react'
import { API_BASE_URL } from '../config/api'

/** Ensure we render a real Unicode emoji string (not a component); optional per-index fallback. */
function insightEmojiChar(raw, index) {
  const FALLBACK = ['📌', '💡', '📈', '⚠️', '🎯']
  if (raw == null || raw === '') return FALLBACK[index % FALLBACK.length]
  const s = String(raw)
    .trim()
    .replace(/^emoji\s*:\s*/i, '')
    .replace(/^["']|["']$/g, '')
  if (!s) return FALLBACK[index % FALLBACK.length]
  return s.slice(0, 16)
}

export default function AIInsightsView({
  data,
  columns,
  selectedNumeric,
  selectedCategorical,
}) {
  const [insights, setInsights] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const autoFetchKeyRef = useRef(null)

  const generateInsights = useCallback(async () => {
    if (!data || data.length === 0) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: data.slice(0, 100),
          columns,
          filename: 'dataset.csv',
          mode: 'actionable',
        }),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error || `Request failed (${res.status})`)
      }
      const json = await res.json()
      const raw = json.insights || []
      const normalized = raw.map((x) => {
        if (typeof x === 'string') {
          return { title: x, finding: x, type: 'Insight', emoji: '📊' }
        }
        const em = x?.emoji != null && x.emoji !== '' ? String(x.emoji).trim() : ''
        return { ...x, emoji: em }
      })
      setInsights(normalized)
    } catch (e) {
      setError(e?.message || 'Failed to generate insights. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [data, columns])

  useEffect(() => {
    if (!data?.length) return
    const key = `${data.length}:${columns?.join(',') ?? ''}`
    if (autoFetchKeyRef.current === key) return
    autoFetchKeyRef.current = key
    void generateInsights()
  }, [data, columns, generateInsights])

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '60px 40px', textAlign: 'center', color: '#64748b' }}>
        Upload data to generate AI insights
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', background: '#0f172a', minHeight: '60vh' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 500, color: '#f8fafc', margin: '0 0 4px' }}>AI Insights</h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            {data.length} records analyzed · {columns?.length ?? 0} columns
            {selectedNumeric ? ` · ${selectedNumeric}` : ''}
            {selectedCategorical ? ` · ${selectedCategorical}` : ''} · Powered by AI
          </p>
        </div>
        <button
          type="button"
          onClick={generateInsights}
          disabled={loading}
          style={{
            background: loading ? '#334155' : '#1d4ed8',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 500,
          }}
        >
          {loading ? 'Analyzing...' : '↺ Refresh insights'}
        </button>
      </div>

      {loading && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            padding: '60px 40px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid #334155',
              borderTop: '3px solid #1d4ed8',
              borderRadius: '50%',
              animation: 'nm2-ai-spin 1s linear infinite',
            }}
          />
          <p style={{ color: '#94a3b8', margin: 0 }}>Analyzing your data...</p>
        </div>
      )}

      {error && !loading && (
        <div
          style={{
            background: '#450a0a',
            border: '0.5px solid #7f1d1d',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
            color: '#fca5a5',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      )}

      {!loading && insights.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {insights.map((insight, i) => {
            const colors = {
              Revenue: '#10b981',
              Risk: '#ef4444',
              Opportunity: '#10b981',
              Trend: '#f97316',
              Anomaly: '#f97316',
              Insight: '#3b82f6',
            }
            const borderColor = colors[insight.type] || '#3b82f6'

            return (
              <div
                key={i}
                style={{
                  background: '#1e293b',
                  border: '0.5px solid #334155',
                  borderLeft: `3px solid ${borderColor}`,
                  borderRadius: '0 12px 12px 0',
                  padding: '16px 20px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '8px',
                  }}
                >
                  <span
                    role="img"
                    aria-hidden
                    style={{
                      fontSize: '20px',
                      lineHeight: 1,
                      fontFamily:
                        '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif',
                    }}
                  >
                    {insightEmojiChar(insight.emoji, i)}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#e2e8f0', flex: 1 }}>{insight.title}</span>
                  {insight.type && (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 500,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: `${borderColor}22`,
                        color: borderColor,
                      }}
                    >
                      {insight.type}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 8px', lineHeight: 1.6 }}>
                  {insight.finding || insight.description || insight.text}
                </p>
                {insight.action && (
                  <p style={{ fontSize: '13px', color: '#10b981', margin: 0, lineHeight: 1.6, fontWeight: 500 }}>
                    → {insight.action}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!loading && !error && insights.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 40px', color: '#64748b' }}>
          <p>No insights generated yet.</p>
          <button
            type="button"
            onClick={generateInsights}
            style={{
              marginTop: '12px',
              background: '#1d4ed8',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Generate insights
          </button>
        </div>
      )}

      {!loading && insights.length > 0 && (
        <div
          style={{
            marginTop: '24px',
            background: '#1e293b',
            border: '0.5px solid #334155',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>Want to dig deeper into these insights?</p>
          <button
            type="button"
            onClick={() => {
              const panel = document.querySelector('[data-ask-claude]')
              if (panel) panel.click()
            }}
            style={{
              background: 'none',
              border: '0.5px solid #334155',
              color: '#3b82f6',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Ask Claude to explain →
          </button>
        </div>
      )}

      <style>{`
        @keyframes nm2-ai-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
