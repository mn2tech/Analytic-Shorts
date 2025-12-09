import { useState, useMemo, useEffect } from 'react'

function DataMetadataEditor({ 
  data, 
  columns, 
  numericColumns, 
  categoricalColumns, 
  dateColumns,
  onMetadataUpdate 
}) {
  const [columnMetadata, setColumnMetadata] = useState(() => {
    // Initialize metadata state from current column types
    const metadata = {}
    if (columns && columns.length > 0) {
      columns.forEach(col => {
        metadata[col] = {
          type: numericColumns?.includes(col) ? 'numeric' : 
                dateColumns?.includes(col) ? 'date' : 
                categoricalColumns?.includes(col) ? 'categorical' : 'categorical',
          originalType: numericColumns?.includes(col) ? 'numeric' : 
                       dateColumns?.includes(col) ? 'date' : 
                       categoricalColumns?.includes(col) ? 'categorical' : 'categorical'
        }
      })
    }
    return metadata
  })

  // Update metadata when column types change from parent
  useEffect(() => {
    if (columns && columns.length > 0) {
      setColumnMetadata(prev => {
        const updated = { ...prev }
        columns.forEach(col => {
          if (!updated[col]) {
            updated[col] = {
              type: numericColumns?.includes(col) ? 'numeric' : 
                    dateColumns?.includes(col) ? 'date' : 
                    categoricalColumns?.includes(col) ? 'categorical' : 'categorical',
              originalType: numericColumns?.includes(col) ? 'numeric' : 
                           dateColumns?.includes(col) ? 'date' : 
                           categoricalColumns?.includes(col) ? 'categorical' : 'categorical'
            }
          } else {
            // Update originalType to match current state
            updated[col] = {
              ...updated[col],
              originalType: numericColumns?.includes(col) ? 'numeric' : 
                           dateColumns?.includes(col) ? 'date' : 
                           categoricalColumns?.includes(col) ? 'categorical' : 'categorical'
            }
          }
        })
        return updated
      })
    }
  }, [columns, numericColumns, categoricalColumns, dateColumns])

  const [selectedColumn, setSelectedColumn] = useState(columns[0] || '')
  const [showPreview, setShowPreview] = useState(true)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [currentPage, setCurrentPage] = useState(1)

  // Sample data for preview (first 100 rows)
  const previewData = useMemo(() => {
    if (!data || !selectedColumn) return []
    return data.slice(0, 100).map(row => ({
      value: row[selectedColumn],
      original: row[selectedColumn]
    }))
  }, [data, selectedColumn])

  // Get column statistics
  const columnStats = useMemo(() => {
    if (!data || !selectedColumn) return null
    
    const values = data.map(row => row[selectedColumn]).filter(val => val !== null && val !== undefined && val !== '')
    if (values.length === 0) return null

    const uniqueValues = new Set(values).size
    const sampleValues = values.slice(0, 10)
    
    // Try to detect if it's numeric
    const numericCount = values.filter(val => {
      const cleaned = String(val).replace(/[$,\s]/g, '')
      return !isNaN(parseFloat(cleaned)) && isFinite(parseFloat(cleaned))
    }).length
    
    // Try to detect if it's a date
    const dateCount = values.filter(val => {
      const str = String(val).trim()
      const isYear = /^\d{4}$/.test(str) && parseInt(str) >= 1900 && parseInt(str) <= 2100
      const isDate = str.match(/^\d{4}-\d{2}-\d{2}/) || str.match(/^\d{1,2}\/\d{1,2}\/\d{4}/)
      return isYear || isDate
    }).length

    return {
      total: values.length,
      unique: uniqueValues,
      sample: sampleValues,
      numericRatio: numericCount / values.length,
      dateRatio: dateCount / values.length,
      currentType: columnMetadata[selectedColumn]?.type || 'categorical'
    }
  }, [data, selectedColumn, columnMetadata])

  const handleTypeChange = (column, newType) => {
    setColumnMetadata(prev => ({
      ...prev,
      [column]: {
        ...prev[column],
        type: newType
      }
    }))
  }

  const handleApplyChanges = () => {
    try {
      // Recalculate column types based on metadata
      const newNumericColumns = []
      const newCategoricalColumns = []
      const newDateColumns = []

      if (!columns || columns.length === 0) {
        alert('Error: No columns available. Please refresh the page.')
        return
      }

      Object.entries(columnMetadata).forEach(([col, meta]) => {
        if (!meta || !meta.type) {
          // Default to categorical if type is missing
          newCategoricalColumns.push(col)
          return
        }
        
        if (meta.type === 'numeric') {
          newNumericColumns.push(col)
        } else if (meta.type === 'date') {
          newDateColumns.push(col)
        } else {
          newCategoricalColumns.push(col)
        }
      })

      // Ensure all columns are assigned to a type
      columns.forEach(col => {
        if (!newNumericColumns.includes(col) && 
            !newCategoricalColumns.includes(col) && 
            !newDateColumns.includes(col)) {
          // If column is missing, add it to categorical as default
          newCategoricalColumns.push(col)
        }
      })

      // Validate that we have at least some columns
      if (newNumericColumns.length === 0 && newCategoricalColumns.length === 0 && newDateColumns.length === 0) {
        alert('Error: No columns found. Please refresh the page.')
        return
      }

      // Call parent callback to update metadata
      if (onMetadataUpdate) {
        // Use setTimeout to ensure state updates are batched and don't cause render issues
        setTimeout(() => {
          onMetadataUpdate({
            numericColumns: newNumericColumns,
            categoricalColumns: newCategoricalColumns,
            dateColumns: newDateColumns
          })
        }, 0)
      }
    } catch (error) {
      console.error('Error applying metadata changes:', error)
      setTimeout(() => {
        alert('Error applying changes. Please try again.')
      }, 100)
    }
  }

  const handleReset = () => {
    setColumnMetadata(prev => {
      const reset = {}
      Object.entries(prev).forEach(([col, meta]) => {
        reset[col] = {
          ...meta,
          type: meta.originalType
        }
      })
      return reset
    })
  }

  const hasChanges = useMemo(() => {
    return Object.entries(columnMetadata).some(([col, meta]) => meta.type !== meta.originalType)
  }, [columnMetadata])

  // Pagination for data table
  const paginatedData = useMemo(() => {
    if (!data) return []
    const start = (currentPage - 1) * rowsPerPage
    const end = start + rowsPerPage
    return data.slice(start, end)
  }, [data, currentPage, rowsPerPage])

  const totalPages = Math.ceil((data?.length || 0) / rowsPerPage)

  // Safety check: if no data or columns, show message
  if (!data || !columns || columns.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-800">No data available. Please upload a file first.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Metadata Editor Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Column Metadata</h2>
          <div className="flex gap-2">
            {hasChanges && (
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Reset Changes
              </button>
            )}
            <button
              onClick={handleApplyChanges}
              disabled={!hasChanges}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Apply Changes
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Column
            </label>
            <select
              value={selectedColumn}
              onChange={(e) => setSelectedColumn(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {columns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>

          {/* Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Column Type
            </label>
            <select
              value={columnMetadata[selectedColumn]?.type || 'categorical'}
              onChange={(e) => handleTypeChange(selectedColumn, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="numeric">Numeric</option>
              <option value="date">Date/Time</option>
              <option value="categorical">Categorical</option>
            </select>
          </div>
        </div>

        {/* Column Statistics */}
        {columnStats && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Column Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Total Values</p>
                <p className="text-lg font-semibold text-gray-900">{columnStats.total}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Unique Values</p>
                <p className="text-lg font-semibold text-gray-900">{columnStats.unique}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Numeric Ratio</p>
                <p className="text-lg font-semibold text-gray-900">
                  {(columnStats.numericRatio * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Date Ratio</p>
                <p className="text-lg font-semibold text-gray-900">
                  {(columnStats.dateRatio * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Sample Values */}
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-2">Sample Values:</p>
              <div className="flex flex-wrap gap-2">
                {columnStats.sample.slice(0, 5).map((val, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 text-xs bg-white border border-gray-200 rounded"
                  >
                    {String(val).substring(0, 20)}
                  </span>
                ))}
                {columnStats.sample.length > 5 && (
                  <span className="px-2 py-1 text-xs text-gray-500">
                    +{columnStats.sample.length - 5} more
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Type Recommendations */}
        {columnStats && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Recommendation:</strong> Based on the data, this column is best classified as{' '}
              <strong>
                {columnStats.numericRatio > 0.7 ? 'Numeric' :
                 columnStats.dateRatio > 0.5 ? 'Date' :
                 'Categorical'}
              </strong>
            </p>
          </div>
        )}
      </div>

      {/* Data Table Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Data Preview</h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={showPreview}
                onChange={(e) => setShowPreview(e.target.checked)}
                className="rounded border-gray-300"
              />
              Show Preview
            </label>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(parseInt(e.target.value))
                setCurrentPage(1)
              }}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg"
            >
              <option value={25}>25 rows</option>
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
              <option value={200}>200 rows</option>
            </select>
          </div>
        </div>

        {showPreview && (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Row
                    </th>
                    {columns.map(col => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        <div className="flex items-center gap-2">
                          {col}
                          <span className={`px-2 py-0.5 text-xs rounded ${
                            columnMetadata[col]?.type === 'numeric' ? 'bg-blue-100 text-blue-800' :
                            columnMetadata[col]?.type === 'date' ? 'bg-green-100 text-green-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {columnMetadata[col]?.type || 'categorical'}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedData.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {(currentPage - 1) * rowsPerPage + rowIdx + 1}
                      </td>
                      {columns.map(col => (
                        <td
                          key={col}
                          className={`px-4 py-3 text-sm ${
                            columnMetadata[col]?.type === 'numeric' ? 'text-right font-mono' :
                            columnMetadata[col]?.type === 'date' ? 'text-left' :
                            'text-left'
                          }`}
                        >
                          {row[col] !== null && row[col] !== undefined ? String(row[col]) : ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {(currentPage - 1) * rowsPerPage + 1} to{' '}
                {Math.min(currentPage * rowsPerPage, data?.length || 0)} of {data?.length || 0} rows
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default DataMetadataEditor

