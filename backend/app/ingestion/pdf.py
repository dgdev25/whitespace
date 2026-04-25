import re
import uuid
from pathlib import Path


def extract_text(path: str) -> str:
    import pdfplumber

    with pdfplumber.open(path) as pdf:
        return "\n".join(page.extract_text() or "" for page in pdf.pages)


def _safe_filename(filename: str) -> str:
    name = Path(filename).name
    name = re.sub(r"[^a-zA-Z0-9._-]", "_", name)
    return name or f"upload_{uuid.uuid4().hex}.pdf"


def save_upload(temp_dir: Path, filename: str, content: bytes) -> str:
    temp_dir.mkdir(parents=True, exist_ok=True)
    file_path = temp_dir / _safe_filename(filename)
    file_path.write_bytes(content)
    return str(file_path)
