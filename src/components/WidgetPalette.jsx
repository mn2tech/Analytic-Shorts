import { WIDGET_CONFIGS } from '../config/widgetConfig'

/**
 * WidgetPalette - Sidebar component for selecting and adding widgets to the dashboard
 */
function WidgetPalette({ onAddWidget, visibleWidgets = [] }) {
  const availableWidgets = Object.values(WIDGET_CONFIGS)
  
  const widgetIcons = {
    'line-chart': (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    'bar-chart': (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    'donut-chart': (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H11v11.488A9.001 9.001 0 0020.488 9z" />
      </svg>
    ),
    'distribution-list': (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
    'sunburst-chart': (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    ),
    'forecast-chart': (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    )
  }

  const widgetDescriptions = {
    'line-chart': 'Line Chart',
    'bar-chart': 'Bar Chart',
    'donut-chart': 'Pie/Donut Chart',
    'distribution-list': 'Distribution List',
    'sunburst-chart': 'Sunburst Chart',
    'forecast-chart': 'Forecast Chart'
  }

  const handleAddWidget = (widgetId) => {
    // Prevent multiple rapid clicks
    if (!onAddWidget) return
    
    // Use setTimeout to defer and allow UI to respond immediately
    setTimeout(() => {
      onAddWidget(widgetId)
    }, 0)
  }

  const handleDragStart = (e, widgetId) => {
    e.dataTransfer.setData('widgetId', widgetId)
    e.dataTransfer.effectAllowed = 'move'
    // Add visual feedback
    e.target.style.opacity = '0.5'
  }

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1'
  }

  return (
    <div className="w-64 bg-white border-l border-gray-200 shadow-lg h-full overflow-y-auto">
      <div className="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
        <h3 className="text-lg font-semibold text-gray-900">Add Widgets</h3>
        <p className="text-xs text-gray-500 mt-1">Click to add to dashboard</p>
      </div>
      
      <div className="p-3 space-y-2">
        {availableWidgets.map((widget) => {
          const isVisible = visibleWidgets.includes(widget.id)
          const Icon = widgetIcons[widget.id] || widgetIcons['line-chart']
          
          return (
            <button
              key={widget.id}
              onClick={() => handleAddWidget(widget.id)}
              onDragStart={(e) => !isVisible && handleDragStart(e, widget.id)}
              onDragEnd={handleDragEnd}
              draggable={!isVisible}
              disabled={isVisible}
              className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                isVisible
                  ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                  : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50 cursor-pointer cursor-grab active:cursor-grabbing'
              }`}
              title={isVisible ? 'Widget already added' : `Drag or click to add ${widgetDescriptions[widget.id] || widget.title}`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 ${isVisible ? 'text-gray-400' : 'text-blue-600'}`}>
                  {Icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-medium text-sm ${isVisible ? 'text-gray-400' : 'text-gray-900'}`}>
                    {widgetDescriptions[widget.id] || widget.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {widget.title}
                  </div>
                </div>
                {isVisible && (
                  <div className="flex-shrink-0">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default WidgetPalette

