import { useMemo } from 'react'
import AdvancedDashboard from './AdvancedDashboard'
import DashboardCharts from './DashboardCharts'
import MetricCards from './MetricCards'
import ContractMapWidget from './widgets/ContractMapWidget'

/**
 * Renders a legacy (non-Studio) dashboard from shorts_dashboards row.
 * Used on Post page and Live page when dashboard has data but no schema.
 */
export default function LegacyDashboardPreview({ dashboard, chartFilter, onChartFilter }) {
  const data = Array.isArray(dashboard?.data) ? dashboard.data : []
  const numericColumns = dashboard?.numeric_columns || []
  const categoricalColumns = dashboard?.categorical_columns || []
  const dateColumns = dashboard?.date_columns || []
  const selectedNumeric = dashboard?.selected_numeric || numericColumns[0] || ''
  const selectedCategorical = dashboard?.selected_categorical || categoricalColumns[0] || ''
  const selectedDate = dashboard?.selected_date || dateColumns[0] || ''
  const view = dashboard?.dashboard_view || 'advanced'
  const filteredData = chartFilter
    ? data.filter((row) => {
        const v = row[chartFilter.dimension]
        if (v == null) return false
        return String(v) === String(chartFilter.value)
      })
    : data
  const stats = filteredData?.length
    ? {
        totalRows: filteredData.length,
        sum: selectedNumeric
          ? filteredData.reduce((s, r) => s + (Number(r[selectedNumeric]) || 0), 0)
          : null,
        avg: selectedNumeric && filteredData.length
          ? filteredData.reduce((s, r) => s + (Number(r[selectedNumeric]) || 0), 0) / filteredData.length
          : null
      }
    : { totalRows: 0, sum: null, avg: null }

  if (data.length === 0) {
    return <div className="p-8 text-center text-gray-500">No data to display.</div>
  }

  const columns = useMemo(() => (data[0] ? Object.keys(data[0]) : []), [data])
  const showMapTab = columns.some((c) => String(c).toLowerCase() === 'state')
  const mapNumericCol = numericColumns?.includes('award_amount')
    ? 'award_amount'
    : numericColumns?.includes('opportunity_count')
      ? 'opportunity_count'
      : null

  return (
    <div className="p-4">
      {showMapTab && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-4 mb-6" style={{ minHeight: '360px' }}>
          <ContractMapWidget
            data={filteredData || data}
            selectedCategorical="state"
            selectedNumeric={mapNumericCol}
            chartFilter={chartFilter}
            onChartFilter={onChartFilter}
          />
        </div>
      )}
      {view === 'advanced' ? (
        <AdvancedDashboard
          data={data}
          filteredData={filteredData}
          selectedNumeric={selectedNumeric}
          selectedCategorical={selectedCategorical}
          selectedDate={selectedDate}
          onChartFilter={onChartFilter}
          chartFilter={chartFilter}
          categoricalColumns={categoricalColumns}
          numericColumns={numericColumns}
          dateColumns={dateColumns}
        />
      ) : (
        <>
          <DashboardCharts
            data={data}
            filteredData={filteredData}
            selectedNumeric={selectedNumeric}
            selectedCategorical={selectedCategorical}
            selectedDate={selectedDate}
            onChartFilter={onChartFilter}
            chartFilter={chartFilter}
          />
          <div className="mt-4">
            <MetricCards
              data={filteredData}
              numericColumns={numericColumns}
              selectedNumeric={selectedNumeric}
              stats={stats}
            />
          </div>
        </>
      )}
    </div>
  )
}
