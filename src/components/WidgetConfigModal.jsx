import { useState, useEffect } from 'react'

/**
 * WidgetConfigModal - Modal for configuring widget columns and data sources
 */
function WidgetConfigModal({ 
  isOpen, 
  onClose, 
  widgetId, 
  widgetTitle,
  numericColumns = [],
  categoricalColumns = [],
  dateColumns = [],
  currentConfig = {},
  onSave
}) {
  const [selectedNumeric, setSelectedNumeric] = useState(currentConfig.selectedNumeric || '')
  const [selectedCategorical, setSelectedCategorical] = useState(currentConfig.selectedCategorical || '')
  const [selectedDate, setSelectedDate] = useState(currentConfig.selectedDate || '')
  const [showValues, setShowValues] = useState(currentConfig.showValues !== undefined ? currentConfig.showValues : false)
  const [valueFontSize, setValueFontSize] = useState(currentConfig.valueFontSize || 12)
  const [barStyle, setBarStyle] = useState(currentConfig.barStyle || 'flat')

  useEffect(() => {
    if (isOpen) {
      setSelectedNumeric(currentConfig.selectedNumeric || '')
      setSelectedCategorical(currentConfig.selectedCategorical || '')
      setSelectedDate(currentConfig.selectedDate || '')
      setShowValues(currentConfig.showValues !== undefined ? currentConfig.showValues : false)
      setValueFontSize(currentConfig.valueFontSize || 12)
      setBarStyle(currentConfig.barStyle || 'flat')
    }
  }, [isOpen, currentConfig])

  if (!isOpen) return null

  const getRequiredColumns = () => {
    switch (widgetId) {
      case 'line-chart':
        return { numeric: true, date: true, categorical: false }
      case 'donut-chart':
        return { numeric: false, categorical: true, date: false } // Numeric optional - will count rows if not provided
      case 'bar-chart':
        return { numeric: false, categorical: true, date: false } // Numeric optional - will count rows if not provided
      case 'distribution-list':
        return { numeric: false, categorical: true, date: false } // Numeric optional - will count rows if not provided
      case 'sunburst-chart':
        return { numeric: true, categorical: true, date: false }
      case 'forecast-chart':
        return { numeric: true, date: true, categorical: false }
      case 'category-filter':
        return { numeric: false, categorical: true, date: false }
      case 'date-range-filter':
        return { numeric: false, categorical: false, date: true }
      case 'numeric-range-filter':
        return { numeric: true, categorical: false, date: false }
      default:
        return { numeric: false, categorical: false, date: false }
    }
  }

  const required = getRequiredColumns()
  const isValid = 
    (!required.numeric || selectedNumeric) &&
    (!required.categorical || selectedCategorical) &&
    (!required.date || selectedDate)

  const handleSave = () => {
    if (isValid && onSave) {
      const configToSave = {
        selectedNumeric,
        selectedCategorical,
        selectedDate,
        showValues,
        // Always save valueFontSize for chart widgets, even if showValues is false
        valueFontSize: isChartWidget ? valueFontSize : undefined,
        // Always save barStyle for bar charts
        barStyle: isBarChart ? barStyle : undefined
      }
      // Preserve any existing config values that aren't in the form
      const finalConfig = {
        ...currentConfig,
        ...configToSave
      }
      onSave(finalConfig)
      onClose()
    }
  }
  
  const isChartWidget = ['line-chart', 'bar-chart', 'donut-chart', 'sunburst-chart', 'forecast-chart'].includes(widgetId)
  const isBarChart = widgetId === 'bar-chart'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Configure {widgetTitle}</h2>
          <p className="text-sm text-gray-500 mt-1">Select columns to display data</p>
        </div>

        <div className="p-6 space-y-4">
          {required.numeric && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numeric Column <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedNumeric}
                onChange={(e) => setSelectedNumeric(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select numeric column...</option>
                {numericColumns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Optional numeric column for distribution charts */}
          {!required.numeric && required.categorical && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numeric Column <span className="text-gray-400 text-xs font-normal">(Optional - leave empty to count rows)</span>
              </label>
              <select
                value={selectedNumeric}
                onChange={(e) => setSelectedNumeric(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Count rows (no numeric column)</option>
                {numericColumns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
          )}

          {required.categorical && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category Column <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedCategorical}
                onChange={(e) => setSelectedCategorical(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select category column...</option>
                {categoricalColumns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
          )}

          {required.date && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Column <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select date column...</option>
                {dateColumns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!required.numeric && !required.categorical && !required.date && (
            <div className="text-sm text-gray-500">
              This widget doesn't require specific column configuration.
            </div>
          )}

          {isChartWidget && (
            <div className="pt-4 border-t border-gray-200 space-y-4">
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showValues}
                    onChange={(e) => setShowValues(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Show values on chart
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Display data values directly on chart elements
                </p>
              </div>
              
              {showValues && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Value Font Size: {valueFontSize}px
                  </label>
                  <input
                    type="range"
                    min="8"
                    max="20"
                    value={valueFontSize}
                    onChange={(e) => setValueFontSize(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>8px</span>
                    <span>20px</span>
                  </div>
                </div>
              )}
              
              {isBarChart && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bar Style
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'flat', label: 'Flat', desc: 'Solid color' },
                      { value: 'sheen', label: 'Sheen', desc: 'Shiny highlight' },
                      { value: 'gradient', label: 'Gradient', desc: 'Color fade' },
                      { value: '3d', label: '3D', desc: 'Depth effect' }
                    ].map((style) => (
                      <button
                        key={style.value}
                        onClick={() => setBarStyle(style.value)}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          barStyle === style.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-medium text-sm text-gray-900">{style.label}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{style.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isValid
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  )
}

export default WidgetConfigModal
