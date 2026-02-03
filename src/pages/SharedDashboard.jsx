import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Loader from '../components/Loader'
import DashboardCharts from '../components/DashboardCharts'
import AdvancedDashboard from '../components/AdvancedDashboard'
import TabNavigation from '../components/TabNavigation'
import MetricCards from '../components/MetricCards'
import Filters from '../components/Filters'
import AIInsights from '../components/AIInsights'
import { loadSharedDashboard } from '../utils/shareUtils'
import StudioDashboard from './studio/StudioDashboard'

function SharedDashboard() {
  const navigate = useNavigate()
  const { shareId } = useParams()
  const [data, setData] = useState(null)
  const [filteredData, setFilteredData] = useState(null)
  const [columns, setColumns] = useState([])
  const [numericColumns, setNumericColumns] = useState([])
  const [categoricalColumns, setCategoricalColumns] = useState([])
  const [dateColumns, setDateColumns] = useState([])
  const [selectedNumeric, setSelectedNumeric] = useState('')
  const [selectedCategorical, setSelectedCategorical] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [chartFilter, setChartFilter] = useState(null)
  const [sidebarFilteredData, setSidebarFilteredData] = useState(null)
  const [dashboardView, setDashboardView] = useState('advanced') // Default to advanced
  const [activeTab, setActiveTab] = useState('Overview')
  const [dashboardTitle, setDashboardTitle] = useState('Analytics Dashboard')

  useEffect(() => {
    const loadDashboard = async () => {
      if (!shareId) {
        setError('Invalid share link')
        setLoading(false)
        return
      }

      const sharedData = await loadSharedDashboard(shareId)
      if (!sharedData) {
        setError('Shared dashboard not found or expired')
        setLoading(false)
        return
      }

      // Check if this is a Studio dashboard
      if (sharedData.dashboardType === 'studio') {
        // For Studio dashboards, redirect to Studio dashboard view
        // Note: We'll need to create a shared Studio dashboard view
        // For now, show an error message
        setError('Studio dashboards cannot be viewed in shared mode yet. Please contact the dashboard owner.')
        setLoading(false)
        return
      }

      // Initialize data from shared dashboard
      setData(sharedData.data)
      setFilteredData(sharedData.data)
      setSidebarFilteredData(sharedData.data)
      setColumns(sharedData.columns || [])
      setNumericColumns(sharedData.numericColumns || [])
      setCategoricalColumns(sharedData.categoricalColumns || [])
      setDateColumns(sharedData.dateColumns || [])
      setSelectedNumeric(sharedData.selectedNumeric || '')
      setSelectedCategorical(sharedData.selectedCategorical || '')
      setSelectedDate(sharedData.selectedDate || '')
      
      // Restore dashboard view if saved
      if (sharedData.dashboardView) {
        setDashboardView(sharedData.dashboardView)
      }

      // Generate dashboard title
      const allColumns = sharedData.columns || []
    
    // First, check for specific dataset sources (API datasets)
    const getDatasetTitleFromSource = (source) => {
      if (!source) return null
      
      const sourceLower = source.toLowerCase()
      
      // Government Budget
      if (sourceLower.includes('treasury') || sourceLower.includes('fiscal data')) {
        return 'Government Budget'
      }
      
      // USA Spending
      if (sourceLower.includes('usaspending') || sourceLower.includes('usa spending')) {
        return 'USA Spending'
      }
      
      // Unemployment
      if (sourceLower.includes('labor statistics') || sourceLower.includes('bls') || sourceLower.includes('unemployment')) {
        return 'Unemployment Rate'
      }
      
      // CDC Health Data
      if (sourceLower.includes('cdc') || sourceLower.includes('disease control') || sourceLower.includes('centers for disease')) {
        return 'CDC Health Data'
      }
      
      return null
    }
    
    // Check for dataset name or source
    const datasetTitle = sharedData.datasetName || getDatasetTitleFromSource(sharedData.source)
    
    if (datasetTitle) {
      setDashboardTitle(datasetTitle)
    } else {
      // Detect domain from column names (fallback)
      const detectDomain = (columns) => {
        const lowerColumns = columns.map(col => col.toLowerCase())
        
        // Government Budget indicators
        if (lowerColumns.some(col => 
          (col.includes('budget') && col.includes('category')) || 
          (col.includes('budget') && col.includes('amount'))
        )) {
          return 'Government Budget'
        }
        
        // USA Spending indicators
        if (lowerColumns.some(col => 
          col.includes('award amount') || 
          (col.includes('awarding agency') && col.includes('recipient'))
        )) {
          return 'USA Spending'
        }
        
        // Unemployment indicators
        if (lowerColumns.some(col => 
          col.includes('unemployment rate') || col.includes('unemployment')
        )) {
          return 'Unemployment Rate'
        }
        
        // CDC Health indicators
        if (lowerColumns.some(col => 
          col.includes('health metric') || 
          (col.includes('metric') && (col.includes('death') || col.includes('birth') || col.includes('life expectancy')))
        )) {
          return 'CDC Health Data'
        }
        
        if (lowerColumns.some(col => 
          col.includes('patient') || col.includes('diagnosis') || 
          col.includes('treatment') || col.includes('medication') ||
          col.includes('department') && (col.includes('cardiology') || col.includes('orthopedic'))
        )) {
          return 'Medical Data'
        }
        if (lowerColumns.some(col => 
          col.includes('sales') || col.includes('revenue') || 
          col.includes('product') || col.includes('customer')
        )) {
          return 'Sales Data'
        }
        if (lowerColumns.some(col => 
          col.includes('student') || col.includes('school') || 
          col.includes('grade') || col.includes('attendance')
        )) {
          return 'Education Data'
        }
        if (lowerColumns.some(col => 
          col.includes('donation') || col.includes('fund') || 
          col.includes('amount') && col.includes('$')
        )) {
          return 'Financial Data'
        }
        return null
      }
      
      const domain = detectDomain(allColumns)
      if (domain) {
        setDashboardTitle(domain)
      } else if (sharedData.categoricalColumns && sharedData.categoricalColumns.length > 0) {
        const firstCategory = sharedData.categoricalColumns[0]
        const formattedTitle = firstCategory
          .split(/[\s_]+/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ')
        setDashboardTitle(`${formattedTitle} Analytics`)
      } else {
        setDashboardTitle('Analytics Dashboard')
      }
    }
    
    setLoading(false)
  }, [shareId])

  const applyChartFilter = (baseData) => {
    if (!baseData) return baseData
    if (!chartFilter) return baseData
    
    let result = [...baseData]
    
    if (chartFilter.type === 'category' && selectedCategorical) {
      result = result.filter((row) => row[selectedCategorical] === chartFilter.value)
    } else if (chartFilter.type === 'date' && selectedDate) {
      result = result.filter((row) => {
        const rowDate = new Date(row[selectedDate])
        const filterDate = new Date(chartFilter.value)
        return rowDate.toDateString() === filterDate.toDateString()
      })
    }
    
    return result
  }

  const handleFilterChange = (filters, filtered) => {
    const sidebarFiltered = filtered || data
    setSidebarFilteredData(sidebarFiltered)
    const result = applyChartFilter(sidebarFiltered)
    setFilteredData(result)
  }

  const handleChartFilter = (filter) => {
    setChartFilter(filter)
  }

  const clearChartFilter = () => {
    setChartFilter(null)
  }

  const handleColumnChange = (type, value) => {
    if (type === 'numeric') {
      setSelectedNumeric(value)
    } else if (type === 'categorical') {
      setSelectedCategorical(value)
    } else if (type === 'date') {
      setSelectedDate(value)
    }
  }

  const calculateStats = () => {
    if (!filteredData || !selectedNumeric) return null

    const values = filteredData
      .map((row) => parseFloat(row[selectedNumeric]))
      .filter((val) => !isNaN(val) && isFinite(val))

    if (values.length === 0) return null

    const sum = values.reduce((a, b) => a + b, 0)
    const avg = sum / values.length
    const min = Math.min(...values)
    const max = Math.max(...values)

    const mid = Math.floor(values.length / 2)
    let trend = 0
    if (mid > 0) {
      const firstHalf = values.slice(0, mid)
      const secondHalf = values.slice(mid)
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
      trend = firstAvg !== 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0
    }

    return { sum, avg, min, max, trend, column: selectedNumeric }
  }

  useEffect(() => {
    const baseData = sidebarFilteredData !== null ? sidebarFilteredData : data
    if (baseData) {
      const result = applyChartFilter(baseData)
      setFilteredData(result)
    }
  }, [chartFilter, selectedCategorical, selectedDate])

  const stats = calculateStats()
  const currentDate = new Date()
  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Loader />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-red-900 mb-2">Dashboard Not Found</h2>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Tab Navigation */}
      <TabNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        tabs={['Overview']}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {dashboardTitle}
            </h1>
            <p className="text-sm text-gray-600">
              {filteredData?.length || 0} records • {columns.length} columns
            </p>
            <p className="text-xs text-blue-600 font-medium mt-1">Shared Dashboard</p>
          </div>
          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            <button
              onClick={() => setDashboardView(dashboardView === 'advanced' ? 'simple' : 'advanced')}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors"
            >
              {dashboardView === 'advanced' ? 'Simple View' : 'Advanced View'}
            </button>
          </div>
        </div>

        {/* Active Filter Indicator */}
        {chartFilter && (
          <div className="mb-4 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3 animate-slide-up">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-blue-900">
                Filtered by: <span className="font-semibold">
                  {chartFilter.type === 'category' ? chartFilter.value : 
                   chartFilter.type === 'date' ? new Date(chartFilter.value).toLocaleDateString() : ''}
                </span>
              </span>
            </div>
            <button
              onClick={clearChartFilter}
              className="text-sm text-blue-700 hover:text-blue-900 font-medium px-3 py-1 rounded hover:bg-blue-100 transition-colors"
            >
              Clear Filter
            </button>
          </div>
        )}

        {/* Charts Section */}
        {dashboardView === 'advanced' ? (
          <AdvancedDashboard
            data={data}
            filteredData={filteredData}
            selectedNumeric={selectedNumeric}
            selectedCategorical={selectedCategorical}
            selectedDate={selectedDate}
            onChartFilter={handleChartFilter}
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
              onChartFilter={handleChartFilter}
              chartFilter={chartFilter}
            />

            {/* Metric Cards - Only in simple view */}
            <MetricCards
              data={filteredData}
              numericColumns={numericColumns}
              selectedNumeric={selectedNumeric}
              stats={stats}
            />
          </>
        )}

        {/* Filters and AI Insights */}
        <div className="mt-6 space-y-4">
          <details className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <summary className="cursor-pointer font-semibold text-gray-900 mb-4">
              Filters & AI Insights
            </summary>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
              <div className="lg:col-span-1">
                <Filters
                  data={data}
                  numericColumns={numericColumns}
                  categoricalColumns={categoricalColumns}
                  dateColumns={dateColumns}
                  onFilterChange={handleFilterChange}
                  selectedNumeric={selectedNumeric}
                  selectedCategorical={selectedCategorical}
                  selectedDate={selectedDate}
                  onColumnChange={handleColumnChange}
                />
              </div>
              <div className="lg:col-span-2">
                <button
                  onClick={() => navigate('/')}
                  className="mb-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm"
                >
                  Create Your Own Dashboard
                </button>
                <AIInsights 
                  data={filteredData} 
                  columns={columns} 
                  totalRows={data?.length || 0}
                  stats={stats}
                />
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}

export default SharedDashboard

