/**
 * GovCon Executive Intelligence template layout.
 * Matches mock: KPI row, hero trend, driver bars, US map, top states, details table, tabs.
 */

const templateId = 'govcon'
const themeId = 'ecommerceLight'

const layoutSpec = {
  templateId,
  themeId,
  tabs: [
    { id: 'overview', label: 'Overview', default: true },
    { id: 'anomaliesForecast', label: 'Anomalies & Forecast' },
    { id: 'segmentsTrends', label: 'Segments & Trends' },
    { id: 'dataQuality', label: 'Data Quality' },
  ],
  slots: {
    kpiRow: { count: 5 },
    heroTrend: true,
    insightsPanel: false,
    driverPanel: true,
    mapPanel: true,
    topStatesPanel: true,
    detailsTable: true,
  },
  header: {
    title: 'SAM Opportunities – Executive Intelligence',
    runMeta: 'Run vX.Y • Date • Confidence',
  },
  filterBar: {
    dateRange: true,
    agency: true,
    naics: true,
    state: true,
    search: true,
  },
}

module.exports = {
  templateId,
  themeId,
  layoutSpec,
}
