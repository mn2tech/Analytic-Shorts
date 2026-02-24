import { useMemo, useState, useEffect, useCallback } from 'react'
import AdvancedDashboard from './AdvancedDashboard'
import AdvancedDashboardGrid from './AdvancedDashboardGrid'
import DashboardCharts from './DashboardCharts'
import MetricCards from './MetricCards'
import TimeSeriesReport from './TimeSeriesReport'
import ContractMapWidget from './widgets/ContractMapWidget'
import MatchingOpportunitiesPanel from './MatchingOpportunitiesPanel'
import DateRangeSlider from './DateRangeSlider'
import { getStateAbbr, getStateDisplayLabel } from './widgets/ContractMapWidget'

const BASE_TYPE_VALUES = ['Solicitation', 'Presolicitation', 'Sources Sought']
const MAX_CATEGORY_TABS = 12

function formatFieldLabel(field) {
  const raw = String(field || '').trim()
  if (!raw) return ''
  return raw.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim()
}

/**
 * Renders a legacy (non-Studio) dashboard from shorts_dashboards row.
 * Used on Post page and Live page when dashboard has data but no schema.
 * Filter logic matches main Dashboard applyChartFilter (selectedCategorical + state column).
 * Optional top section: date range slider, title, view tabs, View by Base Type (same as main Dashboard).
 */
export default function LegacyDashboardPreview({ dashboard, chartFilter, onChartFilter, title: titleProp }) {
  const data = Array.isArray(dashboard?.data) ? dashboard.data : []
  const numericColumns = dashboard?.numeric_columns || []
  const categoricalColumns = dashboard?.categorical_columns || []
  const dateColumns = dashboard?.date_columns || []
  const selectedNumeric = dashboard?.selected_numeric || numericColumns[0] || ''
  const dashboardSelectedCategorical = dashboard?.selected_categorical || categoricalColumns[0] || ''
  const dashboardSelectedDate = dashboard?.selected_date || dateColumns[0] || ''
  const dashboardView = dashboard?.dashboard_view || 'advanced'
  const columns = useMemo(() => (data[0] ? Object.keys(data[0]) : []), [data])

  const [selectedCategorical, setSelectedCategorical] = useState(dashboardSelectedCategorical)
  const [selectedDateLocal, setSelectedDateLocal] = useState(dashboardSelectedDate)
  const [viewState, setViewState] = useState(dashboardView)
  const [dateFilteredData, setDateFilteredData] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [fullScreen, setFullScreen] = useState(false)

  useEffect(() => {
    setSelectedCategorical((prev) => {
      if (dashboardSelectedCategorical && prev !== dashboardSelectedCategorical) return dashboardSelectedCategorical
      return prev
    })
  }, [dashboardSelectedCategorical])
  useEffect(() => {
    setSelectedDateLocal((prev) => {
      const next = dashboardSelectedDate || dateColumns?.[0] || ''
      return next && next !== prev ? next : prev
    })
  }, [dashboardSelectedDate, dateColumns])
  useEffect(() => {
    setDateFilteredData(null)
  }, [selectedDateLocal])
  useEffect(() => {
    setViewState((prev) => (dashboardView && dashboardView !== prev ? dashboardView : prev))
  }, [dashboardView])

  const baseTypeCol = columns?.includes('baseType') ? 'baseType' : columns?.includes('type') ? 'type' : null
  useEffect(() => {
    if (chartFilter?.type === 'category' && BASE_TYPE_VALUES.includes(String(chartFilter?.value)) && baseTypeCol) {
      setSelectedCategorical(baseTypeCol)
    }
  }, [chartFilter?.type, chartFilter?.value, baseTypeCol])

  const stateColForMap = useMemo(() => {
    try {
      const exact = columns?.find((c) => String(c).toLowerCase() === 'state')
      if (exact) return exact
      const row0 = data[0]
      if (row0 != null) {
        const withState = columns?.find(
          (c) =>
            String(c).toLowerCase().includes('state') &&
            (() => {
              const v = row0[c]
              if (v != null && (typeof v === 'string' || typeof v === 'number')) return true
              if (v != null && typeof v === 'object' && (v.state != null || v.code != null)) return true
              return false
            })()
        )
        if (withState) return withState
        if (typeof row0.placeOfPerformance === 'object' && row0.placeOfPerformance != null && (row0.placeOfPerformance.state != null || row0.placeOfPerformance.stateCode != null)) {
          return row0.placeOfPerformance.state != null ? 'placeOfPerformance.state' : 'placeOfPerformance.stateCode'
        }
        if (typeof row0.place_of_performance === 'object' && row0.place_of_performance != null && (row0.place_of_performance.state != null || row0.place_of_performance.state_code != null)) {
          return row0.place_of_performance.state != null ? 'place_of_performance.state' : 'place_of_performance.state_code'
        }
      }
      return 'state'
    } catch (_) {
      return 'state'
    }
  }, [columns, data])

  const getRowStateVal = useCallback(
    (row, col) => {
      if (!row || !col) return undefined
      if (col.includes('.')) return col.split('.').reduce((obj, k) => (obj != null ? obj[k] : undefined), row)
      return row[col]
    },
    []
  )

  const applyChartFilter = useCallback(
    (baseData) => {
      if (!baseData || !chartFilter) return baseData
      if (chartFilter.type === 'category') {
        const filterVal = chartFilter.value
        const stateCol = columns?.find((c) => String(c).toLowerCase() === 'state') || (stateColForMap !== 'state' ? stateColForMap : null)
        const isStateAbbr = filterVal && String(filterVal).length === 2 && getStateAbbr(filterVal) === filterVal
        const useStateCol = stateCol && (selectedCategorical === 'state' || String(selectedCategorical).toLowerCase() === 'state' || isStateAbbr)
        const filterCol = useStateCol ? stateCol : selectedCategorical
        if (!filterCol) return baseData
        if (stateCol && (filterCol === stateCol || filterCol === stateColForMap)) {
          const filterAbbr = getStateAbbr(filterVal)
          return baseData.filter((row) => getStateAbbr(getRowStateVal(row, filterCol)) === filterAbbr)
        }
        return baseData.filter((row) => (filterCol.includes('.') ? getRowStateVal(row, filterCol) : row[filterCol]) === filterVal)
      }
      if (chartFilter.type === 'date' && selectedDateLocal) {
        return baseData.filter((row) => {
          const rowDate = new Date(row[selectedDateLocal])
          const filterDate = new Date(chartFilter.value)
          return rowDate.toDateString() === filterDate.toDateString()
        })
      }
      return baseData
    },
    [chartFilter, selectedCategorical, selectedDateLocal, columns, stateColForMap, getRowStateVal]
  )

  const baseData = dateFilteredData !== null ? dateFilteredData : data
  const filteredData = useMemo(() => applyChartFilter(baseData), [baseData, applyChartFilter])

  const handleDateRangeFilter = useCallback((filterInfo) => {
    if (filterInfo?.filteredData) setDateFilteredData(filterInfo.filteredData)
  }, [])

  const hasDateColumns = Array.isArray(dateColumns) && dateColumns.length > 0 && selectedDateLocal && dateColumns.includes(selectedDateLocal)
  const samgovDateQuickOptions = useMemo(() => {
    const options = [
      { key: 'updatedDate', label: 'Updated' },
      { key: 'responseDeadLine', label: 'Response Deadline' },
      { key: 'postedDate', label: 'Posted' },
    ]
    return options.filter((opt) => (dateColumns || []).includes(opt.key))
  }, [dateColumns])

  const categoryTabs = useMemo(() => {
    if (!selectedCategorical) return null
    const base = baseData || []
    if (!Array.isArray(base) || base.length === 0) return null
    const counts = new Map()
    for (const row of base) {
      const raw = row?.[selectedCategorical]
      if (raw === null || raw === undefined || raw === '') continue
      const key = String(raw)
      counts.set(key, (counts.get(key) || 0) + 1)
    }
    if (counts.size < 2) return null
    const sorted = Array.from(counts.entries())
      .sort((a, b) => (b[1] - a[1]) || String(a[0]).localeCompare(String(b[0])))
    const values = sorted.slice(0, MAX_CATEGORY_TABS).map(([v]) => v)
    return { values, total: counts.size, truncated: counts.size > MAX_CATEGORY_TABS }
  }, [selectedCategorical, baseData])

  const activeCategoryTabValue = chartFilter?.type === 'category' ? String(chartFilter.value) : 'All'
  const displayTitle = titleProp || dashboard?.title || dashboard?.name || 'Gov Contracting opportunities'

  const handleChartFilter = useCallback(
    (filter) => {
      if (filter?.type === 'category' && filter?.value && baseTypeCol && BASE_TYPE_VALUES.includes(String(filter.value))) {
        setSelectedCategorical(baseTypeCol)
      }
      onChartFilter(filter)
    },
    [onChartFilter, baseTypeCol]
  )
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

  const showMapTab =
    stateColForMap === 'state'
      ? columns.some((c) => String(c).toLowerCase() === 'state')
      : true
  const mapNumericCol = numericColumns?.includes('award_amount')
    ? 'award_amount'
    : numericColumns?.includes('opportunity_count')
      ? 'opportunity_count'
      : null

  const opportunityKeyword =
    dashboard?.opportunity_keyword ?? dashboard?.opportunityKeyword ?? ''
  const opportunityDateRangeDays =
    dashboard?.opportunity_date_range_days ?? dashboard?.opportunityDateRangeDays ?? 30
  const opportunityViewFilter =
    dashboard?.opportunity_view_filter ?? dashboard?.opportunityViewFilter ?? 'all'
  const opportunityFavorites =
    dashboard?.opportunity_favorites ?? dashboard?.opportunityFavorites ?? []
  const opportunityFavoriteRows =
    dashboard?.opportunity_favorite_rows ?? dashboard?.opportunityFavoriteRows ?? []

  return (
    <div className={fullScreen ? 'fixed inset-0 z-50 bg-gray-50 overflow-auto' : ''}>
      {fullScreen && (
        <div className="sticky top-0 z-10 flex-shrink-0 bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">{displayTitle}</span>
          <button
            type="button"
            onClick={() => setFullScreen(false)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-gray-600 text-white hover:bg-gray-700"
            title="Exit Fullscreen"
          >
            Exit Fullscreen
          </button>
        </div>
      )}
      <div className="p-4">
      {/* Date range slider + Date field (same as main Dashboard / SharedDashboard) */}
      {data.length > 0 && hasDateColumns && (
        <div className="bg-white border-b border-gray-200 shadow-sm -mx-4 mt-4 mb-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between">
              <div className="flex-1">
                <DateRangeSlider
                  data={data}
                  selectedDate={selectedDateLocal}
                  onFilterChange={handleDateRangeFilter}
                />
              </div>
              {samgovDateQuickOptions.length > 0 && (
                <div className="flex items-center gap-2 md:ml-4">
                  <span className="text-xs font-medium text-gray-600">Date field:</span>
                  {samgovDateQuickOptions.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setSelectedDateLocal(opt.key)}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                        selectedDateLocal === opt.key
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Title + record count + Filters / Fullscreen / view tabs (same as main Dashboard) */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900 mb-1">{displayTitle}</h2>
        <p className="text-sm text-gray-600 mb-3">
          {filteredData?.length ?? 0} records • {columns.length} columns
        </p>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors flex items-center gap-2"
              title="Filters"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
              {showFilters ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : null}
            </button>
            {showFilters && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowFilters(false)} aria-hidden="true" />
                <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[70vh] overflow-y-auto p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Filters & columns (read-only)</h3>
                  <p className="text-xs text-gray-500 mb-2">Shared snapshot — filter changes apply in-session only.</p>
                  {chartFilter && (
                    <p className="text-xs text-gray-700 mb-2">
                      Active: {chartFilter.type === 'category' ? (chartFilter.value && String(chartFilter.value).length === 2 ? getStateDisplayLabel(chartFilter.value) : chartFilter.value) : chartFilter.type === 'date' ? new Date(chartFilter.value).toLocaleDateString() : ''}
                    </p>
                  )}
                  <p className="text-xs text-gray-600">Numeric: {formatFieldLabel(selectedNumeric) || selectedNumeric || '—'}</p>
                  <p className="text-xs text-gray-600">Category: {formatFieldLabel(selectedCategorical) || selectedCategorical || '—'}</p>
                  <p className="text-xs text-gray-600">Date: {selectedDateLocal || '—'}</p>
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setFullScreen((f) => !f)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors flex items-center gap-2"
            title={fullScreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            {fullScreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
          <button
            type="button"
            onClick={() => setViewState('simple')}
            className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${viewState === 'simple' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 hover:bg-gray-50'}`}
          >
            Charts
          </button>
          <button
            type="button"
            onClick={() => setViewState('advanced')}
            className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${viewState === 'advanced' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 hover:bg-gray-50'}`}
          >
            Advanced
          </button>
          <button
            type="button"
            onClick={() => setViewState('custom')}
            className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${viewState === 'custom' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 hover:bg-gray-50'}`}
          >
            Custom
          </button>
          <button
            type="button"
            onClick={() => setViewState('timeseries')}
            className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${viewState === 'timeseries' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 hover:bg-gray-50'}`}
          >
            Time Series
          </button>
          <button
            type="button"
            onClick={() => setViewState('data')}
            className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${viewState === 'data' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 hover:bg-gray-50'}`}
          >
            Data & Metadata
          </button>
        </div>

        {/* View by Base Type (CategoryTabsBar) */}
        {categoryTabs?.values?.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">
              View by <span className="font-semibold text-gray-900">{formatFieldLabel(selectedCategorical) || selectedCategorical}</span>
            </p>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => handleChartFilter(null)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  activeCategoryTabValue === 'All' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                All
              </button>
              {categoryTabs.values.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => handleChartFilter({ type: 'category', value: v })}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    activeCategoryTabValue === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {selectedCategorical && String(selectedCategorical).toLowerCase() === 'state' ? getStateDisplayLabel(v) : v}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {showMapTab && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-4 mb-6" style={{ minHeight: '360px' }}>
          <ContractMapWidget
            data={filteredData || data}
            selectedCategorical={stateColForMap}
            selectedNumeric={mapNumericCol}
            chartFilter={chartFilter}
            onChartFilter={handleChartFilter}
          />
        </div>
      )}
      {viewState === 'data' ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-4 mb-6">
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {columns.map((c) => (
                    <th key={c} className="px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">{formatFieldLabel(c) || c}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(filteredData || []).slice(0, 200).map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {columns.map((col) => (
                      <td key={col} className="px-3 py-2 text-gray-900 whitespace-nowrap max-w-xs truncate" title={typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col] ?? '')}>
                        {typeof row[col] === 'object' ? (row[col]?.state ?? JSON.stringify(row[col])) : String(row[col] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-2">Showing up to 200 rows.</p>
        </div>
      ) : viewState === 'advanced' ? (
        <AdvancedDashboard
          data={baseData}
          filteredData={filteredData}
          selectedNumeric={selectedNumeric}
          selectedCategorical={selectedCategorical}
          selectedDate={selectedDateLocal}
          onChartFilter={handleChartFilter}
          chartFilter={chartFilter}
          categoricalColumns={categoricalColumns}
          numericColumns={numericColumns}
          dateColumns={dateColumns}
        />
      ) : viewState === 'custom' ? (
        <div className="mb-6">
          <AdvancedDashboardGrid
            data={baseData}
            filteredData={filteredData}
            selectedNumeric={selectedNumeric}
            selectedCategorical={selectedCategorical}
            selectedDate={selectedDateLocal}
            onChartFilter={handleChartFilter}
            chartFilter={chartFilter}
            categoricalColumns={categoricalColumns}
            numericColumns={numericColumns}
            dateColumns={dateColumns}
            viewMode="view"
          />
        </div>
      ) : viewState === 'timeseries' ? (
        <div className="mb-6">
          <TimeSeriesReport
            data={filteredData || baseData}
            numericColumns={numericColumns}
            dateColumns={dateColumns}
            selectedNumeric={selectedNumeric}
            selectedDate={selectedDateLocal}
          />
        </div>
      ) : (
        <>
          <DashboardCharts
            data={baseData}
            filteredData={filteredData}
            selectedNumeric={selectedNumeric}
            selectedCategorical={selectedCategorical}
            selectedDate={selectedDateLocal}
            onChartFilter={handleChartFilter}
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
      <MatchingOpportunitiesPanel
        filteredData={filteredData}
        columns={columns}
        chartFilter={chartFilter}
        onChartFilter={handleChartFilter}
        selectedCategorical={selectedCategorical}
        categoricalColumns={categoricalColumns}
        initialOpportunityKeyword={opportunityKeyword}
        initialOpportunityDateRangeDays={opportunityDateRangeDays}
        initialOpportunityViewFilter={opportunityViewFilter}
        initialOpportunityFavorites={opportunityFavorites}
        initialOpportunityFavoriteRows={opportunityFavoriteRows}
        sharedSnapshot={true}
      />
      </div>
    </div>
  )
}
