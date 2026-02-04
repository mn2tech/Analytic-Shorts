import { useState, useEffect, useMemo, useRef } from 'react'

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#14b8a6']

/**
 * CategoryDropdownFilterWidget - Modern multi-select filter with search and chips
 */
function CategoryDropdownFilterWidget({ 
  data, 
  selectedCategorical,
  onFilterChange 
}) {
  const [selectedCategories, setSelectedCategories] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef(null)

  // Get unique categories with counts
  const categoryData = useMemo(() => {
    if (!selectedCategorical || !data || data.length === 0) return []
    
    const categoryMap = new Map()
    for (let i = 0; i < data.length; i++) {
      const value = data[i][selectedCategorical]
      if (value) {
        const count = categoryMap.get(value) || 0
        categoryMap.set(value, count + 1)
      }
    }
    
    return Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count) // Sort by count
  }, [selectedCategorical, data])

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categoryData
    const query = searchQuery.toLowerCase()
    return categoryData.filter(cat => cat.name.toLowerCase().includes(query))
  }, [categoryData, searchQuery])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Apply filter when selection changes
  useEffect(() => {
    if (!onFilterChange || !data) return

    let filtered = data
    if (selectedCategories.length > 0 && selectedCategorical) {
      filtered = data.filter((row) => selectedCategories.includes(row[selectedCategorical]))
    }

    // Notify parent of filter change
    onFilterChange({
      type: 'category',
      column: selectedCategorical,
      value: selectedCategories,
      filteredData: filtered
    })
  }, [selectedCategories, selectedCategorical, data, onFilterChange])

  const toggleCategory = (categoryName) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryName)) {
        return prev.filter(c => c !== categoryName)
      } else {
        return [...prev, categoryName]
      }
    })
  }

  const clearAll = () => {
    setSelectedCategories([])
    setSearchQuery('')
  }

  if (!selectedCategorical) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        Configure widget to select a category column
      </div>
    )
  }

  const totalItems = data?.length || 0
  const filteredCount = selectedCategories.length > 0 
    ? data?.filter(row => selectedCategories.includes(row[selectedCategorical])).length || 0
    : totalItems

  return (
    <div className="h-full flex flex-col p-4 bg-gradient-to-br from-blue-50/30 to-purple-50/30">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {selectedCategorical}
          </h3>
          {selectedCategories.length > 0 && (
            <button
              onClick={clearAll}
              className="text-xs text-red-600 hover:text-red-700 font-medium"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span className="font-medium">{filteredCount.toLocaleString()}</span>
          <span>of</span>
          <span>{totalItems.toLocaleString()}</span>
          <span>items</span>
        </div>
      </div>

      {/* Selected chips */}
      {selectedCategories.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {selectedCategories.map((cat, index) => {
            const categoryInfo = categoryData.find(c => c.name === cat)
            const color = COLORS[index % COLORS.length]
            return (
              <span
                key={cat}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white shadow-sm"
                style={{ backgroundColor: color }}
              >
                {cat}
                <button
                  onClick={() => toggleCategory(cat)}
                  className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )
          })}
        </div>
      )}

      {/* Dropdown */}
      <div className="relative flex-1 min-h-0" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl shadow-sm hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all flex items-center justify-between"
        >
          <span className="text-sm text-gray-700">
            {selectedCategories.length === 0 
              ? `Select ${selectedCategorical}...` 
              : `${selectedCategories.length} selected`}
          </span>
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-64 overflow-hidden flex flex-col">
            {/* Search */}
            <div className="p-3 border-b border-gray-200">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  autoFocus
                />
              </div>
            </div>

            {/* Category list */}
            <div className="overflow-y-auto flex-1">
              {filteredCategories.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No categories found
                </div>
              ) : (
                <div className="p-2">
                  {filteredCategories.map((category, index) => {
                    const isSelected = selectedCategories.includes(category.name)
                    const color = COLORS[index % COLORS.length]
                    const percentage = ((category.count / totalItems) * 100).toFixed(1)
                    
                    return (
                      <button
                        key={category.name}
                        onClick={() => toggleCategory(category.name)}
                        className={`w-full text-left p-3 rounded-lg transition-all mb-1 ${
                          isSelected 
                            ? 'bg-blue-50 border-2 border-blue-500' 
                            : 'hover:bg-gray-50 border-2 border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div 
                              className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                              }`}
                            >
                              {isSelected && (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-gray-900 truncate">
                                {category.name}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full rounded-full transition-all"
                                    style={{ 
                                      width: `${percentage}%`,
                                      backgroundColor: color
                                    }}
                                  />
                                </div>
                                <span className="text-xs text-gray-500 whitespace-nowrap">
                                  {category.count} ({percentage}%)
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CategoryDropdownFilterWidget


