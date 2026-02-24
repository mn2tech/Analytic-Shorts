import React, { useState, useRef, useEffect } from 'react'

function PillDropdown({ label, value, options, onChange, placeholder = 'All', disabled }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const display = value != null && value !== '' ? String(value) : placeholder
  const opts = Array.isArray(options) ? options : []

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-full hover:bg-gray-50 disabled:opacity-50 text-gray-700"
      >
        <span className="text-gray-500">{label}:</span>
        <span className="font-medium truncate max-w-[120px]">{display}</span>
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 py-1 rounded-lg shadow-lg z-[100] min-w-[160px] max-h-60 overflow-auto" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <button
            type="button"
            onClick={() => {
              onChange(null)
              setOpen(false)
            }}
            className="w-full text-left px-3 py-2 text-sm"
            style={{ color: 'var(--text)' }}
          >
            {placeholder}
          </button>
          {opts.map((opt) => {
            const v = typeof opt === 'object' ? opt.value : opt
            const lab = typeof opt === 'object' ? opt.label : opt
            return (
              <button
                key={v}
                type="button"
                onClick={() => {
                  onChange(v)
                  setOpen(false)
                }}
                className="w-full text-left px-3 py-2 text-sm"
                style={{ background: value === v ? 'var(--card-2)' : 'transparent', color: value === v ? 'var(--primary)' : 'var(--text)' }}
              >
                {lab}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function GlobalFilterBar({
  timeRangeColumn = null,
  timeRange = null,
  onTimeRangeChange,
  dimensionFilters = [],
  searchValue = '',
  onSearchChange,
  onClear,
  loading = false,
}) {
  return (
    <div className="rounded-xl border px-4 py-3 mb-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
        {timeRangeColumn && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs" style={{ color: 'var(--muted)' }}>{timeRangeColumn}</span>
            <input
              type="date"
              className="rounded-full px-3 py-1.5 text-sm w-36"
              style={{ border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }}
              value={timeRange?.start ? String(timeRange.start).slice(0, 10) : ''}
              onChange={(e) => onTimeRangeChange?.({ ...timeRange, column: timeRangeColumn, start: e.target.value || null, end: timeRange?.end || null })}
              disabled={loading}
            />
            <span style={{ color: 'var(--muted)' }}>→</span>
            <input
              type="date"
              className="rounded-full px-3 py-1.5 text-sm w-36"
              style={{ border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }}
              value={timeRange?.end ? String(timeRange.end).slice(0, 10) : ''}
              onChange={(e) => onTimeRangeChange?.({ ...timeRange, column: timeRangeColumn, start: timeRange?.start || null, end: e.target.value || null })}
              disabled={loading}
            />
          </div>
        )}
        {dimensionFilters.slice(0, 6).map((d) => (
          <PillDropdown
            key={d.id}
            label={d.label || d.id}
            value={d.value}
            options={d.options || []}
            placeholder="All"
            onChange={(v) => d.onChange(v)}
            disabled={loading}
          />
        ))}
        <div className="flex-1 min-w-[120px] max-w-[200px]">
          <input
            type="text"
            placeholder="Search…"
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            disabled={loading}
            className="w-full rounded-full px-3 py-1.5 text-sm"
            style={{ border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }}
          />
        </div>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            disabled={loading}
            className="px-3 py-1.5 text-sm rounded-full"
            style={{ color: 'var(--muted)' }}
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}
