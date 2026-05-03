import { useState, useMemo, useEffect } from 'react'
import { TD } from '../constants/terminalDashboardPalette'

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

  const isProbablyUrl = (v) => {
    if (v === null || v === undefined) return false
    const s = String(v).trim()
    return /^https?:\/\/\S+$/i.test(s)
  }

  const renderCell = (col, value) => {
    if (value === null || value === undefined) return ''
    const str = String(value)

    // SAM.gov + general URL fields: show as clickable link
    const linkStyle = { color: TD.ACCENT_MID }
    if (col === 'uiLink' && isProbablyUrl(str)) {
      return (
        <a
          href={str}
          target="_blank"
          rel="noreferrer"
          className="hover:underline"
          style={linkStyle}
          title={str}
        >
          Open opportunity
        </a>
      )
    }

    if (isProbablyUrl(str)) {
      return (
        <a
          href={str}
          target="_blank"
          rel="noreferrer"
          className="hover:underline"
          style={linkStyle}
          title={str}
        >
          {str}
        </a>
      )
    }

    return str
  }

  const cardShell = {
    background: TD.CARD_BG,
    border: `0.5px solid ${TD.CARD_BORDER}`,
    borderRadius: '12px',
    padding: '24px',
  }
  const selectStyle = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    border: `0.5px solid ${TD.CARD_BORDER}`,
    background: TD.PAGE_BG,
    color: TD.TEXT_1,
    fontSize: '14px',
  }
  const btnSecondary = {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 500,
    borderRadius: '8px',
    border: `0.5px solid ${TD.CARD_BORDER}`,
    background: TD.PAGE_BG,
    color: TD.TEXT_2,
    cursor: 'pointer',
  }
  const btnPrimary = {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 600,
    borderRadius: '8px',
    border: 'none',
    background: TD.ACCENT_BLUE,
    color: '#fff',
    cursor: 'pointer',
  }

  // Safety check: if no data or columns, show message
  if (!data || !columns || columns.length === 0) {
    return (
      <div
        className="rounded-lg p-6"
        style={{
          background: 'rgba(245, 158, 11, 0.1)',
          border: '0.5px solid rgba(245, 158, 11, 0.35)',
        }}
      >
        <p style={{ color: '#fcd34d' }}>No data available. Please upload a file first.</p>
      </div>
    )
  }

  const typeBadgeStyle = (type) => {
    const t = type || 'categorical'
    if (t === 'numeric') return { background: 'rgba(29, 78, 216, 0.25)', color: TD.ACCENT_MID }
    if (t === 'date') return { background: 'rgba(5, 150, 105, 0.2)', color: TD.SUCCESS_ALT }
    return { background: 'rgba(124, 58, 237, 0.2)', color: '#c4b5fd' }
  }

  return (
    <div className="space-y-6" style={{ background: TD.PAGE_BG }}>
      {/* Metadata Editor Section */}
      <div style={cardShell}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: TD.TEXT_1, margin: 0 }}>Column Metadata</h2>
          <div className="flex gap-2">
            {hasChanges && (
              <button type="button" onClick={handleReset} style={btnSecondary}>
                Reset Changes
              </button>
            )}
            <button
              type="button"
              onClick={handleApplyChanges}
              disabled={!hasChanges}
              style={{
                ...btnPrimary,
                opacity: !hasChanges ? 0.45 : 1,
                cursor: !hasChanges ? 'not-allowed' : 'pointer',
              }}
            >
              Apply Changes
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label className="block mb-2 text-sm font-medium" style={{ color: TD.TEXT_2 }}>
              Select Column
            </label>
            <select
              value={selectedColumn}
              onChange={(e) => setSelectedColumn(e.target.value)}
              style={selectStyle}
              className="focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              {columns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium" style={{ color: TD.TEXT_2 }}>
              Column Type
            </label>
            <select
              value={columnMetadata[selectedColumn]?.type || 'categorical'}
              onChange={(e) => handleTypeChange(selectedColumn, e.target.value)}
              style={selectStyle}
              className="focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <option value="numeric">Numeric</option>
              <option value="date">Date/Time</option>
              <option value="categorical">Categorical</option>
            </select>
          </div>
        </div>

        {columnStats && (
          <div className="mt-6 rounded-lg p-4" style={{ background: TD.PAGE_BG, border: `0.5px solid ${TD.CARD_BORDER}` }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: TD.TEXT_1 }}>Column Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs" style={{ color: TD.TEXT_3 }}>Total Values</p>
                <p className="text-lg font-semibold" style={{ color: TD.TEXT_1 }}>{columnStats.total}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: TD.TEXT_3 }}>Unique Values</p>
                <p className="text-lg font-semibold" style={{ color: TD.TEXT_1 }}>{columnStats.unique}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: TD.TEXT_3 }}>Numeric Ratio</p>
                <p className="text-lg font-semibold" style={{ color: TD.TEXT_1 }}>
                  {(columnStats.numericRatio * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-xs" style={{ color: TD.TEXT_3 }}>Date Ratio</p>
                <p className="text-lg font-semibold" style={{ color: TD.TEXT_1 }}>
                  {(columnStats.dateRatio * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs mb-2" style={{ color: TD.TEXT_3 }}>Sample Values:</p>
              <div className="flex flex-wrap gap-2">
                {columnStats.sample.slice(0, 5).map((val, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 text-xs rounded"
                    style={{
                      background: TD.CARD_BG,
                      border: `0.5px solid ${TD.CARD_BORDER}`,
                      color: TD.TEXT_1,
                    }}
                  >
                    {String(val).substring(0, 20)}
                  </span>
                ))}
                {columnStats.sample.length > 5 && (
                  <span className="px-2 py-1 text-xs" style={{ color: TD.TEXT_3 }}>
                    +{columnStats.sample.length - 5} more
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {columnStats && (
          <div
            className="mt-4 rounded-lg p-3"
            style={{
              background: 'rgba(59, 130, 246, 0.12)',
              border: `0.5px solid rgba(59, 130, 246, 0.35)`,
            }}
          >
            <p className="text-sm" style={{ color: TD.TEXT_2 }}>
              <strong style={{ color: TD.TEXT_1 }}>Recommendation:</strong> Based on the data, this column is best classified as{' '}
              <strong style={{ color: TD.ACCENT_MID }}>
                {columnStats.numericRatio > 0.7 ? 'Numeric' :
                 columnStats.dateRatio > 0.5 ? 'Date' :
                 'Categorical'}
              </strong>
            </p>
          </div>
        )}
      </div>

      <div style={cardShell}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: TD.TEXT_1, margin: 0 }}>Data Preview</h2>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: TD.TEXT_2 }}>
              <input
                type="checkbox"
                checked={showPreview}
                onChange={(e) => setShowPreview(e.target.checked)}
                className="rounded"
                style={{ accentColor: TD.ACCENT_BLUE }}
              />
              Show Preview
            </label>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10))
                setCurrentPage(1)
              }}
              style={{ ...selectStyle, width: 'auto' }}
              className="focus:outline-none focus:ring-2 focus:ring-blue-500/40"
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
            <div className="overflow-x-auto rounded-lg" style={{ border: `0.5px solid ${TD.CARD_BORDER}` }}>
              <table className="min-w-full">
                <thead style={{ background: TD.STRIP_BG }}>
                  <tr style={{ borderBottom: `0.5px solid ${TD.CARD_BORDER}` }}>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                      style={{ color: TD.TEXT_3 }}
                    >
                      Row
                    </th>
                    {columns.map(col => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                        style={{ color: TD.TEXT_3 }}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span style={{ color: TD.TEXT_1 }}>{col}</span>
                          <span
                            className="px-2 py-0.5 text-xs rounded"
                            style={typeBadgeStyle(columnMetadata[col]?.type)}
                          >
                            {columnMetadata[col]?.type || 'categorical'}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row, rowIdx) => (
                    <tr
                      key={rowIdx}
                      style={{
                        borderBottom: `0.5px solid ${TD.CARD_BORDER}`,
                        background: rowIdx % 2 === 0 ? TD.PAGE_BG : 'rgba(15, 23, 42, 0.5)',
                      }}
                    >
                      <td className="px-4 py-3 text-sm" style={{ color: TD.TEXT_3 }}>
                        {(currentPage - 1) * rowsPerPage + rowIdx + 1}
                      </td>
                      {columns.map(col => (
                        <td
                          key={col}
                          className={`px-4 py-3 text-sm ${columnMetadata[col]?.type === 'numeric' ? 'text-right font-mono' : 'text-left'}`}
                          style={{ color: TD.TEXT_1 }}
                        >
                          {renderCell(col, row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm" style={{ color: TD.TEXT_2 }}>
                Showing {(currentPage - 1) * rowsPerPage + 1} to{' '}
                {Math.min(currentPage * rowsPerPage, data?.length || 0)} of {data?.length || 0} rows
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={{
                    ...btnSecondary,
                    opacity: currentPage === 1 ? 0.45 : 1,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm" style={{ color: TD.TEXT_2 }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    ...btnSecondary,
                    opacity: currentPage === totalPages ? 0.45 : 1,
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  }}
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

