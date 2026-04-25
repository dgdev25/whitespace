from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_session
from app.db.models.build_output import BuildOutput
from app.db.models.idea import Idea
from app.db.models.saved_idea import SavedIdea
from app.schemas.ideas import IdeaSummary
from app.schemas.saved import SavedIdeaOut

router = APIRouter(prefix="/saved", tags=["saved"])


class SaveRequest(BaseModel):
    idea_id: str


@router.get("/", response_model=list[SavedIdeaOut])
async def list_saved(session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(SavedIdea, Idea, BuildOutput)
        .join(Idea, Idea.id == SavedIdea.idea_id)
        .outerjoin(BuildOutput, BuildOutput.idea_id == SavedIdea.idea_id)
        .order_by(SavedIdea.saved_at.desc())
    )
    return [
        SavedIdeaOut(
            id=s.id,
            idea=IdeaSummary.model_validate(i, from_attributes=True),
            saved_at=s.saved_at,
            has_build_output=b is not None and b.status == "ready",
        )
        for s, i, b in result.all()
    ]


@router.post("/", response_model=SavedIdeaOut, status_code=201)
async def save_idea(body: SaveRequest, session: AsyncSession = Depends(get_session)):
    idea_id = body.idea_id
    idea = (await session.execute(select(Idea).where(Idea.id == idea_id))).scalars().first()
    if not idea:
        raise HTTPException(404, "Idea not found")
    existing = (
        await session.execute(select(SavedIdea).where(SavedIdea.idea_id == idea_id))
    ).scalars().first()
    if existing:
        raise HTTPException(409, "Already saved")
    saved = SavedIdea(idea_id=idea_id)
    session.add(saved)
    try:
        await session.commit()
        await session.refresh(saved)
    except IntegrityError:
        await session.rollback()
        raise HTTPException(409, "Already saved")
    return SavedIdeaOut(
        id=saved.id,
        idea=IdeaSummary.model_validate(idea, from_attributes=True),
        saved_at=saved.saved_at,
        has_build_output=False,
    )


@router.delete("/{idea_id}", status_code=204)
async def unsave_idea(idea_id: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(SavedIdea).where(SavedIdea.idea_id == idea_id))
    saved = result.scalars().first()
    if saved is None:
        raise HTTPException(404, "Not saved")
    await session.delete(saved)
    await session.commit()
