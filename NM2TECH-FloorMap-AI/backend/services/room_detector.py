"""
OpenCV contour-based room detection for floor plans.
Detects rectangular room-like regions in hospital floor plan images.
"""
import cv2
import numpy as np
from pathlib import Path
from typing import Optional

from models.schemas import RoomData, BBox, Center


class RoomDetector:
    """Detect room-like rectangular regions in floor plan images."""

    def get_image_dimensions(self, image_path: str) -> dict:
        """Return width and height of image."""
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Cannot read image: {image_path}")
        h, w = img.shape[:2]
        return {"width": w, "height": h}

    def detect_rooms(
        self,
        image_path: str,
        min_area: int = 500,
        max_area: int = 50000,
        min_aspect: float = 0.3,
        max_aspect: float = 3.0,
    ) -> list[RoomData]:
        """
        Detect room boxes using OpenCV contours.
        Filters by area and aspect ratio to find room-like rectangles.
        """
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Cannot read image: {image_path}")

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        # Threshold to get binary image (walls vs open space)
        _, thresh = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY_INV)
        # Find contours
        contours, _ = cv2.findContours(
            thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        rooms: list[RoomData] = []
        for i, cnt in enumerate(contours):
            area = cv2.contourArea(cnt)
            if area < min_area or area > max_area:
                continue

            # Approximate to polygon
            peri = cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)

            # Prefer 4-sided (rectangular) regions
            if len(approx) == 4:
                x, y, w, h = cv2.boundingRect(approx)
                aspect = w / h if h > 0 else 0
                if aspect < min_aspect or aspect > max_aspect:
                    continue
                room_id = f"ROOM_{len(rooms) + 1:03d}"
                rooms.append(self._rect_to_room(room_id, x, y, w, h, i + 1))
            else:
                # Also accept any convex hull with reasonable bbox
                x, y, w, h = cv2.boundingRect(cnt)
                aspect = w / h if h > 0 else 0
                if aspect < min_aspect or aspect > max_aspect:
                    continue
                room_id = f"ROOM_{len(rooms) + 1:03d}"
                rooms.append(self._rect_to_room(room_id, x, y, w, h, i + 1))

        # Sort by position (top-left to bottom-right)
        rooms.sort(key=lambda r: (r.bbox.y, r.bbox.x))
        # Reassign room_ids in order
        for i, r in enumerate(rooms):
            r.room_id = f"ROOM_{i + 1:03d}"
            r.label = f"Room {i + 1}"

        return rooms

    def _rect_to_room(
        self, room_id: str, x: int, y: int, w: int, h: int, idx: int
    ) -> RoomData:
        cx = x + w / 2
        cy = y + h / 2
        polygon = [
            [float(x), float(y)],
            [float(x + w), float(y)],
            [float(x + w), float(y + h)],
            [float(x), float(y + h)],
        ]
        return RoomData(
            room_id=room_id,
            label=f"Room {idx}",
            type="patient_room",
            status="available",
            bbox=BBox(x=float(x), y=float(y), width=float(w), height=float(h)),
            center=Center(x=cx, y=cy),
            polygon=polygon,
        )
