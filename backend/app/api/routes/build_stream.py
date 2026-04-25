import asyncio
import json

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from app.api.deps import get_session
from app.db.models.build_output import BuildOutput

router = APIRouter(prefix="/build", tags=["build"])


@router.get("/{idea_id}/stream")
async def stream_build(idea_id: str, session: AsyncSession = Depends(get_session)):
    async def generator():
        for _ in range(60):
            result = await session.execute(
                select(BuildOutput).where(BuildOutput.idea_id == idea_id)
            )
            build = result.scalars().first()
            if not build:
                yield {"data": json.dumps({"status": "not_found"})}
                return
            yield {"data": json.dumps({"status": build.status})}
            if build.status in ("ready", "failed"):
                return
            await asyncio.sleep(1)

    return EventSourceResponse(generator())
