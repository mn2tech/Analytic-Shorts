import LineChartWidget from './LineChartWidget'
import DonutChartWidget from './DonutChartWidget'
import DistributionListWidget from './DistributionListWidget'
import BarChartWidget from './BarChartWidget'
import SunburstChart from '../SunburstChart'
import ForecastChart from '../ForecastChart'
import BudgetInsightsWidget from './BudgetInsightsWidget'

/**
 * WidgetRenderer - Renders the appropriate widget component based on widget ID
 */
function WidgetRenderer({ 
  widgetId, 
  data, 
  filteredData,
  selectedNumeric, 
  selectedCategorical, 
  selectedDate,
  chartFilter,
  onChartFilter,
  categoricalColumns
}) {
  const props = {
    data: filteredData || data,
    selectedNumeric,
    selectedCategorical,
    selectedDate,
    chartFilter,
    onChartFilter
  }

  switch (widgetId) {
    case 'line-chart':
      return <LineChartWidget {...props} />
    
    case 'donut-chart':
      return <DonutChartWidget {...props} />
    
    case 'distribution-list':
      return <DistributionListWidget {...props} />
    
    case 'bar-chart':
      return <BarChartWidget {...props} />
    
    case 'sunburst-chart':
      return (
        <div className="h-full">
          <SunburstChart
            data={filteredData || data}
            selectedCategorical={selectedCategorical}
            selectedNumeric={selectedNumeric}
            secondaryCategory={categoricalColumns && categoricalColumns.length > 1 
              ? categoricalColumns.find(col => col !== selectedCategorical) || categoricalColumns[1]
              : null}
            onChartFilter={onChartFilter}
            chartFilter={chartFilter}
          />
        </div>
      )
    
    case 'forecast-chart':
      if (!selectedDate || !selectedNumeric) {
        return (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">
            Select date and numeric columns to view forecast
          </div>
        )
      }
      return (
        <ForecastChart
          data={filteredData || data}
          selectedNumeric={selectedNumeric}
          selectedDate={selectedDate}
          forecastPeriods={6}
        />
      )
    
    case 'budget-insights':
      return (
        <BudgetInsightsWidget
          data={filteredData || data}
          selectedNumeric={selectedNumeric}
          selectedCategorical={selectedCategorical}
          selectedDate={selectedDate}
        />
      )
    
    default:
      return (
        <div className="h-full flex items-center justify-center text-gray-400 text-sm">
          Unknown widget: {widgetId}
        </div>
      )
  }
}

export default WidgetRenderer

