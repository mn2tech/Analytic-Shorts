import { useState, useEffect, useMemo } from 'react'

/**
 * DateRangeFilterWidget - Modern date range picker with quick filters and visual timeline
 */
function DateRangeFilterWidget({ 
  data, 
  selectedDate,
  onFilterChange 
}) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Get date range from data
  const dateRange = useMemo(() => {
    if (!selectedDate || !data || data.length === 0) return { min: '', max: '', minTimestamp: 0, maxTimestamp: 0 }
    
    let min = Infinity
    let max = -Infinity
    
    for (let i = 0; i < data.length; i++) {
      const date = new Date(data[i][selectedDate])
      if (!isNaN(date.getTime())) {
        const timestamp = date.getTime()
        if (timestamp < min) min = timestamp
        if (timestamp > max) max = timestamp
      }
    }
    
    if (min === Infinity || max === -Infinity) {
      return { min: '', max: '', minTimestamp: 0, maxTimestamp: 0 }
    }
    
    return {
      min: new Date(min).toISOString().split('T')[0],
      max: new Date(max).toISOString().split('T')[0],
      minTimestamp: min,
      maxTimestamp: max
    }
  }, [selectedDate, data])

  // Quick filter presets
  const quickFilters = useMemo(() => {
    if (!dateRange.min || !dateRange.max) return []
    
    const today = new Date()
    const maxDate = new Date(dateRange.max)
    const minDate = new Date(dateRange.min)
    const daysDiff = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24))
    
    const filters = []
    
    // Last 7 days
    if (daysDiff >= 7) {
      const last7Days = new Date(today)
      last7Days.setDate(last7Days.getDate() - 7)
      filters.push({
        label: 'Last 7 days',
        start: last7Days.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0]
      })
    }
    
    // Last 30 days
    if (daysDiff >= 30) {
      const last30Days = new Date(today)
      last30Days.setDate(last30Days.getDate() - 30)
      filters.push({
        label: 'Last 30 days',
        start: last30Days.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0]
      })
    }
    
    // This month
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    filters.push({
      label: 'This month',
      start: thisMonthStart.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    })
    
    // Last month
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
    filters.push({
      label: 'Last month',
      start: lastMonthStart.toISOString().split('T')[0],
      end: lastMonthEnd.toISOString().split('T')[0]
    })
    
    // All time
    filters.push({
      label: 'All time',
      start: dateRange.min,
      end: dateRange.max
    })
    
    return filters
  }, [dateRange])

  // Apply filter when dates change
  useEffect(() => {
    if (!onFilterChange || !data) return

    let filtered = data
    if (startDate && selectedDate) {
      const start = new Date(startDate)
      const end = endDate ? new Date(endDate) : new Date()
      end.setHours(23, 59, 59, 999) // Include full end date
      
      filtered = data.filter((row) => {
        const rowDate = new Date(row[selectedDate])
        return !isNaN(rowDate.getTime()) && rowDate >= start && rowDate <= end
      })
    }

    // Notify parent of filter change
    onFilterChange({
      type: 'dateRange',
      column: selectedDate,
      start: startDate,
      end: endDate,
      filteredData: filtered
    })
  }, [startDate, endDate, selectedDate, data, onFilterChange])

  const applyQuickFilter = (filter) => {
    setStartDate(filter.start)
    setEndDate(filter.end)
  }

  const clearFilter = () => {
    setStartDate('')
    setEndDate('')
  }

  if (!selectedDate) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        Configure widget to select a date column
      </div>
    )
  }

  const filteredCount = startDate 
    ? data?.filter((row) => {
        const rowDate = new Date(row[selectedDate])
        const start = new Date(startDate)
        const end = endDate ? new Date(endDate) : new Date()
        end.setHours(23, 59, 59, 999)
        return !isNaN(rowDate.getTime()) && rowDate >= start && rowDate <= end
      }).length || 0
    : data?.length || 0

  // Calculate timeline position
  const getTimelinePosition = (date) => {
    if (!date || !dateRange.minTimestamp || !dateRange.maxTimestamp) return 0
    const dateTimestamp = new Date(date).getTime()
    const range = dateRange.maxTimestamp - dateRange.minTimestamp
    if (range === 0) return 0
    return ((dateTimestamp - dateRange.minTimestamp) / range) * 100
  }

  return (
    <div className="h-full flex flex-col p-4 bg-gradient-to-br from-purple-50/30 to-pink-50/30">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {selectedDate}
          </h3>
          {(startDate || endDate) && (
            <button
              onClick={clearFilter}
              className="text-xs text-red-600 hover:text-red-700 font-medium"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span className="font-medium">{filteredCount.toLocaleString()}</span>
          <span>items in range</span>
        </div>
      </div>

      {/* Visual Timeline */}
      {dateRange.min && dateRange.max && (
        <div className="mb-4 relative">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full" />
          </div>
          {startDate && (
            <div 
              className="absolute top-0 h-2 bg-blue-600 rounded-l-full"
              style={{ 
                left: `${getTimelinePosition(startDate)}%`,
                width: endDate 
                  ? `${getTimelinePosition(endDate) - getTimelinePosition(startDate)}%`
                  : `${100 - getTimelinePosition(startDate)}%`
              }}
            />
          )}
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{dateRange.min}</span>
            <span>{dateRange.max}</span>
          </div>
        </div>
      )}

      {/* Quick Filters */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-2">Quick Filters</label>
        <div className="flex flex-wrap gap-2">
          {quickFilters.map((filter) => (
            <button
              key={filter.label}
              onClick={() => applyQuickFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                startDate === filter.start && endDate === filter.end
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-purple-50 border border-gray-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date Inputs */}
      <div className="space-y-3 flex-1">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Start Date</label>
          <div className="relative">
            <input
              type="date"
              value={startDate}
              min={dateRange.min}
              max={dateRange.max}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl shadow-sm hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">End Date</label>
          <div className="relative">
            <input
              type="date"
              value={endDate}
              min={startDate || dateRange.min}
              max={dateRange.max}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl shadow-sm hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Selected Range Display */}
      {(startDate || endDate) && (
        <div className="mt-4 p-3 bg-white rounded-xl border border-purple-200">
          <div className="flex items-center gap-2 text-xs">
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="font-medium text-gray-900">
              {startDate || 'Start'} → {endDate || 'End'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default DateRangeFilterWidget


