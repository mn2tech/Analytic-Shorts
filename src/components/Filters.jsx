import { useState, useEffect } from 'react'

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

  useEffect(() => {
    if (selectedNumeric && data && data.length > 0) {
      const values = data
        .map((row) => parseFloat(row[selectedNumeric]))
        .filter((val) => !isNaN(val))
      if (values.length > 0) {
        setFilters((prev) => ({
          ...prev,
          numericRange: {
            min: Math.min(...values),
            max: Math.max(...values),
          },
        }))
      }
    }
  }, [selectedNumeric, data])

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const getFilteredData = () => {
    if (!data) return data

    let filtered = [...data]

    // Date filter
    if (filters.dateRange.start && selectedDate) {
      filtered = filtered.filter((row) => {
        const rowDate = new Date(row[selectedDate])
        const start = new Date(filters.dateRange.start)
        const end = filters.dateRange.end ? new Date(filters.dateRange.end) : new Date()
        return rowDate >= start && rowDate <= end
      })
    }

    // Category filter
    if (filters.category && selectedCategorical) {
      filtered = filtered.filter((row) => row[selectedCategorical] === filters.category)
    }

    // Numeric range filter
    if (selectedNumeric) {
      filtered = filtered.filter((row) => {
        const value = parseFloat(row[selectedNumeric])
        return !isNaN(value) && value >= filters.numericRange.min && value <= filters.numericRange.max
      })
    }

    return filtered
  }

  useEffect(() => {
    const filtered = getFilteredData()
    onFilterChange(filters, filtered)
  }, [filters, selectedNumeric, selectedCategorical, selectedDate])

  const uniqueCategories = selectedCategorical
    ? [...new Set(data?.map((row) => row[selectedCategorical]).filter(Boolean) || [])]
    : []

  const currentNumericRange = selectedNumeric && data
    ? (() => {
        const values = data
          .map((row) => parseFloat(row[selectedNumeric]))
          .filter((val) => !isNaN(val))
        return values.length > 0
          ? { min: Math.min(...values), max: Math.max(...values) }
          : { min: 0, max: 100 }
      })()
    : { min: 0, max: 100 }

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
          setFilters({
            dateRange: { start: '', end: '' },
            category: '',
            numericRange: currentNumericRange,
          })
          onFilterChange(
            {
              dateRange: { start: '', end: '' },
              category: '',
              numericRange: currentNumericRange,
            },
            data
          )
        }}
        className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
      >
        Reset Filters
      </button>
    </div>
  )
}

export default Filters





