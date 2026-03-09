"""Pydantic schemas for NM2TECH FloorMap AI API."""
from pydantic import BaseModel
from typing import Optional


class BBox(BaseModel):
    x: float
    y: float
    width: float
    height: float


class Center(BaseModel):
    x: float
    y: float


# Hospital units/departments for floor plan structure
UNITS = ("ER", "General Ward", "ICU", "OR")


class RoomData(BaseModel):
    room_id: str
    label: str
    type: str = "patient_room"
    status: str = "available"
    unit: Optional[str] = None  # ER | General Ward | ICU | OR
    bbox: BBox
    center: Center
    polygon: list[list[float]]


class FloorPlanUploadResponse(BaseModel):
    file_id: str
    filename: str
    path: str
    width: int
    height: int
    url: str


class RoomDetectionRequest(BaseModel):
    file_id: str
    image_width: Optional[int] = None
    image_height: Optional[int] = None
    min_area: Optional[int] = 500
    max_area: Optional[int] = 50000
    min_aspect: Optional[float] = 0.3
    max_aspect: Optional[float] = 3.0
    extract_labels: Optional[bool] = True  # Use OCR to auto-detect room names (ER-1, TRAUMA ROOM, etc.)


class RoomDetectionResponse(BaseModel):
    rooms: list[RoomData]
    image_width: Optional[int] = None
    image_height: Optional[int] = None


class ExportMapRequest(BaseModel):
    file_id: str
    rooms: list[RoomData]
    save_to_file: bool = True
