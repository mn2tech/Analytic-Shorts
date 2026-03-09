"""
NM2TECH FloorMap AI - FastAPI Backend
Healthcare operations floor plan room detection and map export.
"""
from fastapi import FastAPI, File, UploadFile, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pathlib import Path
import json
import uuid
import shutil
from typing import Optional

from services.room_detector import RoomDetector
from services.storage import StorageService
from models.schemas import FloorPlanUploadResponse, RoomDetectionRequest, RoomDetectionResponse, ExportMapRequest

app = FastAPI(
    title="NM2TECH FloorMap AI API",
    description="Floor plan room detection and ER bed map export for healthcare operations",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

detector = RoomDetector()
storage = StorageService(UPLOAD_DIR)


@app.get("/api/health")
async def health():
    """Health check for load balancers and monitoring."""
    return {"status": "ok", "service": "NM2TECH FloorMap AI"}


@app.post("/api/upload-floorplan", response_model=FloorPlanUploadResponse)
async def upload_floorplan(file: UploadFile = File(...)):
    """
    Upload a hospital floor plan image.
    Returns file ID and dimensions for canvas setup.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image (PNG, JPEG, etc.)")

    ext = Path(file.filename or "image.png").suffix or ".png"
    file_id = str(uuid.uuid4())
    dest = UPLOAD_DIR / f"{file_id}{ext}"

    try:
        with dest.open("wb") as f:
            shutil.copyfileobj(file.file, f)
    except Exception as e:
        raise HTTPException(500, f"Failed to save file: {e}")

    dims = detector.get_image_dimensions(str(dest))
    return FloorPlanUploadResponse(
        file_id=file_id,
        filename=file.filename or "floorplan.png",
        path=str(dest),
        width=dims["width"],
        height=dims["height"],
        url=f"/api/floorplan/{file_id}{ext}",
    )


@app.get("/api/floorplan/{file_id}")
async def serve_floorplan(file_id: str):
    """Serve uploaded floor plan image by ID."""
    # file_id may include extension (e.g. abc123.png)
    candidates = list(UPLOAD_DIR.glob(f"{file_id}*"))
    if not candidates:
        candidates = list(UPLOAD_DIR.glob(f"*{file_id}*"))
    if not candidates:
        raise HTTPException(404, "Floor plan not found")
    return FileResponse(candidates[0])


@app.post("/api/detect-rooms", response_model=RoomDetectionResponse)
async def detect_rooms(body: RoomDetectionRequest = Body(...)):
    """
    Run OpenCV contour-based room detection on an uploaded floor plan.
    Returns detected room boxes as overlays.
    """
    path = storage.resolve_path(body.file_id)
    if not path or not path.exists():
        raise HTTPException(404, "Floor plan not found")

    rooms = detector.detect_rooms(
        str(path),
        min_area=body.min_area or 500,
        max_area=body.max_area or 50000,
        min_aspect=body.min_aspect or 0.3,
        max_aspect=body.max_aspect or 3.0,
    )
    return RoomDetectionResponse(rooms=rooms, image_width=body.image_width, image_height=body.image_height)


@app.post("/api/export-map")
async def export_map(body: ExportMapRequest = Body(...)):
    """
    Export the final room map as JSON for ER bed map application.
    Optionally saves to local storage.
    """
    data = body.model_dump()
    if body.save_to_file and body.file_id:
        path = storage.save_map(body.file_id, data)
        return {"saved": True, "path": str(path), "map": data}
    return {"saved": False, "map": data}


# ---------------------------------------------------------------------------
# Placeholders for future integrations (OCR, ADT)
# ---------------------------------------------------------------------------

@app.post("/api/ocr/extract-labels")
async def ocr_extract_labels(file_id: str = Body(..., embed=True)):
    """
    [PLACEHOLDER] Future OCR integration to extract room labels from floor plan.
    Will use Tesseract or cloud OCR to read room numbers/names from image.
    """
    return {
        "status": "not_implemented",
        "message": "OCR integration planned. Will extract room labels from floor plan image.",
        "file_id": file_id,
    }


@app.post("/api/adt/sync-status")
async def adt_sync_status(room_ids: list[str] = Body(..., embed=True)):
    """
    [PLACEHOLDER] Future ADT (Admission/Discharge/Transfer) integration.
    Will sync room status (available, occupied, etc.) from hospital ADT system.
    """
    return {
        "status": "not_implemented",
        "message": "ADT integration planned. Will sync room status from hospital system.",
        "room_ids": room_ids,
    }
