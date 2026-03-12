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
from services.label_extractor import assign_labels_to_rooms
from services.storage import StorageService
from models.schemas import FloorPlanUploadResponse, RoomDetectionRequest, RoomDetectionResponse, ExportMapRequest
import os

# CORS: allow production frontend origins (comma-separated, e.g. https://analytics-shorts.nm2tech-sas.com)
_CORS_ORIGINS = os.getenv("CORS_ORIGINS", "").strip().split(",") if os.getenv("CORS_ORIGINS") else []
_DEFAULT_ORIGINS = [
    "http://localhost:5173", "http://localhost:5174", "http://localhost:3000",
    "http://127.0.0.1:3000", "http://127.0.0.1:5173", "http://127.0.0.1:5174",
]
CORS_ORIGINS = [o.strip() for o in _CORS_ORIGINS if o.strip()] or _DEFAULT_ORIGINS

app = FastAPI(
    title="NM2TECH FloorMap AI API",
    description="Floor plan room detection and ER bed map export for healthcare operations",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
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
        min_area=body.min_area or 200,
        max_area=body.max_area or 500000,
        min_aspect=body.min_aspect or 0.2,
        max_aspect=body.max_aspect or 5.0,
    )
    if (body.extract_labels is None or body.extract_labels) and rooms:
        rooms = assign_labels_to_rooms(rooms, str(path))
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


@app.post("/api/ocr/extract-labels")
async def ocr_extract_labels(file_id: str = Body(..., embed=True)):
    """[PLACEHOLDER] Future OCR integration."""
    return {"status": "not_implemented", "message": "OCR integration planned.", "file_id": file_id}


@app.post("/api/adt/sync-status")
async def adt_sync_status(room_ids: list[str] = Body(..., embed=True)):
    """[PLACEHOLDER] Future ADT integration."""
    return {"status": "not_implemented", "message": "ADT integration planned.", "room_ids": room_ids}
