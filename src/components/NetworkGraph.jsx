import { useMemo, useRef, useEffect, useState } from 'react'
// Import CSS for vis-network
import 'vis-network/styles/vis-network.css'

/**
 * NetworkGraph - Neural network-style visualization of prime contractors and their subcontractors
 * Used in the SubawardDrilldownModal
 */
function NetworkGraph({ data, primeRecipientName, onNodeClick }) {
  const containerRef = useRef(null)
  const networkRef = useRef(null)
  const [Network, setNetwork] = useState(null)
  const [loading, setLoading] = useState(true)

  // Dynamically load vis-network
  useEffect(() => {
    let cancelled = false

    // Import vis-network/standalone - Vite should handle this correctly
    import('vis-network/standalone')
      .then((module) => {
        if (cancelled) return
        
        console.log('NetworkGraph: vis-network/standalone module loaded')
        console.log('NetworkGraph: Module keys:', Object.keys(module))
        
        // The standalone build should export Network directly
        let NetworkComponent = null
        
        // Method 1: Named export Network (most likely)
        if (module.Network && typeof module.Network === 'function') {
          NetworkComponent = module.Network
          console.log('NetworkGraph: ✓ Found Network as named export')
        }
        // Method 2: Check if it's in a vis namespace
        else if (module.vis && module.vis.Network) {
          NetworkComponent = module.vis.Network
          console.log('NetworkGraph: ✓ Found Network in vis.Network')
        }
        // Method 3: Default export with Network property
        else if (module.default?.Network) {
          NetworkComponent = module.default.Network
          console.log('NetworkGraph: ✓ Found Network in default.Network')
        }
        // Method 4: Default export is Network itself
        else if (module.default && typeof module.default === 'function') {
          NetworkComponent = module.default
          console.log('NetworkGraph: ✓ Found Network as default export')
        }
        // Method 5: Check all enumerable properties
        else {
          for (const key of Object.keys(module)) {
            if (key.includes('Network') || key.includes('network')) {
              const value = module[key]
              if (typeof value === 'function' && value.prototype && value.prototype.setOptions) {
                NetworkComponent = value
                console.log(`NetworkGraph: ✓ Found Network as ${key}`)
                break
              }
            }
          }
        }

        if (NetworkComponent && typeof NetworkComponent === 'function') {
          console.log('NetworkGraph: ✓ Network component loaded successfully')
          setNetwork(() => NetworkComponent)
        } else {
          console.error('NetworkGraph: ✗ Network component not found')
          throw new Error('Network constructor not found. Check console for module structure.')
        }
      })
      .catch((e) => {
        if (cancelled) return
        
        console.warn('NetworkGraph: Failed to load vis-network/standalone, trying fallback:', e.message)
        
        // Fallback: Try regular vis-network import
        return import('vis-network')
          .then((module) => {
            if (cancelled) return
            
            console.log('NetworkGraph: Fallback import successful. Keys:', Object.keys(module))
            const NetworkComponent = module.Network || module.default?.Network || module.default
            
            if (NetworkComponent && typeof NetworkComponent === 'function') {
              console.log('NetworkGraph: ✓ Network component found in fallback')
              setNetwork(() => NetworkComponent)
            } else {
              throw new Error('Network constructor not found in fallback import')
            }
          })
          .catch((e2) => {
            if (cancelled) return
            console.error('NetworkGraph: ✗ Both imports failed:', e2)
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

  // Transform data into graph structure
  const graphData = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return { nodes: [], links: [] }
    }

    // Create nodes and links
    const nodesMap = new Map()
    const links = []

    // Add prime contractor as central node
    if (primeRecipientName) {
      nodesMap.set(primeRecipientName, {
        id: primeRecipientName,
        name: primeRecipientName,
        type: 'prime',
        size: 20,
        color: '#ef4444', // Red for prime contractor
      })
    }

    // Process subaward data
    data.forEach((row) => {
      const primeId = row['Prime Award ID'] || ''
      const subName = row['Subcontractor Name'] || 'Unknown'
      const subAmount = parseFloat(row['Subaward Amount'] || 0)

      // Add subcontractor node
      if (!nodesMap.has(subName)) {
        nodesMap.set(subName, {
          id: subName,
          name: subName,
          type: 'subcontractor',
          size: Math.max(5, Math.min(15, Math.sqrt(subAmount) / 100000)), // Size based on amount
          color: '#3b82f6', // Blue for subcontractors
          amount: subAmount,
        })
      } else {
        // Aggregate amounts if same subcontractor appears multiple times
        const existing = nodesMap.get(subName)
        existing.amount = (existing.amount || 0) + subAmount
        existing.size = Math.max(5, Math.min(15, Math.sqrt(existing.amount) / 100000))
      }

      // Create link from prime to subcontractor
      if (primeRecipientName && subName) {
        links.push({
          source: primeRecipientName,
          target: subName,
          value: subAmount,
          primeAwardId: primeId,
        })
      }
    })

    return {
      nodes: Array.from(nodesMap.values()),
      links: links,
    }
  }, [data, primeRecipientName])

  // Transform to vis-network format
  const visData = useMemo(() => {
    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
      return { nodes: [], edges: [] }
    }

    const nodes = graphData.nodes.map((node) => ({
      id: node.id,
      label: node.name.length > 25 ? node.name.substring(0, 25) + '...' : node.name,
      title: `${node.name}${node.amount ? `\n$${node.amount.toLocaleString()}` : ''}`,
      color: {
        background: node.color || '#3b82f6',
        border: node.color || '#3b82f6',
        highlight: {
          background: node.color || '#3b82f6',
          border: '#000000'
        }
      },
      size: node.size || 15,
      font: {
        size: 12,
        color: '#333333'
      },
      shape: 'dot',
      borderWidth: node.type === 'prime' ? 3 : 2,
      _originalData: node
    }))

    const edges = graphData.links.map((link, index) => ({
      id: `edge-${index}`,
      from: typeof link.source === 'object' ? link.source.id : link.source,
      to: typeof link.target === 'object' ? link.target.id : link.target,
      value: link.value || 1,
      width: Math.max(1, Math.min(4, Math.sqrt(link.value || 0) / 5000000)),
      color: {
        color: 'rgba(107, 114, 128, 0.4)',
        highlight: 'rgba(59, 130, 246, 0.8)'
      },
      arrows: {
        to: {
          enabled: true,
          scaleFactor: 0.6
        }
      },
      smooth: {
        type: 'curvedCW',
        roundness: 0.15
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
        shape: 'dot',
        font: {
          size: 12
        },
        borderWidth: 2,
        shadow: true
      },
      edges: {
        width: 2,
        shadow: true,
        smooth: {
          type: 'curvedCW',
          roundness: 0.15
        }
      },
      physics: {
        enabled: true,
        stabilization: {
          enabled: true,
          iterations: 100,
          fit: true
        },
        barnesHut: {
          gravitationalConstant: -1500,
          centralGravity: 0.1,
          springLength: 150,
          springConstant: 0.04,
          damping: 0.09
        }
      },
      interaction: {
        hover: true,
        tooltipDelay: 100,
        zoomView: true,
        dragView: true
      }
    }

    const network = new Network(containerRef.current, visData, options)

    // Handle node click
    network.on('click', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0]
        const node = visData.nodes.find(n => n.id === nodeId)
        if (node && node._originalData && onNodeClick) {
          onNodeClick(node._originalData)
        }
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

  if (loading || !Network) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <p className="text-sm">{loading ? 'Loading network visualization...' : 'Network library unavailable'}</p>
        </div>
      </div>
    )
  }

  if (!graphData.nodes.length) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-sm">No network data available</p>
          <p className="text-xs text-gray-400 mt-1">Load subaward data to visualize the network</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-96 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden relative">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* Legend */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-gray-200 text-xs">
        <div className="font-semibold mb-2 text-gray-700">Legend</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-gray-600">Prime Contractor</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-gray-600">Subcontractors</span>
          </div>
          <div className="text-gray-500 mt-2 pt-2 border-t border-gray-200">
            Node size = Award amount
          </div>
        </div>
      </div>
    </div>
  )
}

export default NetworkGraph

