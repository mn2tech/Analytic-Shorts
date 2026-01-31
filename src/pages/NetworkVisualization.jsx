import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Loader from '../components/Loader'
import FullNetworkGraph from '../components/FullNetworkGraph'
import apiClient from '../config/api'

function NetworkVisualization() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState(null)
  const [subawardData, setSubawardData] = useState(null)
  const [loadingSubawards, setLoadingSubawards] = useState(false)
  const [viewMode, setViewMode] = useState('network') // 'network' or 'details'
  const graphRef = useRef(null)

  // Load data from sessionStorage
  useEffect(() => {
    const storedData = sessionStorage.getItem('analyticsData')
    if (!storedData) {
      navigate('/')
      return
    }

    try {
      const parsed = JSON.parse(storedData)
      if (parsed && parsed.data && Array.isArray(parsed.data)) {
        setData(parsed)
      } else {
        navigate('/')
      }
    } catch (error) {
      console.error('Error parsing stored data:', error)
      navigate('/')
    } finally {
      setLoading(false)
    }
  }, [navigate])

  // Check if data is suitable for network visualization
  const isNetworkDataSuitable = useMemo(() => {
    if (!data || !data.data || !data.data.length) {
      console.log('NetworkVisualization: No data available')
      return false
    }
    
    // Check all possible column sources
    const allColumns = [
      ...(data.columns || []),
      ...(data.categoricalColumns || []),
      ...(data.data[0] ? Object.keys(data.data[0]) : [])
    ]
    
    // Check if we have recipient/contractor columns (case-insensitive)
    const hasRecipientColumn = allColumns.some(col => {
      const colLower = String(col).toLowerCase()
      return colLower.includes('recipient') || 
             colLower.includes('contractor') ||
             colLower.includes('company') ||
             colLower === 'recipient name' ||
             colLower === 'prime contractor'
    })
    
    console.log('NetworkVisualization: Data suitability check', {
      hasData: !!data?.data?.length,
      allColumns: allColumns.slice(0, 10), // First 10 columns
      hasRecipientColumn,
      categoricalColumns: data.categoricalColumns,
      columns: data.columns
    })
    
    return hasRecipientColumn
  }, [data])

  // Build network graph data from the main dataset
  const networkData = useMemo(() => {
    if (!data || !data.data || !data.data.length) {
      return { nodes: [], links: [] }
    }

    // If data is not suitable for network visualization, return empty
    if (!isNetworkDataSuitable) {
      return { nodes: [], links: [] }
    }

    try {
      const nodesMap = new Map()
      const links = []
      const recipientColumn = data.categoricalColumns?.find(col => 
        col.toLowerCase().includes('recipient') || 
        col.toLowerCase().includes('contractor') ||
        col.toLowerCase().includes('company')
      ) || 'Recipient Name'

    // Group by recipient to find prime contractors
    const recipientGroups = new Map()
    data.data.forEach((row) => {
      const recipientName = row[recipientColumn] || 'Unknown'
      if (!recipientGroups.has(recipientName)) {
        recipientGroups.set(recipientName, {
          name: recipientName,
          awardIds: [],
          totalAmount: 0,
          awardCount: 0
        })
      }
      const group = recipientGroups.get(recipientName)
      const awardId = row['Award ID'] || row['AwardID'] || ''
      const amount = parseFloat(row[data.numericColumns?.[0]] || 0)
      
      if (awardId) group.awardIds.push(awardId)
      group.totalAmount += amount
      group.awardCount += 1
    })

    // Create nodes for prime contractors
    recipientGroups.forEach((group, name) => {
      nodesMap.set(name, {
        id: name,
        name: name,
        type: 'prime',
        size: Math.max(10, Math.min(30, Math.sqrt(group.totalAmount) / 50000000)),
        color: '#ef4444',
        totalAmount: group.totalAmount,
        awardCount: group.awardCount,
        awardIds: group.awardIds
      })
    })

    const result = {
      nodes: Array.from(nodesMap.values()),
      links: links
    }
    
    console.log('NetworkVisualization: Network data built', {
      nodeCount: result.nodes.length,
      linkCount: result.links.length,
      recipientColumn,
      recipientGroupsCount: recipientGroups.size
    })

    return result
    } catch (error) {
      console.error('Error building network data:', error)
      return { nodes: [], links: [] }
    }
  }, [data, isNetworkDataSuitable])

  // Load subawards when a node is clicked
  const handleNodeClick = async (node) => {
    if (!node || node.type !== 'prime') return
    
    setSelectedNode(node)
    setLoadingSubawards(true)
    // Don't switch to details view immediately - keep network view to show expanded network
    
    try {
      const awardIds = (node.awardIds || []).slice(0, 10).join(',')
      if (!awardIds) {
        console.warn('No award IDs available for node:', node.name)
        setSubawardData({ data: [], rowCount: 0 })
        setLoadingSubawards(false)
        // Switch to details view to show message
        setViewMode('details')
        return
      }

      console.log('Loading subawards for:', node.name, 'Award IDs:', awardIds)
      const resp = await apiClient.get('/api/example/usaspending/subawards', {
        params: { award_ids: awardIds, limit: 200 },
        timeout: 30000,
      })
      
      console.log('Subawards loaded:', resp.data?.data?.length || 0, 'records')
      setSubawardData(resp.data)
      
      // If we have subcontractors, show them in the network view
      if (resp.data?.data && resp.data.data.length > 0) {
        setViewMode('network') // Show expanded network with subcontractors
      } else {
        setViewMode('details') // Show details panel with "no subcontractors" message
      }
    } catch (e) {
      console.error('Error loading subawards:', e)
      setSubawardData({ data: [], rowCount: 0, error: e.message })
      setViewMode('details') // Show error in details panel
    } finally {
      setLoadingSubawards(false)
    }
  }

  // Build expanded network with subcontractors
  const expandedNetworkData = useMemo(() => {
    if (!selectedNode || !subawardData || !subawardData.data || subawardData.data.length === 0) {
      return networkData
    }

    const nodes = [...networkData.nodes]
    const links = [...networkData.links]
    const primeName = selectedNode.name

    // Add subcontractor nodes
    subawardData.data.forEach((row) => {
      const subName = row['Subcontractor Name'] || 'Unknown'
      const subAmount = parseFloat(row['Subaward Amount'] || 0)
      
      // Check if node already exists
      let subNode = nodes.find(n => n.id === subName)
      if (!subNode) {
        subNode = {
          id: subName,
          name: subName,
          type: 'subcontractor',
          size: Math.max(5, Math.min(15, Math.sqrt(subAmount) / 100000)),
          color: '#3b82f6',
          amount: subAmount
        }
        nodes.push(subNode)
      } else {
        // Aggregate if exists
        subNode.amount = (subNode.amount || 0) + subAmount
        subNode.size = Math.max(5, Math.min(15, Math.sqrt(subNode.amount) / 100000))
      }

      // Add link from prime to subcontractor
      if (!links.find(l => l.source === primeName && l.target === subName)) {
        links.push({
          source: primeName,
          target: subName,
          value: subAmount
        })
      }
    })

    return { nodes, links }
  }, [networkData, selectedNode, subawardData])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Loader />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">No Data Available</h1>
            <p className="text-gray-600 mb-6">Please load a dataset first.</p>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show expanded network when we have subcontractor data, so users can see the relationships
  // This works in both 'network' and 'details' view modes
  const currentNetworkData = selectedNode && subawardData && subawardData.data && subawardData.data.length > 0
    ? expandedNetworkData
    : networkData

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Network Visualization</h1>
              <p className="text-sm text-gray-600 mt-1">
                Interactive network graph showing relationships between prime contractors and subcontractors
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Back to Dashboard
              </button>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('network')}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    viewMode === 'network'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Network
                </button>
                <button
                  onClick={() => setViewMode('details')}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    viewMode === 'details'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  disabled={!selectedNode}
                >
                  Details
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Network Graph - Takes 2/3 width */}
          <div className={`${viewMode === 'network' ? 'lg:col-span-2' : 'lg:col-span-1'}`}>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Contractor Network</h2>
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span>Prime Contractors ({currentNetworkData.nodes.filter(n => n.type === 'prime').length})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span>Subcontractors ({currentNetworkData.nodes.filter(n => n.type === 'subcontractor').length})</span>
                  </div>
                </div>
              </div>
              
              {!isNetworkDataSuitable ? (
                <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200" style={{ height: '600px' }}>
                  <div className="text-center text-gray-500 max-w-md px-4">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <p className="text-sm font-medium text-gray-900 mb-2">Network visualization not available</p>
                    <p className="text-xs text-gray-600 mb-4">
                      This dataset doesn't contain relationship data (contractors, recipients, companies) needed for network visualization.
                    </p>
                    <p className="text-xs text-gray-500">
                      Network view works best with datasets that have entity relationships, such as USA Spending data with contractors and subcontractors.
                    </p>
                  </div>
                </div>
              ) : (
                <FullNetworkGraph
                  graphData={currentNetworkData}
                  onNodeClick={handleNodeClick}
                  height={600}
                />
              )}
            </div>
          </div>

          {/* Details Panel - Takes 1/3 width when visible */}
          {viewMode === 'details' && selectedNode && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sticky top-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Details</h2>
                  <button
                    onClick={() => {
                      setSelectedNode(null)
                      setSubawardData(null)
                      setViewMode('network')
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Prime Contractor Info */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 rounded-full bg-red-500"></div>
                    <h3 className="font-semibold text-gray-900">{selectedNode.name}</h3>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Total Amount: ${(selectedNode.totalAmount || 0).toLocaleString()}</div>
                    <div>Awards: {selectedNode.awardCount || 0}</div>
                    <div>Award IDs: {selectedNode.awardIds?.length || 0}</div>
                  </div>
                </div>

                {/* Subawards List */}
                {loadingSubawards ? (
                  <div className="text-sm text-gray-600">Loading subcontractors...</div>
                ) : subawardData && subawardData.data && subawardData.data.length > 0 ? (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Subcontractors ({subawardData.data.length})
                    </h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {subawardData.data.slice(0, 50).map((row, idx) => (
                        <div key={idx} className="p-2 bg-gray-50 rounded border border-gray-200">
                          <div className="font-medium text-sm text-gray-900">
                            {row['Subcontractor Name']}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            ${parseFloat(row['Subaward Amount'] || 0).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">
                    No subawards found for this contractor.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default NetworkVisualization

