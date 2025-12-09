import { useState, useEffect, useMemo, useCallback, useRef } from 'react'

function Filters({
  data,
  numericColumns,
  categoricalColumns,
  dateColumns,
  onFilterChange,
  selectedNumeric,
  selectedCategorical,
  selectedDate,
  onColumnChange,
}) {
  const [filters, setFilters] = useState({
    dateRange: { start: '', end: '' },
    category: '',
    numericRange: { min: 0, max: 100 },
  })
  
  // Debounce timer ref
  const debounceTimer = useRef(null)

  // Memoize unique categories to avoid recalculating on every render
  const uniqueCategories = useMemo(() => {
    if (!selectedCategorical || !data || data.length === 0) return []
    
    // For large datasets, use a Set for O(1) lookups
    const categorySet = new Set()
    const dataLength = data.length
    
    // Process in chunks to avoid blocking
    for (let i = 0; i < dataLength; i++) {
      const value = data[i][selectedCategorical]
      if (value) categorySet.add(value)
    }
    
    return Array.from(categorySet).sort()
  }, [selectedCategorical, data])

  // Memoize numeric range calculation - optimize for large datasets
  const currentNumericRange = useMemo(() => {
    if (!selectedNumeric || !data || data.length === 0) {
      return { min: 0, max: 100 }
    }
    
    // For large datasets, calculate min/max in a single pass
    let min = Infinity
    let max = -Infinity
    const dataLength = data.length
    
    for (let i = 0; i < dataLength; i++) {
      const value = parseFloat(data[i][selectedNumeric])
      if (!isNaN(value) && isFinite(value)) {
        if (value < min) min = value
        if (value > max) max = value
      }
    }
    
    if (min === Infinity || max === -Infinity) {
      return { min: 0, max: 100 }
    }
    
    return { min, max }
  }, [selectedNumeric, data])

  // Update filters when numeric range changes
  useEffect(() => {
    if (selectedNumeric && currentNumericRange.min !== 0 && currentNumericRange.max !== 100) {
      setFilters((prev) => ({
        ...prev,
        numericRange: {
          min: currentNumericRange.min,
          max: currentNumericRange.max,
        },
      }))
    }
  }, [selectedNumeric, currentNumericRange])

  // Optimized filtering function
  const getFilteredData = useCallback(() => {
    if (!data) return data

    // For large arrays, use slice instead of spread
    let filtered = data.length > 50000 ? data.slice() : [...data]

    // Apply filters in order (most restrictive first for better performance)
    
    // Category filter (usually most restrictive)
    if (filters.category && selectedCategorical) {
      const category = filters.category
      filtered = filtered.filter((row) => row[selectedCategorical] === category)
    }

    // Numeric range filter
    if (selectedNumeric) {
      const min = filters.numericRange.min
      const max = filters.numericRange.max
      filtered = filtered.filter((row) => {
        const value = parseFloat(row[selectedNumeric])
        return !isNaN(value) && value >= min && value <= max
      })
    }

    // Date filter (usually least restrictive)
    if (filters.dateRange.start && selectedDate) {
      const start = new Date(filters.dateRange.start)
      const end = filters.dateRange.end ? new Date(filters.dateRange.end) : new Date()
      filtered = filtered.filter((row) => {
        const rowDate = new Date(row[selectedDate])
        return rowDate >= start && rowDate <= end
      })
    }

    return filtered
  }, [data, filters, selectedNumeric, selectedCategorical, selectedDate])

  // Debounced filter application
  useEffect(() => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }
    
    // Debounce filter application for large datasets
    const delay = data && data.length > 10000 ? 300 : 0
    
    debounceTimer.current = setTimeout(() => {
      const filtered = getFilteredData()
      onFilterChange(filters, filtered)
    }, delay)
    
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [filters, selectedNumeric, selectedCategorical, selectedDate, getFilteredData, onFilterChange, data])

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters)
  }, [])

  return (
    <div className="space-y-6">

      {/* Column Selection */}
      <div className="space-y-4">
        {numericColumns && numericColumns.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Numeric Column
            </label>
            <select
              value={selectedNumeric || ''}
              onChange={(e) => onColumnChange('numeric', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select numeric column</option>
              {numericColumns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>
        )}

        {categoricalColumns && categoricalColumns.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category Column
            </label>
            <select
              value={selectedCategorical || ''}
              onChange={(e) => onColumnChange('categorical', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select category column</option>
              {categoricalColumns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>
        )}

        {dateColumns && dateColumns.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Column
            </label>
            <select
              value={selectedDate || ''}
              onChange={(e) => onColumnChange('date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select date column</option>
              {dateColumns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Date Range Filter */}
      {selectedDate && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Date Range</label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={filters.dateRange.start}
              onChange={(e) =>
                handleFilterChange({
                  ...filters,
                  dateRange: { ...filters.dateRange, start: e.target.value },
                })
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="date"
              value={filters.dateRange.end}
              onChange={(e) =>
                handleFilterChange({
                  ...filters,
                  dateRange: { ...filters.dateRange, end: e.target.value },
                })
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* Category Filter */}
      {selectedCategorical && uniqueCategories.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Category
          </label>
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange({ ...filters, category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            {uniqueCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Numeric Range Filter */}
      {selectedNumeric && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Range: {filters.numericRange.min.toFixed(2)} - {filters.numericRange.max.toFixed(2)}
          </label>
          <div className="space-y-2">
            <input
              type="range"
              min={currentNumericRange.min}
              max={currentNumericRange.max}
              value={filters.numericRange.max}
              onChange={(e) =>
                handleFilterChange({
                  ...filters,
                  numericRange: {
                    ...filters.numericRange,
                    max: parseFloat(e.target.value),
                  },
                })
              }
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Min: {currentNumericRange.min.toFixed(2)}</span>
              <span>Max: {currentNumericRange.max.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => {
          const resetFilters = {
            dateRange: { start: '', end: '' },
            category: '',
            numericRange: currentNumericRange,
          }
          setFilters(resetFilters)
          // Immediately apply reset (no debounce needed)
          onFilterChange(resetFilters, data)
        }}
        className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
      >
        Reset Filters
      </button>
    </div>
  )
}

export default Filters





