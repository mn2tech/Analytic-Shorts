"""
Python callable adapter that posts .dta files to backend auto-import API.
"""

import json
import mimetypes
import os
import uuid
from pathlib import Path
from typing import Any, Dict
from urllib import request
from urllib.error import HTTPError, URLError


def _multipart_body(file_path: Path, field_name: str = "file") -> tuple[bytes, str]:
    boundary = f"----checkinnsync{uuid.uuid4().hex}"
    file_name = file_path.name
    content_type = mimetypes.guess_type(file_name)[0] or "application/octet-stream"
    file_bytes = file_path.read_bytes()

    parts = []
    parts.append(f"--{boundary}\r\n".encode("utf-8"))
    parts.append(
        (
            f'Content-Disposition: form-data; name="{field_name}"; filename="{file_name}"\r\n'
            f"Content-Type: {content_type}\r\n\r\n"
        ).encode("utf-8")
    )
    parts.append(file_bytes)
    parts.append(b"\r\n")
    parts.append(f"--{boundary}--\r\n".encode("utf-8"))
    body = b"".join(parts)
    return body, boundary


def import_checkinn_dta(file_path: str) -> Dict[str, Any]:
    file_obj = Path(file_path).resolve()
    if not file_obj.exists():
        raise FileNotFoundError(f"File not found: {file_obj}")

    endpoint = os.getenv("CHECKINN_AUTO_IMPORT_URL", "http://localhost:5000/api/innsoft/auto-import")
    timeout_seconds = int(os.getenv("CHECKINN_AUTO_IMPORT_TIMEOUT_SECONDS", "180"))

    body, boundary = _multipart_body(file_obj)
    req = request.Request(
        endpoint,
        data=body,
        method="POST",
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Content-Length": str(len(body)),
        },
    )

    try:
        with request.urlopen(req, timeout=timeout_seconds) as resp:
            payload = resp.read().decode("utf-8")
            return json.loads(payload) if payload else {"status": "success"}
    except HTTPError as err:
        detail = err.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Auto-import endpoint error {err.code}: {detail or err.reason}") from err
    except URLError as err:
        raise RuntimeError(f"Failed to reach auto-import endpoint: {err.reason}") from err
