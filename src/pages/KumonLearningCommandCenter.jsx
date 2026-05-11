import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import apiClient from '../config/api'
import CommandCenterHeader from '../components/CommandCenterHeader'
import {
  applyDemoSurge,
  buildAlertQueue,
  buildDashboardSpec,
  buildFallbackKumonData,
  buildKpis,
  buildKumonUnifiedRows,
  buildTrends,
} from '../utils/kumonCommandCenterModel'

const FILE_KEYS = ['students', 'sessions', 'seatmap', 'alerts']
const REFRESH_MS = 5000

function pct(n) {
  return `${Number(n || 0).toFixed(1)}%`
}

function num(n, d = 1) {
  return Number(n || 0).toFixed(d)
}

export default function KumonLearningCommandCenter() {
  const fallback = useMemo(() => buildFallbackKumonData(), [])
  const [datasets, setDatasets] = useState(fallback)
  const [loadingMap, setLoadingMap] = useState({})
  const [uploadErrors, setUploadErrors] = useState({})
  const [selectedSeatId, setSelectedSeatId] = useState(null)
  const [activeFilters, setActiveFilters] = useState({ subject: 'All', instructor: 'All', level: 'All' })
  const [demoMode, setDemoMode] = useState(false)
  const [demoPhase, setDemoPhase] = useState(0)
  const [aiInsights, setAiInsights] = useState([])
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [viewZoom, setViewZoom] = useState(1)
  const [hoveredSeat, setHoveredSeat] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [bouncingSeatIds, setBouncingSeatIds] = useState([])
  const prevStatusBySeatRef = useRef(new Map())

  const mergedRows = useMemo(() => {
    const rows = buildKumonUnifiedRows(datasets)
    return applyDemoSurge(rows, demoMode, demoPhase)
  }, [datasets, demoMode, demoPhase])

  const filteredRows = useMemo(() => {
    return mergedRows.filter((row) => {
      if (selectedSeatId && row.seat_id !== selectedSeatId) return false
      if (activeFilters.subject !== 'All' && row.subject !== activeFilters.subject) return false
      if (activeFilters.instructor !== 'All' && row.instructor !== activeFilters.instructor) return false
      if (activeFilters.level !== 'All' && row.current_level !== activeFilters.level) return false
      return true
    })
  }, [activeFilters, mergedRows, selectedSeatId])

  const kpis = useMemo(() => buildKpis(filteredRows), [filteredRows])
  const interventionRequired = useMemo(
    () => filteredRows.filter((r) => r.accuracy < 85 || r.help_wait_min > 5).length,
    [filteredRows]
  )
  const centerPerf = useMemo(() => {
    const total = filteredRows.length || 1
    const completed = filteredRows.filter((r) => r.status === 'Completed').length
    const atRisk = filteredRows.filter((r) => r.accuracy < 80).length
    const completionRate = (completed / total) * 100
    const avgAcc = kpis.avg_accuracy || 0
    const trendLabel = avgAcc >= 90 && atRisk <= 1
      ? 'Overall performance improving'
      : avgAcc < 85 || atRisk > 3
        ? 'Overall performance declining'
        : 'Overall performance stable'
    return { avgAcc, completionRate, atRisk, trendLabel }
  }, [filteredRows, kpis.avg_accuracy])
  const trends = useMemo(() => buildTrends(filteredRows), [filteredRows])
  const alertQueue = useMemo(() => buildAlertQueue(filteredRows), [filteredRows])
  const dashboardSpec = useMemo(() => buildDashboardSpec(filteredRows), [filteredRows])
  const seatRows = useMemo(() => {
    if (!filteredRows.length) return []
    const xs = filteredRows.map((r) => Number(r.x) || 0)
    const ys = filteredRows.map((r) => Number(r.y) || 0)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const spanX = Math.max(1, maxX - minX)
    const spanY = Math.max(1, maxY - minY)
    return filteredRows.map((row) => {
      const x = Number(row.x) || 0
      const y = Number(row.y) || 0
      // Normalize any input coordinate scale into a stable 5%-95% seatmap viewport.
      const leftPct = ((x - minX) / spanX) * 90 + 5
      const topPct = ((y - minY) / spanY) * 90 + 5
      return {
        ...row,
        leftPct,
        topPct,
      }
    })
  }, [filteredRows])

  useEffect(() => {
    const changed = []
    for (const row of seatRows) {
      const prev = prevStatusBySeatRef.current.get(row.seat_id)
      if (prev && prev !== row.status) changed.push(row.seat_id)
      prevStatusBySeatRef.current.set(row.seat_id, row.status)
    }
    if (!changed.length) return
    setBouncingSeatIds(changed)
    const timeout = setTimeout(() => setBouncingSeatIds([]), 650)
    return () => clearTimeout(timeout)
  }, [seatRows])

  const filterOptions = useMemo(() => {
    const subjects = [...new Set(mergedRows.map((r) => r.subject))].sort()
    const instructors = [...new Set(mergedRows.map((r) => r.instructor))].sort()
    const levels = [...new Set(mergedRows.map((r) => r.current_level))].sort()
    return { subjects, instructors, levels }
  }, [mergedRows])

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  useEffect(() => {
    if (!demoMode) {
      setDemoPhase(0)
      return
    }
    setDemoPhase(0)
    const timeline = setInterval(() => {
      setDemoPhase((p) => {
        if (p >= 5) return 5
        return p + 1
      })
    }, 2000)
    return () => clearInterval(timeline)
  }, [demoMode])

  const buildInsightPrompt = useCallback(() => {
    const waitingCount = filteredRows.filter((r) => r.help_wait_min > 5).length
    const math = filteredRows.filter((r) => r.zone === 'Math')
    const reading = filteredRows.filter((r) => r.zone === 'Reading')
    const mathAcc = math.length ? math.reduce((s, r) => s + r.accuracy, 0) / math.length : 0
    const readingAcc = reading.length ? reading.reduce((s, r) => s + r.accuracy, 0) / reading.length : 0
    const stuckLevelC = filteredRows.filter((r) => r.subject === 'Math' && r.current_level === 'C' && r.alert_flag).length
    const criticalCount = filteredRows.filter((r) => r.accuracy < 80 || r.help_wait_min > 7).length
    return [
      'Generate 3 to 5 action-oriented recommendations for a Kumon command center.',
      'Prioritize highest operational impact first.',
      'Output format per line: [Issue]. [Impact]. Recommend [Action].',
      'Keep each line concise and operational.',
      'No bullets. Return one recommendation per line.',
      `Students in view: ${filteredRows.length}.`,
      `Math level C at risk: ${stuckLevelC}.`,
      `Waiting for help (>5m): ${waitingCount}.`,
      `Critical students (accuracy < 80 OR wait > 7): ${criticalCount}.`,
      `Math avg accuracy: ${num(mathAcc, 1)}.`,
      `Reading avg accuracy: ${num(readingAcc, 1)}.`,
      `Overall avg accuracy: ${num(kpis.avg_accuracy, 1)}.`,
      `Use thresholds: avg accuracy below 85 is concerning.`,
    ].join('\n')
  }, [filteredRows, kpis.avg_accuracy])

  useEffect(() => {
    let cancelled = false
    async function runInsights() {
      if (!filteredRows.length) {
        setAiInsights([])
        return
      }
      setInsightsLoading(true)
      try {
        const response = await apiClient.post('/api/ai/app-chat', {
          messages: [{ role: 'user', content: buildInsightPrompt() }],
        })
        const lines = String(response?.data?.reply || '')
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 5)
        if (!cancelled && lines.length) {
          setAiInsights(lines.slice(0, Math.max(3, Math.min(5, lines.length))))
        }
      } catch {
        const mathRows = filteredRows.filter((r) => r.zone === 'Math')
        const readingRows = filteredRows.filter((r) => r.zone === 'Reading')
        const mathAcc = mathRows.length ? mathRows.reduce((s, r) => s + r.accuracy, 0) / mathRows.length : 0
        const readingAcc = readingRows.length ? readingRows.reduce((s, r) => s + r.accuracy, 0) / readingRows.length : 0
        const stuckC = filteredRows.filter((r) => r.subject === 'Math' && r.current_level === 'C' && r.alert_flag).length
        const waiting = filteredRows.filter((r) => r.help_wait_min > 5).length
        const critical = filteredRows.filter((r) => r.accuracy < 80 || r.help_wait_min > 7).length
        const impactItems = [
          {
            score: critical * 3,
            text: `${critical} students are in critical risk state (accuracy < 80 or help wait > 7). Learning loss risk is immediate and compounding. Recommend immediate instructor triage and 1:1 intervention in the next rotation.`,
          },
          {
            score: waiting * 2,
            text: `${waiting} students are waiting over 5 minutes for help. Extended idle time is reducing throughput and completion rates. Recommend rebalancing instructor assignments and opening a rapid-help queue.`,
          },
          {
            score: stuckC * 2,
            text: `${stuckC} students are below mastery threshold in Math Level C. This bottleneck will slow progression across the session. Recommend targeted Level C mini-clinic with focused corrective packets.`,
          },
          {
            score: Math.round(Math.max(0, 85 - kpis.avg_accuracy)),
            text: `${num(kpis.avg_accuracy, 1)}% average accuracy is below the 85% target threshold. Overall mastery stability is declining across active seats. Recommend reducing packet pace and enforcing mastery checks before advancement.`,
          },
          {
            score: Math.round(Math.abs(mathAcc - readingAcc)),
            text: `${num(mathAcc, 1)}% Math accuracy vs ${num(readingAcc, 1)}% Reading accuracy indicates zone performance imbalance. Uneven outcomes may widen if unaddressed this shift. Recommend deploying strongest instructor coverage to the lower-performing zone for the next cycle.`,
          },
        ]
          .sort((a, b) => b.score - a.score)
          .filter((item) => item.score > 0)
          .slice(0, 5)

        const fallbackInsights = impactItems.length >= 3 ? impactItems : impactItems.slice(0, 2).concat([
          { text: 'Operational variance is low but early intervention remains recommended. Small regressions can scale quickly during peak hours. Recommend maintaining proactive monitoring and targeted seat checks every 15 minutes.' },
        ])
        if (!cancelled) setAiInsights(fallbackInsights.slice(0, 5).map((i) => i.text))
      } finally {
        if (!cancelled) setInsightsLoading(false)
      }
    }
    runInsights()
    return () => { cancelled = true }
  }, [buildInsightPrompt, filteredRows, kpis.avg_accuracy])

  const handleUpload = async (datasetKey, event) => {
    const file = event?.target?.files?.[0]
    if (!file) return
    setUploadErrors((prev) => ({ ...prev, [datasetKey]: '' }))
    setLoadingMap((prev) => ({ ...prev, [datasetKey]: true }))
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await apiClient.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const rows = Array.isArray(response?.data?.data) ? response.data.data : []
      setDatasets((prev) => ({ ...prev, [datasetKey]: rows }))
    } catch (error) {
      setUploadErrors((prev) => ({
        ...prev,
        [datasetKey]: error?.response?.data?.error || error?.message || 'Upload failed',
      }))
    } finally {
      setLoadingMap((prev) => ({ ...prev, [datasetKey]: false }))
      event.target.value = ''
    }
  }

  const handleExportSpec = () => {
    const payload = {
      ...dashboardSpec,
      title: 'Kumon Learning Command Center',
      subtitle: 'Real-time student flow, performance, and AI-driven intervention',
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'kumon-learning-command-center-spec.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (_) {
      // Ignore browser permission errors and keep UI usable.
    }
  }

  const handleZoomOut = () => setViewZoom((z) => Math.max(0.8, Number((z - 0.1).toFixed(2))))
  const handleZoomIn = () => setViewZoom((z) => Math.min(1.6, Number((z + 0.1).toFixed(2))))

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div
        className="mx-auto px-4 py-5 space-y-4"
        style={{
          maxWidth: '1700px',
          transform: `scale(${viewZoom})`,
          transformOrigin: 'top center',
          transition: 'transform 180ms ease-out',
          width: `${100 / viewZoom}%`,
        }}
      >
        <CommandCenterHeader
          appName="Learning Command Center"
          facilityName="Kumon Learning"
          facilityType="Student Flow & Performance"
          mode="Command Center"
          logoFallback="K"
          className="-mx-4 -mt-5"
        />

        <div className="flex items-center justify-end flex-wrap gap-2">
            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="px-3 py-1.5 text-xs rounded bg-slate-800 hover:bg-slate-700 border border-white/10"
            >
              {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="px-2.5 py-1.5 text-xs rounded bg-slate-800 hover:bg-slate-700 border border-white/10"
              title="Zoom out"
            >
              -
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              className="px-2.5 py-1.5 text-xs rounded bg-slate-800 hover:bg-slate-700 border border-white/10"
              title="Zoom in"
            >
              +
            </button>
            <span className="text-xs text-slate-300 min-w-[44px] text-center">{Math.round(viewZoom * 100)}%</span>
            <button
              type="button"
              onClick={() => setDemoMode((v) => !v)}
              className={`px-3 py-1.5 text-xs rounded border ${demoMode ? 'bg-rose-600 border-rose-400' : 'bg-slate-800 border-white/10'}`}
            >
              Demo Scenario {demoMode ? 'ON (5:30 PM surge)' : 'OFF'}
            </button>
            <button type="button" onClick={handleExportSpec} className="px-3 py-1.5 text-xs rounded bg-blue-600 hover:bg-blue-500">
              Export DashboardSpec JSON
            </button>
        </div>
        {demoMode && (
          <div className="rounded-lg border border-rose-300/50 bg-rose-950/35 px-3 py-2 text-sm text-rose-100">
            <span className="font-semibold">Live Simulation: Peak Hour Surge (5:30 PM)</span>
            <span className="ml-2 text-rose-200/90">Timeline {Math.min(10, demoPhase * 2)}s / 10s</span>
          </div>
        )}

        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
          <p className="text-xs text-slate-400 mb-2">Upload CSV datasets (students, sessions, seatmap, alerts). Existing sample data remains until replaced.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {FILE_KEYS.map((key) => (
              <label key={key} className="rounded border border-white/10 bg-slate-800/70 p-2 text-xs cursor-pointer hover:bg-slate-800">
                <div className="font-semibold uppercase">{key}.csv</div>
                <div className="text-slate-400 mt-1">{loadingMap[key] ? 'Uploading...' : 'Click to upload'}</div>
                {uploadErrors[key] && <div className="text-red-300 mt-1">{uploadErrors[key]}</div>}
                <input type="file" accept=".csv" className="hidden" onChange={(e) => handleUpload(key, e)} />
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3 grid grid-cols-1 md:grid-cols-4 gap-2">
          <select
            className="px-2 py-2 rounded bg-slate-800 border border-white/10 text-sm"
            value={activeFilters.subject}
            onChange={(e) => setActiveFilters((prev) => ({ ...prev, subject: e.target.value }))}
          >
            <option value="All">All Subjects</option>
            {filterOptions.subjects.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select
            className="px-2 py-2 rounded bg-slate-800 border border-white/10 text-sm"
            value={activeFilters.instructor}
            onChange={(e) => setActiveFilters((prev) => ({ ...prev, instructor: e.target.value }))}
          >
            <option value="All">All Instructors</option>
            {filterOptions.instructors.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select
            className="px-2 py-2 rounded bg-slate-800 border border-white/10 text-sm"
            value={activeFilters.level}
            onChange={(e) => setActiveFilters((prev) => ({ ...prev, level: e.target.value }))}
          >
            <option value="All">All Levels</option>
            {filterOptions.levels.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <button
            type="button"
            onClick={() => { setSelectedSeatId(null); setActiveFilters({ subject: 'All', instructor: 'All', level: 'All' }) }}
            className="px-2 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-white/10 text-sm"
          >
            Clear Filters
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_1fr_1fr] gap-4">
          <section className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
            <h2 className="text-sm font-semibold text-cyan-300 mb-2">Seat Map</h2>
            <div className="relative rounded-lg border border-white/10 bg-slate-950/80 h-[520px] overflow-hidden">
              {seatRows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className={[
                    'absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all hover:scale-110',
                    selectedSeatId === row.seat_id ? 'border-white ring-2 ring-white/50 z-20' : 'border-white/30',
                    row.status === 'Needs Help' ? 'kumon-seat-pulse-red' : '',
                    row.status === 'Struggling' ? 'kumon-seat-glow-yellow' : '',
                    bouncingSeatIds.includes(row.seat_id) ? 'kumon-seat-bounce' : '',
                  ].join(' ')}
                  style={{
                    left: `${row.leftPct}%`,
                    top: `${row.topPct}%`,
                    width: selectedSeatId === row.seat_id ? 36 : 28,
                    height: selectedSeatId === row.seat_id ? 36 : 28,
                    backgroundColor: row.status_hex,
                    boxShadow: row.critical ? '0 0 18px rgba(239,68,68,.8)' : '0 0 10px rgba(15,23,42,.5)',
                  }}
                  onClick={() => setSelectedSeatId((prev) => (prev === row.seat_id ? null : row.seat_id))}
                  onMouseEnter={(e) => {
                    setHoveredSeat(row)
                    setTooltipPos({ x: e.clientX, y: e.clientY })
                  }}
                  onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => setHoveredSeat(null)}
                >
                  {row.critical ? <span className="text-[10px]">!</span> : null}
                </button>
              ))}
              {hoveredSeat && (
                <div
                  className="fixed z-50 pointer-events-none min-w-[190px] rounded-lg border border-white/20 bg-slate-900/95 shadow-2xl px-3 py-2 text-xs"
                  style={{ left: tooltipPos.x + 14, top: tooltipPos.y - 10 }}
                >
                  <div className="font-semibold text-cyan-300 mb-1">{hoveredSeat.student_name}</div>
                  <div className="flex justify-between gap-3"><span className="text-slate-400">Level</span><span>{hoveredSeat.current_level}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-slate-400">Accuracy</span><span>{num(hoveredSeat.accuracy)}%</span></div>
                  <div className="flex justify-between gap-3"><span className="text-slate-400">Help Wait</span><span>{num(hoveredSeat.help_wait_min, 0)}m</span></div>
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Click a seat to filter the entire dashboard. Hover for tooltip details.</p>
          </section>

          <section className="rounded-xl border border-white/10 bg-slate-900/70 p-3 space-y-3">
            <h2 className="text-sm font-semibold text-emerald-300">KPIs + Trends</h2>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded border border-white/10 bg-slate-800/70 p-2"><div className="text-slate-400">Total Students</div><div className="text-lg font-semibold">{kpis.total_students}</div></div>
              <div className="rounded border border-white/10 bg-slate-800/70 p-2"><div className="text-slate-400">% On Track</div><div className="text-lg font-semibold">{pct(kpis.pct_on_track)}</div></div>
              <div className="rounded border border-white/10 bg-slate-800/70 p-2"><div className="text-slate-400">% Struggling</div><div className="text-lg font-semibold">{pct(kpis.pct_struggling)}</div></div>
              <div className="rounded border border-white/10 bg-slate-800/70 p-2"><div className="text-slate-400">Avg Time/Packet</div><div className="text-lg font-semibold">{num(kpis.avg_time_per_packet)}m</div></div>
              <div className="rounded border border-white/10 bg-slate-800/70 p-2"><div className="text-slate-400">Avg Accuracy</div><div className="text-lg font-semibold">{num(kpis.avg_accuracy)}%</div></div>
              <div className="rounded border border-white/10 bg-slate-800/70 p-2"><div className="text-slate-400">Waiting Help</div><div className="text-lg font-semibold">{kpis.students_waiting_help}</div></div>
              <div className="rounded border border-white/10 bg-slate-800/70 p-2 col-span-2">
                <div className="text-slate-400">Intervention Required</div>
                <div
                  className="text-lg font-semibold"
                  style={{
                    color:
                      interventionRequired < 2
                        ? '#22c55e'
                        : interventionRequired <= 4
                          ? '#f59e0b'
                          : '#ef4444',
                  }}
                >
                  {interventionRequired}
                </div>
              </div>
            </div>

            <div className="rounded border border-white/10 bg-slate-800/70 p-3 text-xs space-y-1">
              <div className="text-slate-300 font-semibold">Center Performance Today</div>
              <div className="flex justify-between"><span className="text-slate-400">Avg Accuracy</span><span>{num(centerPerf.avgAcc)}%</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Completion Rate</span><span>{num(centerPerf.completionRate)}%</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Students At Risk</span><span>{centerPerf.atRisk}</span></div>
              <div className={`pt-1 font-medium ${
                centerPerf.trendLabel.includes('declining')
                  ? 'text-red-300'
                  : centerPerf.trendLabel.includes('improving')
                    ? 'text-emerald-300'
                    : 'text-amber-300'
              }`}>
                {centerPerf.trendLabel}
              </div>
            </div>

            <div className="h-44 rounded border border-white/10 bg-slate-800/50 p-2">
              <div className="text-xs text-slate-300 mb-1">Time Spent by Level</div>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends.time_spent_by_level}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="level" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Bar dataKey="avg_time" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="h-44 rounded border border-white/10 bg-slate-800/50 p-2">
              <div className="text-xs text-slate-300 mb-1">Accuracy by Subject</div>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends.accuracy_by_subject}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="subject" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="avg_accuracy" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="h-44 rounded border border-white/10 bg-slate-800/50 p-2">
              <div className="text-xs text-slate-300 mb-1">Students by Status</div>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={trends.students_by_status} dataKey="count" nameKey="status" outerRadius={60}>
                    {trends.students_by_status.map((entry) => (
                      <Cell key={entry.status} fill={
                        entry.status === 'On Track' ? '#22c55e'
                          : entry.status === 'Struggling' ? '#f59e0b'
                            : entry.status === 'Needs Help' ? '#ef4444'
                              : '#3b82f6'
                      } />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-amber-300">Alerts + Instructor Queue</h2>
              {insightsLoading && <span className="text-[11px] text-slate-400">Updating insights...</span>}
            </div>
            <div className="space-y-2 mb-3 min-h-[104px]">
              {(aiInsights.length ? aiInsights : ['No insights yet.']).map((line, idx) => (
                <div key={`${line}-${idx}`} className="rounded border border-white/10 bg-slate-800/70 p-2 text-xs text-slate-100">
                  {line}
                </div>
              ))}
            </div>
            <div className="max-h-[430px] overflow-auto border border-white/10 rounded-lg">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-800 text-slate-200">
                  <tr>
                    <th className="px-2 py-2 text-left">Severity</th>
                    <th className="px-2 py-2 text-left">Student</th>
                    <th className="px-2 py-2 text-left">Alert Reason</th>
                    <th className="px-2 py-2 text-right">Help Wait</th>
                    <th className="px-2 py-2 text-right">Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {alertQueue.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-t border-white/5 ${
                        row.severity === 'Critical'
                          ? 'bg-red-900/45 kumon-alert-critical-row'
                          : row.severity === 'Warning'
                            ? 'bg-amber-900/20'
                            : 'bg-slate-900/40'
                      }`}
                    >
                      <td className="px-2 py-2">
                        <span className="inline-flex items-center gap-1">
                          <span>{row.severity_icon}</span>
                          <span>{row.severity}</span>
                        </span>
                      </td>
                      <td className="px-2 py-2">{row.student_name}</td>
                      <td className="px-2 py-2">{row.alert_reason}</td>
                      <td className="px-2 py-2 text-right">{row.help_wait_min}m</td>
                      <td className="px-2 py-2 text-right">{num(row.accuracy)}%</td>
                    </tr>
                  ))}
                  {alertQueue.length === 0 && (
                    <tr>
                      <td className="px-2 py-3 text-slate-400" colSpan={5}>No alerts in current filter view.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
