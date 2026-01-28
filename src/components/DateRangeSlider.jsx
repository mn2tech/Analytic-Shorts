import { useState, useEffect, useMemo } from 'react'

/**
 * DateRangeSlider - A sliding date range filter component for the top of the dashboard
 */
function DateRangeSlider({ 
  data, 
  selectedDate,
  onFilterChange 
}) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [startPercent, setStartPercent] = useState(0)
  const [endPercent, setEndPercent] = useState(100)
  const [isDragging, setIsDragging] = useState(null) // 'start' | 'end' | null

  // Get date range from data
  const dateRange = useMemo(() => {
    if (!selectedDate || !data || data.length === 0) {
      return { min: '', max: '', minTimestamp: 0, maxTimestamp: 0 }
    }
    
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

  // Initialize dates to full range
  useEffect(() => {
    if (dateRange.min && dateRange.max && !startDate && !endDate) {
      setStartDate(dateRange.min)
      setEndDate(dateRange.max)
      setStartPercent(0)
      setEndPercent(100)
    }
  }, [dateRange, startDate, endDate])

  // Convert percentage to date (moved before animation effect)
  const percentToDate = useMemo(() => {
    return (percent) => {
      if (!dateRange.minTimestamp || !dateRange.maxTimestamp) return ''
      const range = dateRange.maxTimestamp - dateRange.minTimestamp
      const timestamp = dateRange.minTimestamp + (range * percent / 100)
      return new Date(timestamp).toISOString().split('T')[0]
    }
  }, [dateRange])


  // Convert date to percentage
  const dateToPercent = (date) => {
    if (!date || !dateRange.minTimestamp || !dateRange.maxTimestamp) return 0
    const dateTimestamp = new Date(date).getTime()
    const range = dateRange.maxTimestamp - dateRange.minTimestamp
    if (range === 0) return 0
    return ((dateTimestamp - dateRange.minTimestamp) / range) * 100
  }

  // Update percentages when dates change
  useEffect(() => {
    if (startDate) {
      const percent = dateToPercent(startDate)
      setStartPercent(Math.max(0, Math.min(100, percent)))
    }
    if (endDate) {
      const percent = dateToPercent(endDate)
      setEndPercent(Math.max(0, Math.min(100, percent)))
    }
  }, [startDate, endDate, dateRange])

  // Handle mouse move for dragging
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e) => {
      const slider = document.getElementById('date-range-slider')
      if (!slider) return

      const rect = slider.getBoundingClientRect()
      const percent = ((e.clientX - rect.left) / rect.width) * 100
      const clampedPercent = Math.max(0, Math.min(100, percent))

      if (isDragging === 'start') {
        const newPercent = Math.min(clampedPercent, endPercent - 1)
        setStartPercent(newPercent)
        const newDate = percentToDate(newPercent)
        setStartDate(newDate)
      } else if (isDragging === 'end') {
        const newPercent = Math.max(clampedPercent, startPercent + 1)
        setEndPercent(newPercent)
        const newDate = percentToDate(newPercent)
        setEndDate(newDate)
      }
    }

    const handleMouseUp = () => {
      setIsDragging(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, startPercent, endPercent, dateRange])

  // Apply filter when dates change
  useEffect(() => {
    if (!onFilterChange || !data || !selectedDate) return

    let filtered = data
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999) // Include full end date
      
      // Use a more efficient filtering approach for large datasets
      filtered = data.filter((row) => {
        const dateValue = row[selectedDate]
        if (!dateValue) return false
        
        // Handle different date formats - try parsing the date
        let rowDate = new Date(dateValue)
        
        // If parsing fails, try adding time component for date-only strings
        if (isNaN(rowDate.getTime())) {
          // Try parsing as date string with time
          if (typeof dateValue === 'string' && !dateValue.includes('T')) {
            rowDate = new Date(dateValue + 'T00:00:00')
          }
          if (isNaN(rowDate.getTime())) return false
        }
        
        // Compare dates (normalize to start of day for accurate comparison)
        const rowTime = new Date(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate()).getTime()
        const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()
        const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime()
        
        return rowTime >= startTime && rowTime <= endTime
      })
    }

    // Always call onFilterChange, even if no dates are set (to reset filter)
    onFilterChange({
      type: 'dateRange',
      column: selectedDate,
      start: startDate,
      end: endDate,
      filteredData: filtered
    })
  }, [startDate, endDate, selectedDate, data, onFilterChange])

  const formatDate = (date) => {
    if (!date) return ''
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  if (!selectedDate || !dateRange.min || !dateRange.max) {
    return null
  }

  const filteredCount = startDate && endDate
    ? data?.filter((row) => {
        const rowDate = new Date(row[selectedDate])
        const start = new Date(startDate)
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        return !isNaN(rowDate.getTime()) && rowDate >= start && rowDate <= end
      }).length || 0
    : data?.length || 0

  const resetRange = () => {
    setStartDate(dateRange.min)
    setEndDate(dateRange.max)
    setStartPercent(0)
    setEndPercent(100)
  }

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">
              Date Range: <span className="text-gray-900">{selectedDate}</span>
            </label>
            <div className="text-sm text-gray-600">
              {formatDate(startDate)} - {formatDate(endDate)}
            </div>
            <div className="text-xs text-gray-500">
              ({filteredCount.toLocaleString()} of {data?.length.toLocaleString()} records)
            </div>
          </div>
          <button
            onClick={resetRange}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
          >
            Reset
          </button>
        </div>
        
        <div className="relative">
          {/* Slider Track */}
          <div
            id="date-range-slider"
            className="relative h-2 bg-gray-200 rounded-full cursor-pointer"
            style={{ width: '100%' }}
          >
            {/* Selected Range */}
            <div
              className="absolute h-2 bg-blue-500 rounded-full"
              style={{
                left: `${startPercent}%`,
                width: `${endPercent - startPercent}%`
              }}
            />
            
            {/* Start Handle - always show */}
            <div
              className="absolute w-4 h-4 bg-blue-600 rounded-full shadow-md cursor-grab active:cursor-grabbing transform -translate-x-1/2 -translate-y-1 top-1/2 hover:scale-110 transition-transform"
              style={{ 
                left: `${Math.max(0, Math.min(100, startPercent))}%`,
                zIndex: endPercent - startPercent < 1 ? 30 : 20
              }}
              onMouseDown={(e) => {
                e.preventDefault()
                setIsDragging('start')
              }}
              title={`Start: ${formatDate(startDate)}`}
            />
            
            {/* End Handle - always show, use different color if very close to start */}
            <div
              className={`absolute w-4 h-4 rounded-full shadow-md cursor-grab active:cursor-grabbing transform -translate-x-1/2 -translate-y-1 top-1/2 hover:scale-110 transition-transform ${
                endPercent - startPercent < 1 ? 'bg-green-600' : 'bg-blue-600'
              }`}
              style={{ 
                left: `${Math.max(startPercent + 0.3, Math.min(100, endPercent))}%`,
                zIndex: endPercent - startPercent < 1 ? 31 : 21
              }}
              onMouseDown={(e) => {
                e.preventDefault()
                setIsDragging('end')
              }}
              title={`End: ${formatDate(endDate)}`}
            />
          </div>
          
          {/* Date Labels */}
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>{formatDate(dateRange.min)}</span>
            <span>{formatDate(dateRange.max)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DateRangeSlider
