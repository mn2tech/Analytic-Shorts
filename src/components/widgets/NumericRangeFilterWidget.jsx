import { useState, useEffect, useMemo, useRef } from 'react'
import { parseNumericValue } from '../../utils/numberUtils'

/**
 * NumericRangeFilterWidget - Modern dual-range slider with visual distribution
 */
function NumericRangeFilterWidget({ 
  data, 
  selectedNumeric,
  onFilterChange 
}) {
  const [minValue, setMinValue] = useState(0)
  const [maxValue, setMaxValue] = useState(100)
  const [isDragging, setIsDragging] = useState(null) // 'min' or 'max'
  const sliderRef = useRef(null)

  // Calculate numeric range from data
  const numericRange = useMemo(() => {
    if (!selectedNumeric || !data || data.length === 0) {
      return { min: 0, max: 100 }
    }
    
    let min = Infinity
    let max = -Infinity
    
    for (let i = 0; i < data.length; i++) {
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

  // Calculate value distribution for histogram
  const valueDistribution = useMemo(() => {
    if (!selectedNumeric || !data || data.length === 0) return []
    
    const buckets = 20
    const bucketSize = (numericRange.max - numericRange.min) / buckets
    const distribution = new Array(buckets).fill(0)
    
    for (let i = 0; i < data.length; i++) {
      const value = parseNumericValue(data[i][selectedNumeric])
      if (!isNaN(value) && isFinite(value)) {
        const bucketIndex = Math.min(
          Math.floor((value - numericRange.min) / bucketSize),
          buckets - 1
        )
        distribution[bucketIndex]++
      }
    }
    
    const maxCount = Math.max(...distribution)
    return distribution.map(count => ({
      count,
      height: maxCount > 0 ? (count / maxCount) * 100 : 0
    }))
  }, [selectedNumeric, data, numericRange])

  // Initialize min/max values when range changes
  useEffect(() => {
    setMinValue(numericRange.min)
    setMaxValue(numericRange.max)
  }, [numericRange])

  // Apply filter when values change
  useEffect(() => {
    if (!onFilterChange || !data) return

    let filtered = data
    if (selectedNumeric) {
      filtered = data.filter((row) => {
        const value = parseNumericValue(row[selectedNumeric])
        return !isNaN(value) && value >= minValue && value <= maxValue
      })
    }

    // Notify parent of filter change
    onFilterChange({
      type: 'numericRange',
      column: selectedNumeric,
      min: minValue,
      max: maxValue,
      filteredData: filtered
    })
  }, [minValue, maxValue, selectedNumeric, data, onFilterChange])

  const formatValue = (value) => {
    if (value >= 1000000) return (value / 1000000).toFixed(2) + 'M'
    if (value >= 1000) return (value / 1000).toFixed(2) + 'K'
    return value.toFixed(2)
  }

  const getPercentage = (value) => {
    const range = numericRange.max - numericRange.min
    if (range === 0) return 0
    return ((value - numericRange.min) / range) * 100
  }

  const handleMinChange = (e) => {
    const newMin = parseFloat(e.target.value)
    setMinValue(Math.min(newMin, maxValue))
  }

  const handleMaxChange = (e) => {
    const newMax = parseFloat(e.target.value)
    setMaxValue(Math.max(newMax, minValue))
  }

  const resetToFullRange = () => {
    setMinValue(numericRange.min)
    setMaxValue(numericRange.max)
  }

  if (!selectedNumeric) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        Configure widget to select a numeric column
      </div>
    )
  }

  const filteredCount = data?.filter((row) => {
    const value = parseNumericValue(row[selectedNumeric])
    return !isNaN(value) && value >= minValue && value <= maxValue
  }).length || 0

  const minPercent = getPercentage(minValue)
  const maxPercent = getPercentage(maxValue)

  return (
    <div className="h-full flex flex-col p-4 bg-gradient-to-br from-green-50/30 to-emerald-50/30">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            {selectedNumeric}
          </h3>
          {(minValue !== numericRange.min || maxValue !== numericRange.max) && (
            <button
              onClick={resetToFullRange}
              className="text-xs text-red-600 hover:text-red-700 font-medium"
            >
              Reset
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span className="font-medium">{filteredCount.toLocaleString()}</span>
          <span>items in range</span>
        </div>
      </div>

      {/* Value Distribution Histogram */}
      <div className="mb-4 relative h-16 bg-white rounded-lg p-2 border border-gray-200">
        <div className="absolute inset-0 flex items-end justify-between gap-0.5 p-2">
          {valueDistribution.map((bucket, index) => {
            const bucketMin = numericRange.min + (index / valueDistribution.length) * (numericRange.max - numericRange.min)
            const bucketMax = numericRange.min + ((index + 1) / valueDistribution.length) * (numericRange.max - numericRange.min)
            const isInRange = bucketMin <= maxValue && bucketMax >= minValue
            
            return (
              <div
                key={index}
                className={`flex-1 rounded-t transition-all ${
                  isInRange ? 'bg-green-500' : 'bg-gray-300'
                }`}
                style={{ height: `${bucket.height}%` }}
                title={`${bucket.count} items`}
              />
            )
          })}
        </div>
        {/* Range overlay */}
        <div 
          className="absolute top-0 bottom-0 bg-green-500/20 border-l-2 border-r-2 border-green-600"
          style={{
            left: `${minPercent}%`,
            width: `${maxPercent - minPercent}%`
          }}
        />
      </div>

      {/* Dual Range Slider */}
      <div className="mb-4 relative" ref={sliderRef}>
        <div className="relative h-2 bg-gray-200 rounded-full">
          {/* Active range track */}
          <div 
            className="absolute h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
            style={{
              left: `${minPercent}%`,
              width: `${maxPercent - minPercent}%`
            }}
          />
        </div>
        
        {/* Min slider */}
        <div className="absolute top-0 left-0 right-0 h-2">
          <input
            type="range"
            min={numericRange.min}
            max={numericRange.max}
            value={minValue}
            onChange={handleMinChange}
            onMouseDown={() => setIsDragging('min')}
            onMouseUp={() => setIsDragging(null)}
            className="absolute w-full h-2 bg-transparent appearance-none cursor-pointer z-10"
            style={{
              background: 'transparent'
            }}
          />
        </div>
        
        {/* Max slider */}
        <div className="absolute top-0 left-0 right-0 h-2">
          <input
            type="range"
            min={numericRange.min}
            max={numericRange.max}
            value={maxValue}
            onChange={handleMaxChange}
            onMouseDown={() => setIsDragging('max')}
            onMouseUp={() => setIsDragging(null)}
            className="absolute w-full h-2 bg-transparent appearance-none cursor-pointer z-10"
            style={{
              background: 'transparent'
            }}
          />
        </div>
        
        {/* Custom handles */}
        <div
          className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-green-600 rounded-full shadow-lg cursor-grab active:cursor-grabbing border-2 border-white z-20 pointer-events-none"
          style={{ left: `${minPercent}%` }}
        />
        <div
          className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-emerald-600 rounded-full shadow-lg cursor-grab active:cursor-grabbing border-2 border-white z-20 pointer-events-none"
          style={{ left: `${maxPercent}%` }}
        />
      </div>

      {/* Value Inputs */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Minimum</label>
          <div className="relative">
            <input
              type="number"
              value={minValue.toFixed(2)}
              min={numericRange.min}
              max={maxValue}
              step={(numericRange.max - numericRange.min) / 1000}
              onChange={(e) => {
                const newMin = Math.min(parseFloat(e.target.value) || numericRange.min, maxValue)
                setMinValue(newMin)
              }}
              className="w-full px-4 py-2.5 bg-white border-2 border-gray-200 rounded-xl shadow-sm hover:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Maximum</label>
          <div className="relative">
            <input
              type="number"
              value={maxValue.toFixed(2)}
              min={minValue}
              max={numericRange.max}
              step={(numericRange.max - numericRange.min) / 1000}
              onChange={(e) => {
                const newMax = Math.max(parseFloat(e.target.value) || numericRange.max, minValue)
                setMaxValue(newMax)
              }}
              className="w-full px-4 py-2.5 bg-white border-2 border-gray-200 rounded-xl shadow-sm hover:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-sm"
            />
          </div>
        </div>
      </div>

      {/* Range Summary */}
      <div className="mt-auto p-3 bg-white rounded-xl border border-green-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            <span className="text-xs font-medium text-gray-900">
              {formatValue(minValue)} - {formatValue(maxValue)}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {((maxValue - minValue) / (numericRange.max - numericRange.min) * 100).toFixed(1)}% of range
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-600">
          Full range: {formatValue(numericRange.min)} - {formatValue(numericRange.max)}
        </div>
      </div>
    </div>
  )
}

export default NumericRangeFilterWidget


