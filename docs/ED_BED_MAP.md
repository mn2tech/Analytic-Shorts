# ED Bed Map - Hospital Emergency Department Floor Map Dashboard

Interactive blueprint-style floor map for MedStar Montgomery Medical Center's Emergency Department. Rooms are color-coded by status and support hover tooltips and click-to-open detail panels.

## Route

- **Path:** `/ed-bed-map`
- **Component:** `src/pages/EDBedMapPage.tsx`

## Room ID Mapping (SVG ↔ Data)

The SVG floor map in `BlueprintMap.tsx` uses `id` attributes that must match the `id` field in room data:

| SVG ID        | Label              | Data ID   |
|---------------|--------------------|-----------|
| trauma1       | TRAUMA 1           | trauma1   |
| trauma2       | TRAUMA 2           | trauma2   |
| trauma3       | TRAUMA 3           | trauma3   |
| trauma4       | TRAUMA 4           | trauma4   |
| ct_xray       | CT/X-RAY           | ct_xray   |
| nurse_station | EMERGENCY NURSE STATION | nurse_station |
| er101         | ER 101             | er101     |
| er102         | ER 102             | er102     |
| er103         | ER 103             | er103     |
| er104         | ER 104             | er104     |
| er105         | ER 105             | er105     |
| er106         | ER 106             | er106     |
| triage1       | TRIAGE 1           | triage1   |
| triage2       | TRIAGE 2           | triage2   |
| registration  | REGISTRATION       | registration |
| waiting_room  | WAITING ROOM       | waiting_room |
| lab           | LAB                | lab       |
| consult       | CONSULT            | consult   |
| supply        | SUPPLY             | supply    |

## Replacing Mock Data with API / WebSocket

The app is structured for easy integration with live data:

1. **Data source:** `src/data/mockEdRooms.ts` exports `MOCK_ROOMS` and `mockRooms`. Replace the initial state in `EDBedMapPage.tsx` with a fetch or subscription.

2. **REST API example:**
   ```ts
   // In EDBedMapPage.tsx
   useEffect(() => {
     fetch('/api/ed/rooms')
       .then(res => res.json())
       .then(data => setRooms(data.rooms))
   }, [])
   ```

3. **WebSocket example:**
   ```ts
   useEffect(() => {
     const ws = new WebSocket('wss://.../ed-rooms')
     ws.onmessage = (e) => {
       const payload = JSON.parse(e.data)
       setRooms(payload.rooms)
       setLastUpdated(payload.timestamp ?? new Date().toISOString())
     }
     return () => ws.close()
   }, [])
   ```

4. **HL7 / FHIR / ADT:** Map incoming messages to `RoomData[]` and call `setRooms`. The `RoomData` type in `src/types/edRoom.ts` defines the expected shape.

## Components

- `BlueprintMap` – SVG floor map with room shapes and status fills
- `RoomTooltip` – Hover tooltip with room details
- `RoomDetailsPanel` – Side panel on room click
- `Legend` – Status color legend
- `SummaryCards` – Total / Occupied / Available / Dirty / Closed counts

## Status Colors

- **Occupied** – Red (transparent fill)
- **Available** – Green (transparent fill)
- **Dirty** – Yellow (transparent fill)
- **Closed** – Gray (transparent fill)
- **Critical** – Red alert icon in room corner
- **Isolation** – Purple ISO badge
