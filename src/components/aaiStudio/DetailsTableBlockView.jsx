import { useMemo, useState, useCallback } from 'react'

export default function DetailsTableBlockView({ block }) {
  const rows = Array.isArray(block?.payload?.rows) ? block.payload.rows : []
  const columnOrder = Array.isArray(block?.payload?.columnOrder) ? block.payload.columnOrder : Object.keys(rows[0] || {})
  const columns = columnOrder.slice(0, 12)

  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState(1)
  const [detailRow, setDetailRow] = useState(null)

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows
    const s = search.toLowerCase()
    return rows.filter((r) => columns.some((c) => String(r?.[c] ?? '').toLowerCase().includes(s)))
  }, [rows, columns, search])

  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows
    return [...filteredRows].sort((a, b) => {
      const va = a?.[sortKey]
      const vb = b?.[sortKey]
      const cmp = String(va ?? '').localeCompare(String(vb ?? ''), undefined, { numeric: true })
      return sortDir * (cmp || 0)
    })
  }, [filteredRows, sortKey, sortDir])

  const handleSort = useCallback((key) => {
    setSortKey((k) => {
      if (k === key) {
        setSortDir((d) => -d)
        return key
      }
      setSortDir(1)
      return key
    })
  }, [])

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="search"
          placeholder="Search rows..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-xs text-sm rounded-lg px-3 py-1.5"
          style={{ border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }}
        />
      </div>
      <div className="overflow-auto rounded-xl shadow-sm" style={{ border: '1px solid var(--border)', background: 'var(--card)' }}>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left" style={{ color: 'var(--muted)', background: 'var(--card-2)' }}>
              {columns.map((c) => (
                <th
                  key={c}
                  className="py-2 pr-3 cursor-pointer select-none"
                  style={{ borderColor: 'var(--border)' }}
                  onClick={() => handleSort(c)}
                >
                  {c} {sortKey === c && (sortDir === 1 ? '↑' : '↓')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((r, idx) => (
              <tr
                key={idx}
                className="border-t cursor-pointer"
                style={{ background: detailRow === idx ? 'var(--card-2)' : undefined, borderColor: 'var(--border)' }}
                onClick={() => setDetailRow(detailRow === idx ? null : idx)}
              >
                {columns.map((col) => (
                  <td key={col} className="py-2 pr-3" style={{ color: 'var(--text)' }}>
                    {String(r?.[col] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {detailRow != null && sortedRows[detailRow] && (
        <div className="rounded-xl p-4 shadow-sm" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Row detail</span>
            <button
              type="button"
              onClick={() => setDetailRow(null)}
              className="text-sm"
              style={{ color: 'var(--muted)' }}
            >
              Close
            </button>
          </div>
          <pre className="text-xs overflow-auto rounded-lg p-3 max-h-64" style={{ background: 'var(--card-2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            {JSON.stringify(sortedRows[detailRow], null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
