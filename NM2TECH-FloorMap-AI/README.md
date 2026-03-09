# NM2TECH FloorMap AI

Healthcare operations floor plan room detection and ER bed map export. Upload a hospital floor plan image, detect room boxes with OpenCV, edit labels and coordinates, and export JSON for ER bed map applications.

## Features

- **Image upload** – Drag-and-drop or click to upload floor plan images (PNG, JPEG)
- **AI room detection** – OpenCV contour-based detection of room-like regions
- **Interactive canvas** – Zoom, pan, and overlay room rectangles on the floor plan
- **Draggable center points** – Adjust room positions by dragging center markers
- **Room editor** – Edit labels, type, status, and coordinates in a side panel
- **Manual add/edit/delete** – Add rooms by double-clicking or toolbar; edit or delete via side panel
- **Export JSON** – Download the final map in the ER bed map schema

## Room JSON Structure

```json
{
  "room_id": "ROOM_001",
  "label": "Room 1",
  "type": "patient_room",
  "status": "available",
  "bbox": { "x": 120, "y": 240, "width": 80, "height": 60 },
  "center": { "x": 160, "y": 270 },
  "polygon": [[120,240],[200,240],[200,300],[120,300]]
}
```

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+
- OpenCV (`pip install opencv-python`)

### Backend (FastAPI)

```bash
cd NM2TECH-FloorMap-AI/backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend (React + Vite)

```bash
cd NM2TECH-FloorMap-AI/frontend
npm install
npm run dev
```

Open http://localhost:5174 (or the port shown in the terminal).

### Run Both

From the project root:

```bash
# Terminal 1 - Backend
cd backend && pip install -r requirements.txt && uvicorn main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend && npm install && npm run dev
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload-floorplan` | Upload floor plan image |
| POST | `/api/detect-rooms` | Run OpenCV room detection |
| POST | `/api/export-map` | Export map JSON |
| GET | `/api/floorplan/{file_id}` | Serve uploaded image |
| GET | `/api/health` | Health check |

### Placeholders (Future Integration)

- `POST /api/ocr/extract-labels` – OCR for room labels
- `POST /api/adt/sync-status` – ADT status sync

## Project Structure

```
NM2TECH-FloorMap-AI/
├── backend/
│   ├── main.py           # FastAPI app
│   ├── models/schemas.py # Pydantic models
│   ├── services/
│   │   ├── room_detector.py  # OpenCV detection
│   │   └── storage.py        # File storage
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/client.js
│   │   ├── components/   # Header, Toolbar, FloorPlanCanvas, RoomOverlay, RoomEditor, ImageUpload
│   │   ├── hooks/useFloorMap.js
│   │   ├── utils/roomUtils.js
│   │   └── types/room.js
│   └── package.json
├── sample-data/
│   └── sample-floor-map.json
└── README.md
```

## Sample Data

See `sample-data/sample-floor-map.json` for an example exported map.

## License

Proprietary – NM2TECH Healthcare Operations.
