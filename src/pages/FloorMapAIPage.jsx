/**
 * FloorMap AI - Floor plan room detection and ER bed map export.
 * Integrated into NM2-Analytics-Shorts; uses separate FastAPI backend.
 */
import { useState, useCallback } from 'react'
import Header from '../components/floormap/Header'
import ImageUpload from '../components/floormap/ImageUpload'
import { FloorPlanCanvas } from '../components/floormap/FloorPlanCanvas'
import RoomEditor from '../components/floormap/RoomEditor'
import Toolbar from '../components/floormap/Toolbar'
import { useFloorMap } from '../hooks/useFloorMap'
import { floormapApi } from '../api/floormapClient'

export default function FloorMapAIPage() {
  const {
    floorPlanImage,
    rooms,
    selectedRoomId,
    setFloorPlanImage,
    setRooms,
    setSelectedRoomId,
    addRoom,
    updateRoom,
    deleteRoom,
    clearAll,
  } = useFloorMap()

  const [isDetecting, setIsDetecting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })

  const handleImageUpload = useCallback(
    async (file) => {
      try {
        const result = await floormapApi.uploadFloorplan(file)
        setFloorPlanImage(result)
        setImageDimensions({ width: result.width, height: result.height })
      } catch (err) {
        const isProd = import.meta.env.PROD
        const hasBackendUrl = !!(import.meta.env.VITE_FLOORMAP_API_URL || '').trim()
        if (isProd && !hasBackendUrl) {
          throw new Error(
            'FloorMap AI backend is not available in production. ' +
            'Deploy the backend-floormap service and set VITE_FLOORMAP_API_URL in your build environment.'
          )
        }
        throw err
      }
    },
    [setFloorPlanImage]
  )

  const handleImageLoad = useCallback((img) => {
    if (img) {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight })
    }
  }, [])

  const handleDetectRooms = useCallback(async () => {
    if (!floorPlanImage?.file_id) return
    setIsDetecting(true)
    try {
      const res = await floormapApi.detectRooms({
        file_id: floorPlanImage.file_id,
        image_width: imageDimensions.width || floorPlanImage.width,
        image_height: imageDimensions.height || floorPlanImage.height,
      })
      const detected = res.rooms || []
      setRooms(detected)
      if (detected.length === 0) {
        alert('No rooms detected. Try adding rooms manually with "+ Add Room" or double-click on the floor plan.')
      }
    } catch (err) {
      console.error('Room detection failed:', err)
      alert('Room detection failed: ' + (err.message || 'Check console for details.'))
    } finally {
      setIsDetecting(false)
    }
  }, [floorPlanImage?.file_id, floorPlanImage?.width, floorPlanImage?.height, imageDimensions, setRooms])

  const handleImportJson = useCallback((importedRooms) => {
    setRooms(importedRooms)
    if (importedRooms.length > 0) {
      setSelectedRoomId(importedRooms[0].room_id)
    }
  }, [setRooms, setSelectedRoomId])

  const handleExport = useCallback(async () => {
    if (!floorPlanImage?.file_id || rooms.length === 0) {
      alert('Upload a floor plan and add at least one room before exporting.')
      return
    }
    setIsExporting(true)
    try {
      const res = await floormapApi.exportMap({
        file_id: floorPlanImage.file_id,
        rooms,
        save_to_file: false,
      })
      const w = imageDimensions.width || floorPlanImage.width
      const h = imageDimensions.height || floorPlanImage.height
      const exportData = { ...(res.map || res), image_width: w, image_height: h }
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `floor-map-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
      alert('Export failed. Check console for details.')
    } finally {
      setIsExporting(false)
    }
  }, [floorPlanImage?.file_id, floorPlanImage?.width, floorPlanImage?.height, imageDimensions, rooms])

  const selectedRoom = rooms.find((r) => r.room_id === selectedRoomId)

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="flex-1 flex flex-col min-h-0">
          <Toolbar
            onDetectRooms={handleDetectRooms}
            onExport={handleExport}
            onAddRoom={addRoom}
            onClearAll={clearAll}
            onImportJson={handleImportJson}
            isDetecting={isDetecting}
            isExporting={isExporting}
            hasImage={!!floorPlanImage}
            hasRooms={rooms.length > 0}
          />
          <div className="flex-1 flex overflow-hidden">
            {floorPlanImage ? (
              <FloorPlanCanvas
                imageUrl={floorPlanImage.url}
                rooms={rooms}
                selectedRoomId={selectedRoomId}
                onSelectRoom={setSelectedRoomId}
                onUpdateRoom={updateRoom}
                onAddRoom={addRoom}
                onImageLoad={handleImageLoad}
                imageDimensions={imageDimensions}
              />
            ) : (
              <ImageUpload onUpload={handleImageUpload} />
            )}
          </div>
        </div>
        {floorPlanImage && (
          <aside className="w-72 shrink-0 border-l border-slate-200 bg-white p-4 overflow-y-auto">
            <RoomEditor
              room={selectedRoom}
              rooms={rooms}
              onUpdate={updateRoom}
              onDelete={deleteRoom}
              onSelect={setSelectedRoomId}
            />
          </aside>
        )}
      </main>
    </div>
  )
}
