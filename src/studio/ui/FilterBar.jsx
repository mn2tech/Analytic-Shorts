import React from 'react'

/**
 * FilterBar - Renders filter controls for a page
 * @param {Object} props
 * @param {Array} props.filters - Filter definitions
 * @param {Object} props.values - Current filter values
 * @param {Object} props.options - Dropdown options (keyed by filter ID)
 * @param {Function} props.onChange - Callback when filter changes
 * @param {boolean} props.isReadOnly - Whether filters are read-only
 */
export default function FilterBar({ filters, values, options, onChange, isReadOnly = false }) {
  if (!filters || filters.length === 0) {
    return null
  }

  const handleFilterChange = (filterId, value) => {
    if (!isReadOnly && onChange) {
      onChange(filterId, value)
    }
  }

  return (
    <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Filters</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filters.map(filter => (
          <div key={filter.id}>
            {filter.type === 'time_range' ? (
              <>
                <label htmlFor={`${filter.id}-start`} className="block text-sm font-medium text-gray-700 mb-1">
                  {filter.label} (Start)
                  {filter.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <div className="flex gap-2">
                  <input
                    id={`${filter.id}-start`}
                    name={`${filter.id}-start`}
                    type="date"
                    value={values[filter.id]?.start || ''}
                    onChange={(e) => handleFilterChange(filter.id, {
                      ...values[filter.id],
                      start: e.target.value
                    })}
                    disabled={isReadOnly}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <label htmlFor={`${filter.id}-end`} className="block text-sm font-medium text-gray-700 mb-1">
                    {filter.label} (End)
                    {filter.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <input
                    id={`${filter.id}-end`}
                    name={`${filter.id}-end`}
                    type="date"
                    value={values[filter.id]?.end || ''}
                    onChange={(e) => handleFilterChange(filter.id, {
                      ...values[filter.id],
                      end: e.target.value
                    })}
                    disabled={isReadOnly}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
              </>
            ) : (
              <>
                <label htmlFor={filter.id} className="block text-sm font-medium text-gray-700 mb-1">
                  {filter.label}
                  {filter.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {filter.type === 'dropdown' ? (
                  <select
                    id={filter.id}
                    name={filter.id}
                    value={values[filter.id] || filter.default || 'All'}
                    onChange={(e) => handleFilterChange(filter.id, e.target.value === 'All' ? null : e.target.value)}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="All">All</option>
                    {(options[filter.id] || []).map(value => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                ) : filter.type === 'text' ? (
                  <input
                    id={filter.id}
                    name={filter.id}
                    type="text"
                    value={values[filter.id] || ''}
                    onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                    disabled={isReadOnly}
                    placeholder={filter.placeholder || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                ) : null}
              </>
            )}
          </div>
        ))}
      </div>
      {isReadOnly && (
        <p className="text-xs text-gray-500 mt-2">View-only mode: Filters are read-only</p>
      )}
    </div>
  )
}
