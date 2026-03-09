import { useState, useCallback } from 'react'
import { Header } from './components/Header'
import { ImageUpload } from './components/ImageUpload'
import { FloorPlanCanvas } from './components/FloorPlanCanvas'
import { RoomEditor } from './components/RoomEditor'
import { Toolbar } from './components/Toolbar'
import { useFloorMap } from './hooks/useFloorMap'
import { api } from './api/client'

export default function App() {
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
      const result = await api.uploadFloorplan(file)
      setFloorPlanImage(result)
      setImageDimensions({ width: result.width, height: result.height })
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
      const res = await api.detectRooms({
        file_id: floorPlanImage.file_id,
        image_width: imageDimensions.width || floorPlanImage.width,
        image_height: imageDimensions.height || floorPlanImage.height,
      })
      setRooms(res.rooms || [])
    } catch (err) {
      console.error('Room detection failed:', err)
      alert('Room detection failed. Check console for details.')
    } finally {
      setIsDetecting(false)
    }
  }, [floorPlanImage?.file_id, floorPlanImage?.width, floorPlanImage?.height, imageDimensions, setRooms])

  const handleExport = useCallback(async () => {
    if (!floorPlanImage?.file_id || rooms.length === 0) {
      alert('Upload a floor plan and add at least one room before exporting.')
      return
    }
    setIsExporting(true)
    try {
      const res = await api.exportMap({
        file_id: floorPlanImage.file_id,
        rooms,
        save_to_file: false,
      })
      const blob = new Blob([JSON.stringify(res.map || res, null, 2)], {
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
  }, [floorPlanImage?.file_id, rooms])

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
          <RoomEditor
            room={selectedRoom}
            rooms={rooms}
            onUpdate={updateRoom}
            onDelete={deleteRoom}
            onSelect={setSelectedRoomId}
          />
        )}
      </main>
    </div>
  )
}
