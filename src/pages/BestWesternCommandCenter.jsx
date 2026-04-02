import MotelCommandCenter from './MotelCommandCenter'
import {
  ROOM_OVERLAY_COORDINATES,
  BLUEPRINT_DEFAULT_WIDTH,
  BLUEPRINT_DEFAULT_HEIGHT,
} from '../config/bestWesternData'
import BestWesternDecisionPanel from '../components/BestWesternDecisionPanel'

const BW_TIMES = ['08:00', '10:00', '12:00', '14:00']
const BW_STATUS_SEQ = ['available', 'occupied', 'dirty', 'reserved']

function buildBestWesternTimeline() {
  return BW_TIMES.map((time, tIdx) => {
    const rooms = {}
    ROOM_OVERLAY_COORDINATES.forEach((room, rIdx) => {
      rooms[room.id] = BW_STATUS_SEQ[(rIdx + tIdx) % BW_STATUS_SEQ.length]
    })
    return { time, rooms }
  })
}

const bestWesternTimelineHistory = buildBestWesternTimeline()

export default function BestWesternCommandCenter() {
  return (
    <MotelCommandCenter
      brandName="Best Western Command Center"
      brandSubtitle="Blueprint operations map"
      brandIcon="🏨"
      storagePrefix="bestwestern-floormap"
      blueprintBaseName="best-western-blueprint.png"
      defaultRoomOverlays={ROOM_OVERLAY_COORDINATES}
      defaultBlueprintWidth={BLUEPRINT_DEFAULT_WIDTH}
      defaultBlueprintHeight={BLUEPRINT_DEFAULT_HEIGHT}
      showRoomNumbers={false}
      showStatusAbbrev={false}
      showStatusDot={false}
      roomFillOpacity={0.28}
      initialCommandCenterMode={true}
      timelineHistory={bestWesternTimelineHistory}
      timelineTimeOptions={BW_TIMES}
      SidePanelComponent={BestWesternDecisionPanel}
    />
  )
}
