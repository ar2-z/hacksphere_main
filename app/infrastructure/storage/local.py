from __future__ import annotations

import os
import secrets
from pathlib import Path
from typing import BinaryIO

from app.core.config import settings


class LocalStorage:
    def __init__(self) -> None:
        self.upload_dir = Path(settings.UPLOAD_DIR)
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    def _generate_filename(self, original_filename: str) -> str:
        ext = Path(original_filename).suffix
        unique_name = secrets.token_hex(16)
        return f"{unique_name}{ext}"

    def _get_subdirectory(self, category: str) -> Path:
        subdir = self.upload_dir / category
        subdir.mkdir(parents=True, exist_ok=True)
        return subdir

    async def upload_file(
        self,
        file: BinaryIO,
        filename: str,
        category: str = "presentations",
    ) -> dict[str, str]:
        safe_filename = self._generate_filename(filename)
        subdir = self._get_subdirectory(category)
        file_path = subdir / safe_filename

        content = file.read()
        with open(file_path, "wb") as f:
            f.write(content)

        return {
            "filename": safe_filename,
            "original_filename": filename,
            "path": str(file_path),
            "url": f"/uploads/{category}/{safe_filename}",
            "size": len(content),
        }

    async def delete_file(self, file_path: str) -> bool:
        try:
            path = Path(file_path)
            if path.exists():
                path.unlink()
                return True
            return False
        except Exception:
            return False

    async def get_file_path(self, category: str, filename: str) -> Path | None:
        path = self.upload_dir / category / filename
        if path.exists():
            return path
        return None

    def get_upload_dir(self) -> str:
        return str(self.upload_dir)


storage = LocalStorage()
