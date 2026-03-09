"""Local file storage for uploaded floor plans and exported maps."""
from pathlib import Path
import json
from typing import Optional


class StorageService:
    def __init__(self, upload_dir: Path):
        self.upload_dir = Path(upload_dir)
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.exports_dir = self.upload_dir / "exports"
        self.exports_dir.mkdir(exist_ok=True)

    def resolve_path(self, file_id: str) -> Optional[Path]:
        """Resolve file_id to full path. file_id may or may not include extension."""
        # Try exact match first
        p = self.upload_dir / file_id
        if p.exists():
            return p
        # Try with common extensions
        for ext in [".png", ".jpg", ".jpeg", ".webp"]:
            p = self.upload_dir / f"{file_id}{ext}"
            if p.exists():
                return p
        # Try glob
        matches = list(self.upload_dir.glob(f"{file_id}*"))
        if matches:
            return matches[0]
        return None

    def save_map(self, file_id: str, data: dict) -> Path:
        """Save exported map JSON to exports directory."""
        out = self.exports_dir / f"{file_id}_map.json"
        with out.open("w") as f:
            json.dump(data, f, indent=2)
        return out
