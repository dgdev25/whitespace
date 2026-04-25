from __future__ import annotations

from pydantic import BaseModel


class HealthOut(BaseModel):
    status: str
    database: str
    last_ingestion_run: str | None
