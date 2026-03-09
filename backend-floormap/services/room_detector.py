"""
OpenCV contour-based room detection for floor plans.
Supports both simple diagrams and blueprint-style (dark bg, light lines) images.
Uses morphological operations to separate connected rooms from corridors.
OCR-seeded detection: uses room labels (ER-1, ICU-1, etc.) as seeds to find rooms.
"""
import cv2
import re
from pathlib import Path

from models.schemas import RoomData, BBox, Center
from services.label_extractor import extract_labels_from_image

# Room-like label patterns (OCR text that likely indicates a room)
_ROOM_LABEL_PATTERNS = re.compile(
    r"^(ER|ICU|OR|ROOM|RM)\s*-?\s*\d+|"
    r"^(TRAUMA|TRIAGE|PACU|PRE-OP|NURSES?\s*STATION|SUPPORT\s*ROOM|"
    r"LAB|PHARMACY|RADIOLOGY|STERILE|STAFF\s*LOUNGE|HOLDING|RECOVERY)"
    r"(\s+ROOM)?$",
    re.IGNORECASE,
)


class RoomDetector:
    """Detect room-like rectangular regions in floor plan images."""

    def get_image_dimensions(self, image_path: str) -> dict:
        """Return width and height of image."""
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Cannot read image: {image_path}")
        h, w = img.shape[:2]
        return {"width": w, "height": h}

    def _is_room_like(self, x: int, y: int, w: int, h: int, area: float, img_area: int) -> bool:
        """Filter out corridors, elevators, and oversized regions."""
        if w < 12 or h < 12:
            return False
        aspect = w / h if h > 0 else 0
        # Corridors: elongated (aspect > 3.5 or < 0.29)
        if aspect > 3.5 or aspect < 0.29:
            return False
        # Oversized: elevator banks, atriums (> 8% of image)
        if area > img_area * 0.08:
            return False
        return True

    def _add_from_contours(self, thresh, seen, all_rects, min_area, max_area, img_area):
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < min_area or area > max_area:
                continue
            x, y, w, h = cv2.boundingRect(cnt)
            if not self._is_room_like(x, y, w, h, area, img_area):
                continue
            # Solidity: room-like shapes are fairly convex (exclude irregular corridors)
            hull = cv2.convexHull(cnt)
            hull_area = cv2.contourArea(hull)
            if hull_area > 0 and (area / hull_area) < 0.4:
                continue
            key = (round(x / 5) * 5, round(y / 5) * 5, round(w / 5) * 5, round(h / 5) * 5)
            if key not in seen:
                seen.add(key)
                all_rects.append((x, y, w, h, None))

    def _add_from_connected_components(self, thresh, seen, all_rects, min_area, max_area, img_area):
        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(thresh)
        for i in range(1, num_labels):
            area = stats[i, cv2.CC_STAT_AREA]
            if area < min_area or area > max_area:
                continue
            x = stats[i, cv2.CC_STAT_LEFT]
            y = stats[i, cv2.CC_STAT_TOP]
            w = stats[i, cv2.CC_STAT_WIDTH]
            h = stats[i, cv2.CC_STAT_HEIGHT]
            if not self._is_room_like(x, y, w, h, float(area), img_area):
                continue
            key = (round(x / 5) * 5, round(y / 5) * 5, round(w / 5) * 5, round(h / 5) * 5)
            if key not in seen:
                seen.add(key)
                all_rects.append((x, y, w, h, None))  # (x,y,w,h,label)

    def _add_from_ocr_seeds(
        self,
        image_path: str,
        seen: set,
        all_rects: list,
        w_img: int,
        h_img: int,
        img_area: int,
        min_area: int,
        max_area: int,
    ) -> None:
        """Use OCR room labels (ER-1, ICU-1, etc.) as seeds; create rooms with expanded bbox."""
        ocr_results = extract_labels_from_image(image_path)
        for text, tx, ty, tw, th in ocr_results:
            if not _ROOM_LABEL_PATTERNS.search(text.strip()):
                continue
            cx = tx + tw / 2
            cy = ty + th / 2
            # Room is typically 3–5x the label; use expanded bbox centered on label
            rw = max(int(tw * 4), 60)
            rh = max(int(th * 4), 50)
            x = max(0, int(cx - rw / 2))
            y = max(0, int(cy - rh / 2))
            w = min(rw, w_img - x)
            h = min(rh, h_img - y)
            if w < 20 or h < 20:
                continue
            area = w * h
            if area < min_area or area > max_area or not self._is_room_like(x, y, w, h, float(area), img_area):
                continue
            key = (round(x / 5) * 5, round(y / 5) * 5, round(w / 5) * 5, round(h / 5) * 5)
            if key not in seen:
                seen.add(key)
                all_rects.append((x, y, w, h, text.strip()))

    def detect_rooms(
        self,
        image_path: str,
        min_area: int = 200,
        max_area: int = 500000,
        min_aspect: float = 0.2,
        max_aspect: float = 5.0,
    ) -> list[RoomData]:
        """Detect room boxes using OpenCV. Uses morphological ops to separate rooms from corridors."""
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Cannot read image: {image_path}")

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        h_img, w_img = gray.shape
        img_area = h_img * w_img
        max_area = min(max_area, int(img_area * 0.08))  # Cap at 8% to exclude elevators/atriums
        min_area = max(min_area, 80)  # Allow smaller rooms (e.g. triage, support)

        seen = set()
        all_rects = []

        # Blueprint: dark bg, light lines. Invert so rooms (dark) become white.
        _, th_otsu = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        _, th_127 = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY_INV)
        th_adapt = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 21, 10)

        # Morphological kernels: erosion breaks thin corridor links between rooms
        kernel_small = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        kernel_erode = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        kernel_erode2 = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
        kernel_erode3 = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))  # Lighter erosion

        for thresh in [th_otsu, th_127, th_adapt]:
            # Original contours (no erosion) - catches well-separated rooms
            self._add_from_contours(thresh, seen, all_rects, min_area, max_area, img_area)
            # Light erosion (3x3) - breaks only thin links, keeps small rooms
            eroded_light = cv2.erode(thresh, kernel_erode3)
            eroded_light = cv2.morphologyEx(eroded_light, cv2.MORPH_CLOSE, kernel_small)
            self._add_from_contours(eroded_light, seen, all_rects, min_area, max_area, img_area)
            self._add_from_connected_components(eroded_light, seen, all_rects, min_area, max_area, img_area)
            # Medium erosion (5x5) - separates most connected rooms
            eroded = cv2.erode(thresh, kernel_erode)
            eroded = cv2.morphologyEx(eroded, cv2.MORPH_CLOSE, kernel_small)
            self._add_from_contours(eroded, seen, all_rects, min_area, max_area, img_area)
            self._add_from_connected_components(eroded, seen, all_rects, min_area, max_area, img_area)
            # Strong erosion (7x7) - for tightly connected room clusters
            eroded2 = cv2.erode(thresh, kernel_erode2)
            eroded2 = cv2.morphologyEx(eroded2, cv2.MORPH_CLOSE, kernel_small)
            self._add_from_contours(eroded2, seen, all_rects, min_area, max_area, img_area)

        # Light-background floor plans
        _, th_light = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)
        self._add_from_contours(th_light, seen, all_rects, min_area, max_area, img_area)

        # OCR-seeded: use room labels (ER-1, ICU-1, etc.) as seeds for rooms contour detection missed
        self._add_from_ocr_seeds(
            image_path, seen, all_rects, w_img, h_img, img_area, min_area, max_area
        )

        # Normalize to (x,y,w,h,label) for mixed 4/5-tuples
        def _norm(r):
            if len(r) == 5:
                return r
            return (r[0], r[1], r[2], r[3], None)

        all_rects = [_norm(r) for r in all_rects]

        # Non-maximum suppression: remove smaller overlapping boxes, prefer OCR-labeled
        all_rects.sort(key=lambda r: (-(r[2] * r[3]), r[4] is None))  # larger first, labeled first
        filtered = []
        for r in all_rects:
            x, y, w, h, label = r[0], r[1], r[2], r[3], r[4]
            overlap = False
            for r2 in filtered:
                x2, y2, w2, h2 = r2[0], r2[1], r2[2], r2[3]
                ix = max(0, min(x + w, x2 + w2) - max(x, x2))
                iy = max(0, min(y + h, y2 + h2) - max(y, y2))
                if ix > 0 and iy > 0 and (ix * iy) / max(w * h, 1) > 0.4:
                    overlap = True
                    break
            if not overlap:
                filtered.append((x, y, w, h, label))
            if len(filtered) >= 200:
                break

        rooms: list[RoomData] = []
        for i, (x, y, w, h, label) in enumerate(sorted(filtered, key=lambda r: (r[1], r[0]))):
            room_id = f"ROOM_{len(rooms) + 1:03d}"
            room = self._rect_to_room(room_id, x, y, w, h, i + 1)
            if label:
                room.label = label
            rooms.append(room)

        for i, r in enumerate(rooms):
            r.room_id = f"ROOM_{i + 1:03d}"
            if not r.label or r.label.startswith("Room "):
                r.label = f"Room {i + 1}"

        return rooms

    def _rect_to_room(self, room_id: str, x: int, y: int, w: int, h: int, idx: int, label: str | None = None) -> RoomData:
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
            label=label if label else f"Room {idx}",
            type="patient_room",
            status="available",
            bbox=BBox(x=float(x), y=float(y), width=float(w), height=float(h)),
            center=Center(x=cx, y=cy),
            polygon=polygon,
        )
