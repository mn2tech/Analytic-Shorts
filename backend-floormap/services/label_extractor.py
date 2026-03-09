"""
OCR-based label extraction for floor plans.
Extracts text (e.g. ER-1, TRAUMA ROOM, TRIAGE) and matches to room regions.
Assigns unit (ER, General Ward, ICU, OR) from label patterns.
Uses pytesseract (Tesseract). If Tesseract is not installed, returns empty - no crash.
"""
import cv2
import re
from typing import Optional

# Unit inference from room labels
_UNIT_PATTERNS = [
    (r"^ER[- ]?\d+|^TRAUMA|^TRIAGE|ER\s+NURSES|ER\s+WAITING|ER\s+ENTRANCE", "ER"),
    (r"^ICU[- ]?\d+|ICU\s+NURSES|SUPPORT\s*ROOM", "ICU"),
    (r"^OR\s*\d+|PRE[- ]?OP|PACU|STERILE|OPERATING\s+ROOM", "OR"),
    (r"PATIENT\s+ROOM|WARD\s+NURSES|ROOM\s+\d{3}|UTILITY", "General Ward"),
]


def infer_unit_from_label(label: str) -> Optional[str]:
    """Infer hospital unit (ER, General Ward, ICU, OR) from room label."""
    if not label or not isinstance(label, str):
        return None
    text = label.strip().upper()
    for pattern, unit in _UNIT_PATTERNS:
        if re.search(pattern, label, re.IGNORECASE):
            return unit
    return None

_ocr_available = None


def _check_ocr():
    global _ocr_available
    if _ocr_available is not None:
        return _ocr_available
    try:
        import pytesseract
        pytesseract.get_tesseract_version()
        _ocr_available = True
    except Exception:
        _ocr_available = False
    return _ocr_available


def extract_labels_from_image(image_path: str) -> list[tuple[str, float, float, float, float]]:
    """
    Run OCR on floor plan image. Returns list of (text, x, y, w, h) for each detected text region.
    Returns [] if Tesseract is not installed.
    """
    if not _check_ocr():
        return []

    try:
        import pytesseract
    except ImportError:
        return []

    img = cv2.imread(image_path)
    if img is None:
        return []

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # Blueprint: dark bg, light text - invert so OCR sees dark text on light bg
    gray_inv = cv2.bitwise_not(gray)
    # Also try non-inverted for light-background plans
    results = []

    for preprocessed in [gray_inv, gray]:
        data = pytesseract.image_to_data(preprocessed, output_type=pytesseract.Output.DICT)
        n = len(data["text"])
        for i in range(n):
            text = (data["text"][i] or "").strip()
            if not text or len(text) < 2:
                continue
            conf = int(data["conf"][i]) if data["conf"][i] != "-1" else 0
            if conf < 30:
                continue
            x, y, w, h = data["left"][i], data["top"][i], data["width"][i], data["height"][i]
            if w < 5 or h < 5:
                continue
            # Clean text: remove extra spaces, normalize
            text = re.sub(r"\s+", " ", text).strip()
            if len(text) >= 2:
                results.append((text, float(x), float(y), float(w), float(h)))

    return results


def assign_labels_to_rooms(
    rooms: list,
    image_path: str,
) -> list:
    """
    For each room, find the best-matching OCR text and assign as label.
    Matching: OCR text center inside room, or significant overlap.
    """
    ocr_results = extract_labels_from_image(image_path)
    if not ocr_results:
        return rooms

    for room in rooms:
        rx, ry = room.bbox.x, room.bbox.y
        rw, rh = room.bbox.width, room.bbox.height
        r_cx = rx + rw / 2
        r_cy = ry + rh / 2
        best_text = None
        best_score = -1

        for text, tx, ty, tw, th in ocr_results:
            t_cx = tx + tw / 2
            t_cy = ty + th / 2
            # Text center inside room?
            if rx <= t_cx <= rx + rw and ry <= t_cy <= ry + rh:
                score = 100
            else:
                # Overlap area
                ix = max(0, min(rx + rw, tx + tw) - max(rx, tx))
                iy = max(0, min(ry + rh, ty + th) - max(ry, ty))
                overlap = ix * iy
                score = overlap / (tw * th) if (tw * th) > 0 else 0
            if score > best_score and score > 0:
                best_score = score
                best_text = text

        if best_text:
            room.label = best_text.strip()
            unit = infer_unit_from_label(room.label)
            if unit:
                room.unit = unit
            # Keep room_id as-is to avoid duplicates (multiple rooms can share same label like ER-1)

    # Assign units for rooms that didn't get one from OCR
    for room in rooms:
        if not getattr(room, "unit", None) and room.label:
            unit = infer_unit_from_label(room.label)
            if unit:
                room.unit = unit

    return rooms
