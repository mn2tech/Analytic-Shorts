import React, { useMemo, useState } from 'react'
import { formatAiInsightsTopReasons } from '../../utils/aiInsightsTopReasons'

const PAGE_SIZE = 20

export default function RiskRecordsTable({ records = [], onSelectRecord, selectedRecordId }) {
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState('risk_score')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = q
      ? records.filter((r) =>
          String(r.record_id || '').toLowerCase().includes(q)
          || String(r.risk_level || '').toLowerCase().includes(q)
          || String(formatAiInsightsTopReasons(r) || '').toLowerCase().includes(q)
          || String(r.top_reasons?.[0]?.feature || '').toLowerCase().includes(q)
        )
      : records
    const sorted = [...base].sort((a, b) => {
      if (sortBy === 'top_reason') {
        const sa = formatAiInsightsTopReasons(a)
        const sb = formatAiInsightsTopReasons(b)
        const dir = sortDir === 'asc' ? 1 : -1
        return sa.localeCompare(sb) * dir
      }
      const av = a?.[sortBy]
      const bv = b?.[sortBy]
      const dir = sortDir === 'asc' ? 1 : -1
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av ?? '').localeCompare(String(bv ?? '')) * dir
    })
    return sorted
  }, [records, query, sortBy, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * PAGE_SIZE
  const pageRows = filtered.slice(start, start + PAGE_SIZE)

  const toggleSort = (key) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortBy(key)
      setSortDir(key === 'risk_score' ? 'desc' : 'asc')
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">Flagged Records</h3>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setPage(1)
          }}
          placeholder="Search record, level, reason..."
          className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-2">Record ID</th>
              <th className="text-left px-4 py-2 cursor-pointer" onClick={() => toggleSort('risk_score')}>Risk Score</th>
              <th className="text-left px-4 py-2 cursor-pointer" onClick={() => toggleSort('risk_level')}>Risk Level</th>
              <th className="text-left px-4 py-2">Anomaly</th>
              <th className="text-left px-4 py-2 cursor-pointer" onClick={() => toggleSort('top_reason')}>Top Reason</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => {
              const selected = selectedRecordId && String(selectedRecordId) === String(r.record_id)
              return (
                <tr
                  key={String(r.record_id)}
                  onClick={() => onSelectRecord?.(r)}
                  className={`border-t border-slate-100 cursor-pointer ${selected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                >
                  <td className="px-4 py-2 font-medium text-slate-900">{r.record_id}</td>
                  <td className="px-4 py-2">{r.risk_score}</td>
                  <td className="px-4 py-2">{r.risk_level}</td>
                  <td className="px-4 py-2">{r.anomaly_flag ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-2 text-slate-700 max-w-md truncate" title={formatAiInsightsTopReasons(r) || undefined}>
                    {formatAiInsightsTopReasons(r) || '—'}
                  </td>
                </tr>
              )
            })}
            {!pageRows.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No records match your search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Showing {pageRows.length} of {filtered.length}</span>
        <div className="flex items-center gap-2">
          <button className="px-2 py-1 border rounded" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
          <span>{safePage} / {totalPages}</span>
          <button className="px-2 py-1 border rounded" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
        </div>
      </div>
    </div>
  )
}
