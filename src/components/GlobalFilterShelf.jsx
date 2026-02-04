import { useState, useMemo } from 'react'

/**
 * GlobalFilterShelf - Tableau-style filter shelf at the top of the dashboard
 * Shows active filters and allows quick filtering across all charts
 */
function GlobalFilterShelf({ 
  data, 
  categoricalColumns = [], 
  numericColumns = [], 
  dateColumns = [],
  onFilterChange 
}) {
  const [activeFilters, setActiveFilters] = useState({})
  const [expandedFilter, setExpandedFilter] = useState(null)

  // Get unique values for categorical columns
  const categoricalOptions = useMemo(() => {
    const options = {}
    categoricalColumns.forEach(col => {
      if (data && data.length > 0) {
        const uniqueValues = [...new Set(data.map(row => row[col]).filter(v => v != null))]
        options[col] = uniqueValues.sort()
      }
    })
    return options
  }, [data, categoricalColumns])

  // Get min/max for numeric columns
  const numericRanges = useMemo(() => {
    const ranges = {}
    numericColumns.forEach(col => {
      if (data && data.length > 0) {
        const values = data.map(row => row[col]).filter(v => v != null && !isNaN(v))
        if (values.length > 0) {
          ranges[col] = {
            min: Math.min(...values),
            max: Math.max(...values)
          }
        }
      }
    })
    return ranges
  }, [data, numericColumns])

  const handleCategoricalFilter = (column, values) => {
    const newFilters = {
      ...activeFilters,
      [column]: { type: 'categorical', values }
    }
    setActiveFilters(newFilters)
    onFilterChange?.(newFilters)
  }

  const handleNumericFilter = (column, range) => {
    const newFilters = {
      ...activeFilters,
      [column]: { type: 'numeric', range }
    }
    setActiveFilters(newFilters)
    onFilterChange?.(newFilters)
  }

  const handleDateFilter = (column, range) => {
    const newFilters = {
      ...activeFilters,
      [column]: { type: 'date', range }
    }
    setActiveFilters(newFilters)
    onFilterChange?.(newFilters)
  }

  const clearFilter = (column) => {
    const newFilters = { ...activeFilters }
    delete newFilters[column]
    setActiveFilters(newFilters)
    onFilterChange?.(newFilters)
  }

  const clearAllFilters = () => {
    setActiveFilters({})
    onFilterChange?.({})
  }

  const hasActiveFilters = Object.keys(activeFilters).length > 0

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm mb-4">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <h3 className="text-sm font-semibold text-gray-700">Filters</h3>
            {hasActiveFilters && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                {Object.keys(activeFilters).length} active
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear all
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2 mb-3">
          {categoricalColumns.map(col => (
            <div key={col} className="relative">
              <button
                onClick={() => setExpandedFilter(expandedFilter === col ? null : col)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeFilters[col]
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                }`}
              >
                <span>{col}</span>
                {activeFilters[col] && (
                  <span className="px-1.5 py-0.5 bg-blue-200 text-blue-800 text-xs rounded">
                    {activeFilters[col].values?.length || 1}
                  </span>
                )}
                {activeFilters[col] && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      clearFilter(col)
                    }}
                    className="ml-1 hover:bg-blue-200 rounded p-0.5"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </button>

              {/* Dropdown for categorical filter */}
              {expandedFilter === col && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px] max-h-64 overflow-y-auto">
                  <div className="p-2">
                    {categoricalOptions[col]?.map(value => (
                      <label key={value} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={activeFilters[col]?.values?.includes(value) || false}
                          onChange={(e) => {
                            const currentValues = activeFilters[col]?.values || []
                            const newValues = e.target.checked
                              ? [...currentValues, value]
                              : currentValues.filter(v => v !== value)
                            handleCategoricalFilter(col, newValues)
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{value}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {numericColumns.map(col => (
            <div key={col} className="relative">
              <button
                onClick={() => setExpandedFilter(expandedFilter === col ? null : col)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeFilters[col]
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                }`}
              >
                <span>{col}</span>
                {activeFilters[col] && (
                  <span className="text-xs">
                    {activeFilters[col].range?.min} - {activeFilters[col].range?.max}
                  </span>
                )}
                {activeFilters[col] && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      clearFilter(col)
                    }}
                    className="ml-1 hover:bg-blue-200 rounded p-0.5"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </button>

              {/* Range slider for numeric filter */}
              {expandedFilter === col && numericRanges[col] && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 min-w-[300px]">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Min: {numericRanges[col].min}</span>
                      <span>Max: {numericRanges[col].max}</span>
                    </div>
                    <input
                      type="range"
                      min={numericRanges[col].min}
                      max={numericRanges[col].max}
                      value={activeFilters[col]?.range?.min || numericRanges[col].min}
                      onChange={(e) => {
                        const currentRange = activeFilters[col]?.range || numericRanges[col]
                        handleNumericFilter(col, {
                          min: parseFloat(e.target.value),
                          max: currentRange.max
                        })
                      }}
                      className="w-full"
                    />
                    <input
                      type="range"
                      min={numericRanges[col].min}
                      max={numericRanges[col].max}
                      value={activeFilters[col]?.range?.max || numericRanges[col].max}
                      onChange={(e) => {
                        const currentRange = activeFilters[col]?.range || numericRanges[col]
                        handleNumericFilter(col, {
                          min: currentRange.min,
                          max: parseFloat(e.target.value)
                        })
                      }}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default GlobalFilterShelf

























