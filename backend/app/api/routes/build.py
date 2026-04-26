from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_session
from app.db.models.build_output import BuildOutput
from app.db.models.idea import Idea
from app.schemas.build import BuildOutputOut
from worker.build_generator import run_build
from worker.db import SessionLocal

router = APIRouter(prefix="/build", tags=["build"])


def _background_build(build_id: str, idea_id: str):
    with SessionLocal() as session:
        run_build(session, build_id, idea_id)


@router.get("/{idea_id}", response_model=BuildOutputOut)
async def get_build(idea_id: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(BuildOutput).where(BuildOutput.idea_id == idea_id))
    build = result.scalars().first()
    if not build:
        raise HTTPException(404, "Build output not found — POST /build/{idea_id} to generate")
    return BuildOutputOut.model_validate(build, from_attributes=True)


@router.post("/{idea_id}", response_model=BuildOutputOut, status_code=202)
async def trigger_build(
    idea_id: str, background_tasks: BackgroundTasks, session: AsyncSession = Depends(get_session)
):
    idea = (await session.execute(select(Idea).where(Idea.id == idea_id))).scalars().first()
    if not idea:
        raise HTTPException(404, "Idea not found")
    existing = (
        await session.execute(select(BuildOutput).where(BuildOutput.idea_id == idea_id))
    ).scalars().first()
    if existing:
        if existing.status == "generating":
            return BuildOutputOut.model_validate(existing, from_attributes=True)
        if existing.status == "ready" and existing.prd is not None and existing.technical_plan:
            return BuildOutputOut.model_validate(existing, from_attributes=True)
        # "failed", "pending", or ready with missing content — reset and retry
        existing.product_sketch = {}
        existing.technical_plan = ""
        existing.prd = None
        existing.status = "generating"
        await session.commit()
        await session.refresh(existing)
        background_tasks.add_task(_background_build, existing.id, idea_id)
        return BuildOutputOut.model_validate(existing, from_attributes=True)
    build = BuildOutput(idea_id=idea_id, product_sketch={}, technical_plan="", status="generating")
    session.add(build)
    await session.commit()
    await session.refresh(build)
    background_tasks.add_task(_background_build, build.id, idea_id)
    return BuildOutputOut.model_validate(build, from_attributes=True)
