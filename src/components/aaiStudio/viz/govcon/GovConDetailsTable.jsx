/**
 * GovCon: Details table – Notice ID, Solicitation, Due Date, Agency, NAICS, State (sortable).
 */
import { useState, useMemo } from 'react'

export default function GovConDetailsTable({ block }) {
  const [sortCol, setSortCol] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const payload = block?.payload || {}
  const columnOrder = Array.isArray(payload.columnOrder) ? payload.columnOrder : []
  const rows = Array.isArray(payload.rows) ? payload.rows : []

  const sortedRows = useMemo(() => {
    if (!sortCol || rows.length === 0) return rows
    return [...rows].sort((a, b) => {
      const va = a[sortCol]
      const vb = b[sortCol]
      const cmp = va == null && vb == null ? 0 : (va == null ? 1 : vb == null ? -1 : String(va).localeCompare(String(vb), undefined, { numeric: true }))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [rows, sortCol, sortDir])

  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  if (columnOrder.length === 0 && rows.length === 0) {
    return (
      <div className="rounded-xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>
          Details
        </h4>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          No data to display.
        </p>
      </div>
    )
  }

  const cols = columnOrder.length ? columnOrder : (rows[0] ? Object.keys(rows[0]) : [])

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <h4 className="text-sm font-semibold px-4 py-2 border-b" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
        Details
      </h4>
      <div className="overflow-auto max-h-[400px]">
        <table className="min-w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--card-2)' }}>
              {cols.map((col) => (
                <th
                  key={col}
                  className="text-left py-2 px-3 font-medium whitespace-nowrap cursor-pointer hover:opacity-80"
                  style={{ color: 'var(--text)' }}
                  onClick={() => handleSort(col)}
                >
                  {col}
                  {sortCol === col && (
                    <span className="ml-1" style={{ color: 'var(--muted)' }}>
                      {sortDir === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.slice(0, 100).map((row, i) => (
              <tr
                key={i}
                className="border-t"
                style={{ borderColor: 'var(--border)' }}
              >
                {cols.map((col) => (
                  <td key={col} className="py-1.5 px-3" style={{ color: 'var(--text)' }}>
                    {row[col] != null ? String(row[col]) : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sortedRows.length > 100 && (
        <div className="text-xs px-4 py-2 border-t" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
          Showing first 100 of {sortedRows.length} rows.
        </div>
      )}
    </div>
  )
}
