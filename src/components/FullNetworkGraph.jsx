import { useMemo, useRef, useEffect, useState } from 'react'
// Import CSS for vis-network
import 'vis-network/styles/vis-network.css'

/**
 * FullNetworkGraph - Full-page network visualization component
 * Similar to SAS Visual Investigator - shows relationships between entities
 * Uses vis-network for reliable, interactive network graphs
 */
function FullNetworkGraph({ graphData, onNodeClick, height = 600 }) {
  const containerRef = useRef(null)
  const networkRef = useRef(null)
  const [Network, setNetwork] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Dynamically load vis-network
  useEffect(() => {
    let cancelled = false

    // Import vis-network/standalone - Vite should handle this correctly
    import('vis-network/standalone')
      .then((module) => {
        if (cancelled) return
        
        console.log('vis-network/standalone module loaded')
        console.log('Module keys:', Object.keys(module))
        console.log('Module structure:', {
          hasNetwork: !!module.Network,
          hasDefault: !!module.default,
          defaultType: typeof module.default,
          allKeys: Object.keys(module),
          moduleType: typeof module
        })
        
        // The standalone build should export Network directly
        // According to vis-network docs, it exports { Network, DataSet }
        let NetworkComponent = null
        
        // Method 1: Named export Network (most likely)
        if (module.Network && typeof module.Network === 'function') {
          NetworkComponent = module.Network
          console.log('✓ Found Network as named export')
        }
        // Method 2: Check if it's in a vis namespace
        else if (module.vis && module.vis.Network) {
          NetworkComponent = module.vis.Network
          console.log('✓ Found Network in vis.Network')
        }
        // Method 3: Default export with Network property
        else if (module.default?.Network) {
          NetworkComponent = module.default.Network
          console.log('✓ Found Network in default.Network')
        }
        // Method 4: Default export is Network itself
        else if (module.default && typeof module.default === 'function') {
          NetworkComponent = module.default
          console.log('✓ Found Network as default export')
        }
        // Method 5: Check all enumerable properties
        else {
          for (const key of Object.keys(module)) {
            if (key.includes('Network') || key.includes('network')) {
              const value = module[key]
              if (typeof value === 'function' && value.prototype && value.prototype.setOptions) {
                NetworkComponent = value
                console.log(`✓ Found Network as ${key}`)
                break
              }
            }
          }
        }

        if (NetworkComponent && typeof NetworkComponent === 'function') {
          // Verify it's actually the Network class by checking for expected methods
          if (NetworkComponent.prototype && typeof NetworkComponent.prototype.setOptions === 'function') {
            console.log('✓ Network component loaded successfully and verified')
            setNetwork(() => NetworkComponent)
            setError(null)
          } else {
            console.warn('⚠ Found function but it might not be Network class')
            // Still try to use it
            setNetwork(() => NetworkComponent)
            setError(null)
          }
        } else {
          console.error('✗ Network component not found.')
          console.error('Module keys:', Object.keys(module))
          console.error('Module has Network:', !!module.Network, typeof module.Network)
          console.error('Module has default:', !!module.default, typeof module.default)
          // Try to log module structure safely
          try {
            const moduleInfo = {
              keys: Object.keys(module),
              hasNetwork: !!module.Network,
              networkType: typeof module.Network,
              hasDefault: !!module.default,
              defaultType: typeof module.default
            }
            console.error('Module info:', moduleInfo)
          } catch (e) {
            console.error('Could not serialize module info:', e)
          }
          throw new Error('Network constructor not found. Check console for module structure.')
        }
      })
      .catch((e) => {
        if (cancelled) return
        
        console.warn('Failed to load vis-network/standalone, trying fallback:', e.message)
        
        // Fallback: Try regular vis-network import
        return import('vis-network')
          .then((module) => {
            if (cancelled) return
            
            console.log('Fallback import successful. Keys:', Object.keys(module))
            const NetworkComponent = module.Network || module.default?.Network || module.default
            
            if (NetworkComponent && typeof NetworkComponent === 'function') {
              console.log('✓ Network component found in fallback')
              setNetwork(() => NetworkComponent)
              setError(null)
            } else {
              throw new Error('Network constructor not found in fallback import')
            }
          })
          .catch((e2) => {
            if (cancelled) return
            console.error('✗ Both imports failed:', e2)
            setError('Failed to load vis-network library. Please refresh the page.')
          })
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Transform graph data to vis-network format
  const visData = useMemo(() => {
    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
      return { nodes: [], edges: [] }
    }

    const nodes = graphData.nodes.map((node) => {
      // Truncate long names for better display
      const displayName = node.name.length > 20 ? node.name.substring(0, 20) + '...' : node.name
      
      return {
        id: node.id,
        label: displayName, // Show company name as label
        title: `${node.name}\n${node.totalAmount ? `Total: $${node.totalAmount.toLocaleString()}` : ''}\n${node.amount ? `Amount: $${node.amount.toLocaleString()}` : ''}\n${node.type === 'prime' ? 'Click to see subcontractors' : 'Subcontractor'}`,
        color: {
          background: node.color || '#3b82f6',
          border: node.color || '#3b82f6',
          highlight: {
            background: node.color || '#3b82f6',
            border: '#000000'
          }
        },
        // For box shape, we need to set width and height separately
        // Size will be calculated based on label length
        widthConstraint: node.type === 'prime' ? { minimum: 120, maximum: 200 } : false,
        heightConstraint: node.type === 'prime' ? { minimum: 30, maximum: 50 } : false,
        // Make nodes larger to accommodate text labels
        size: node.type === 'prime' ? 150 : Math.max(30, node.size || 30),
        font: {
          size: node.type === 'prime' ? 12 : 10, // Font size for labels
          color: node.type === 'prime' ? '#FFFFFF' : '#333333', // White text on red nodes, dark on blue
          face: 'Arial',
          bold: node.type === 'prime' ? true : false, // Bold for prime contractors
          strokeWidth: node.type === 'prime' ? 3 : 1, // Stroke for better text visibility
          strokeColor: node.type === 'prime' ? '#000000' : '#FFFFFF' // Black stroke on white text
        },
        shape: node.type === 'prime' ? 'box' : 'dot', // Use box shape for prime contractors to show labels
        borderWidth: node.type === 'prime' ? 3 : 2,
        _originalData: node // Store original node data for click handler
      }
    })

    const edges = graphData.links.map((link, index) => ({
      id: `edge-${index}`,
      from: typeof link.source === 'object' ? link.source.id : link.source,
      to: typeof link.target === 'object' ? link.target.id : link.target,
      value: link.value || 1,
      width: Math.max(1, Math.min(5, Math.sqrt(link.value || 0) / 5000000)),
      color: {
        color: 'rgba(107, 114, 128, 0.4)',
        highlight: 'rgba(59, 130, 246, 0.8)'
      },
      arrows: {
        to: {
          enabled: true,
          scaleFactor: 0.8
        }
      },
      smooth: {
        type: 'curvedCW',
        roundness: 0.2
      }
    }))

    return { nodes, edges }
  }, [graphData])

  // Initialize network
  useEffect(() => {
    if (!containerRef.current || visData.nodes.length === 0 || !Network) return

    try {
      const options = {
        nodes: {
        shape: 'box', // Default to box (prime contractors will use box, subcontractors can override)
        font: {
          size: 12,
          face: 'Arial',
          align: 'center',
          multi: false
        },
        borderWidth: 2,
        shadow: true,
        labelHighlightBold: true,
        // Ensure labels are always visible and don't scale down too much
        scaling: {
          label: {
            enabled: true,
            min: 10,
            max: 14
          }
        },
        chosen: {
          node: (values, id, selected, hovering) => {
            if (selected || hovering) {
              values.font = { ...values.font, size: 14, bold: true }
            }
          }
        }
      },
      edges: {
        width: 2,
        shadow: true,
        smooth: {
          type: 'curvedCW',
          roundness: 0.2
        }
      },
      physics: {
        enabled: true,
        stabilization: {
          enabled: true,
          iterations: 200,
          fit: true
        },
        barnesHut: {
          gravitationalConstant: -2000,
          centralGravity: 0.1,
          springLength: 200,
          springConstant: 0.04,
          damping: 0.09,
          avoidOverlap: 0.5
        }
      },
      interaction: {
        hover: true,
        tooltipDelay: 100,
        zoomView: true,
        dragView: true,
        selectConnectedEdges: false
      },
      layout: {
        improvedLayout: true,
        hierarchical: {
          enabled: false
        }
      }
    }

    const network = new Network(containerRef.current, visData, options)
    
    // Debug: Log node data to verify labels are set
    console.log('Network initialized with nodes:', visData.nodes.length)
    console.log('Sample node:', visData.nodes[0])
    console.log('Sample node label:', visData.nodes[0]?.label)

    // Handle node click
    network.on('click', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0]
        const visNode = visData.nodes.find(n => n.id === nodeId)
        if (visNode) {
          // Get original data from stored reference or find in graphData
          const originalNode = visNode._originalData || graphData.nodes.find(n => n.id === nodeId)
          if (originalNode && onNodeClick) {
            console.log('Node clicked:', originalNode.name, 'Type:', originalNode.type, 'Has awardIds:', !!originalNode.awardIds)
            onNodeClick(originalNode)
          } else {
            console.warn('Could not find original node data for clicked node:', nodeId, 'visNode:', visNode)
          }
        }
      }
    })

    // Handle double click to zoom
    network.on('doubleClick', (params) => {
      if (params.nodes.length > 0) {
        network.focus(params.nodes[0], {
          scale: 1.5,
          animation: true
        })
      }
    })

    networkRef.current = network

      // Cleanup
      return () => {
        if (networkRef.current) {
          try {
            networkRef.current.destroy()
          } catch (e) {
            console.warn('Error destroying network:', e)
          }
          networkRef.current = null
        }
      }
    } catch (error) {
      console.error('Error initializing network graph:', error)
    }
  }, [visData, onNodeClick, Network])

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200" style={{ height: `${height}px` }}>
        <div className="text-center text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <p className="text-sm">Loading network visualization...</p>
          <p className="text-xs text-gray-400 mt-1">Initializing vis-network library</p>
        </div>
      </div>
    )
  }

  if (error || !Network) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200" style={{ height: `${height}px` }}>
        <div className="text-center text-gray-500 max-w-md">
          <svg className="w-16 h-16 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium text-red-600 mb-2">Network library unavailable</p>
          <p className="text-xs text-gray-500 mb-4">{error || 'Failed to load vis-network library'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            Refresh Page
          </button>
          <p className="text-xs text-gray-400 mt-2">Check browser console for details</p>
        </div>
      </div>
    )
  }

  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200" style={{ height: `${height}px` }}>
        <div className="text-center text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-sm">No network data available</p>
          <p className="text-xs text-gray-400 mt-1">Click on a prime contractor to explore their network</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-gray-50 rounded-lg border border-gray-200 overflow-hidden relative" style={{ height: `${height}px` }}>
      <div ref={containerRef} className="w-full h-full" />
      
      {/* Legend */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-gray-200 text-xs">
        <div className="font-semibold mb-2 text-gray-700">Legend</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-gray-600">Prime Contractors ({visData.nodes.filter(n => n._originalData?.type === 'prime').length})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-gray-600">Subcontractors ({visData.nodes.filter(n => n._originalData?.type === 'subcontractor').length})</span>
          </div>
          <div className="text-gray-500 mt-2 pt-2 border-t border-gray-200">
            Node size = Award amount
          </div>
        </div>
      </div>
      
      {/* Controls */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-gray-200 text-xs">
        <div className="font-semibold mb-2 text-gray-700">Controls</div>
        <div className="space-y-1 text-gray-600">
          <div>• Click node to drill down</div>
          <div>• Drag to pan</div>
          <div>• Scroll to zoom</div>
          <div>• Double-click to focus</div>
        </div>
      </div>
    </div>
  )
}

export default FullNetworkGraph

