import logging

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_session
from app.schemas.system import HealthOut

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/system", tags=["system"])


@router.get("/health", response_model=HealthOut)
async def health(session: AsyncSession = Depends(get_session)):
    try:
        await session.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception as e:
        logger.warning("DB health check failed: %s", e)
        db_status = "error"
    row = None
    if db_status == "ok":
        result = await session.execute(
            text("SELECT run_date FROM ingestion_runs ORDER BY started_at DESC LIMIT 1")
        )
        row = result.fetchone()
    return HealthOut(status="ok", database=db_status, last_ingestion_run=row[0] if row else None)
