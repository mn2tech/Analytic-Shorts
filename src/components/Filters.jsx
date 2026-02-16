import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { parseNumericValue } from '../utils/numberUtils'

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
    opportunity: {
      setAside: '',
      department: '',
      primeContractor: '',
    },
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

  const detectOpportunityFields = useCallback((rows) => {
    if (!Array.isArray(rows) || rows.length === 0) return null
    const sample = rows[0] || {}
    const keys = Object.keys(sample)
    const findKey = (candidates) => {
      const lowerMap = new Map(keys.map((k) => [k.toLowerCase(), k]))
      for (const c of candidates) {
        const hit = lowerMap.get(String(c).toLowerCase())
        if (hit) return hit
      }
      return null
    }
    return {
      setAside: findKey(['setAside', 'set_aside', 'Set Aside']),
      department: findKey(['organization', 'department', 'Awarding Agency', 'awarding_agency']),
      primeContractor: findKey(['Prime contractor', 'Prime Contractor', 'prime_contractor', 'Recipient Name', 'recipient_name']),
    }
  }, [])

  const opportunityFields = useMemo(() => detectOpportunityFields(data), [data, detectOpportunityFields])

  const getUniqueValuesForField = useCallback((field) => {
    if (!field || !Array.isArray(data) || data.length === 0) return []
    const set = new Set()
    // Bound value extraction for very large datasets.
    const maxScan = Math.min(data.length, 50000)
    for (let i = 0; i < maxScan; i++) {
      const v = data[i]?.[field]
      if (v === null || v === undefined || String(v).trim() === '') continue
      set.add(String(v).trim())
      if (set.size >= 300) break
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b)).slice(0, 200)
  }, [data])

  const opportunityOptions = useMemo(() => {
    return {
      setAside: getUniqueValuesForField(opportunityFields?.setAside),
      department: getUniqueValuesForField(opportunityFields?.department),
      primeContractor: getUniqueValuesForField(opportunityFields?.primeContractor),
    }
  }, [opportunityFields, getUniqueValuesForField])

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
      const value = parseNumericValue(data[i][selectedNumeric])
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

    // Opportunity-specific filters (if fields exist on dataset)
    if (opportunityFields?.setAside && filters.opportunity?.setAside) {
      const value = filters.opportunity.setAside
      filtered = filtered.filter((row) => String(row?.[opportunityFields.setAside] || '') === value)
    }
    if (opportunityFields?.department && filters.opportunity?.department) {
      const value = filters.opportunity.department
      filtered = filtered.filter((row) => String(row?.[opportunityFields.department] || '') === value)
    }
    if (opportunityFields?.primeContractor && filters.opportunity?.primeContractor) {
      const value = filters.opportunity.primeContractor
      filtered = filtered.filter((row) => String(row?.[opportunityFields.primeContractor] || '') === value)
    }
    // Numeric range filter
    if (selectedNumeric) {
      const min = filters.numericRange.min
      const max = filters.numericRange.max
      filtered = filtered.filter((row) => {
        const value = parseNumericValue(row[selectedNumeric])
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
  }, [data, filters, selectedNumeric, selectedCategorical, selectedDate, opportunityFields])

  // Debounced filter application with more aggressive debouncing for large datasets
  useEffect(() => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }
    
    // More aggressive debouncing for large datasets to ensure smooth UX
    const delay = data && data.length > 5000 ? 500 : data && data.length > 1000 ? 300 : 100
    
    debounceTimer.current = setTimeout(() => {
      // Use requestIdleCallback if available for non-blocking processing
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => {
          const filtered = getFilteredData()
          onFilterChange(filters, filtered)
        }, { timeout: 1000 })
      } else {
        // Fallback to setTimeout for browsers without requestIdleCallback
        setTimeout(() => {
          const filtered = getFilteredData()
          onFilterChange(filters, filtered)
        }, 0)
      }
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

      {/* Opportunity Filters */}
      {(opportunityFields?.setAside || opportunityFields?.department || opportunityFields?.primeContractor) && (
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-700">Opportunity Filters</label>

          {opportunityFields?.setAside && (
            <div>
              <div className="flex items-center gap-1 mb-1">
                <label className="block text-xs font-medium text-gray-600">
                  Set Aside
                </label>
                <span
                  className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-100 text-gray-600 text-[10px] cursor-help"
                  title="Unknown means SAM.gov did not provide a set-aside value. It may be full and open competition or simply unspecified in the notice."
                  aria-label="Set Aside help"
                >
                  i
                </span>
              </div>
              <select
                value={filters.opportunity?.setAside || ''}
                onChange={(e) =>
                  handleFilterChange({
                    ...filters,
                    opportunity: { ...filters.opportunity, setAside: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Set Asides</option>
                {opportunityOptions.setAside.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-gray-500">
                Unknown = no set-aside value provided by SAM.gov (may be full and open or unspecified).
              </p>
            </div>
          )}

          {opportunityFields?.department && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Department / Organization
              </label>
              <select
                value={filters.opportunity?.department || ''}
                onChange={(e) =>
                  handleFilterChange({
                    ...filters,
                    opportunity: { ...filters.opportunity, department: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Departments</option>
                {opportunityOptions.department.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          )}

          {opportunityFields?.primeContractor && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Prime Contractor
              </label>
              <select
                value={filters.opportunity?.primeContractor || ''}
                onChange={(e) =>
                  handleFilterChange({
                    ...filters,
                    opportunity: { ...filters.opportunity, primeContractor: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Prime Contractors</option>
                {opportunityOptions.primeContractor.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          )}
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
            opportunity: {
              setAside: '',
              department: '',
              primeContractor: '',
            },
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





