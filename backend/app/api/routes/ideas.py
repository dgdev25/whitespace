from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func as sqlfunc
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_session
from app.db.models.connected_idea import ConnectedIdea
from app.db.models.idea import Idea
from app.db.models.ingestion_run import IngestionRun
from app.schemas.ideas import ConnectedIdeaOut, IdeaDetail, IdeaSummary, TodayFeed

router = APIRouter(prefix="/ideas", tags=["ideas"])


@router.get("/today", response_model=TodayFeed)
async def today_feed(
    limit: int = 20,
    offset: int = 0,
    session: AsyncSession = Depends(get_session),
):
    today = date.today().isoformat()
    result = await session.execute(
        select(Idea)
        .where(Idea.featured_date == today)
        .order_by(Idea.is_featured.desc(), Idea.novelty_score.desc())
        .limit(limit)
        .offset(offset)
    )
    ideas = result.scalars().all()

    # Fallback: if no ideas for today, return most recent featured ideas
    if not ideas and offset == 0:
        result = await session.execute(
            select(Idea)
            .where(Idea.is_featured == True)  # noqa: E712
            .order_by(Idea.novelty_score.desc())
            .limit(limit)
        )
        ideas = result.scalars().all()

    run = await session.execute(
        select(IngestionRun).where(IngestionRun.run_date == today)
    )
    run_row = run.scalars().first()
    return TodayFeed(
        date=today,
        papers_ingested=run_row.papers_fetched if run_row else 0,
        ideas=[IdeaSummary.model_validate(i, from_attributes=True) for i in ideas],
    )


@router.get("/surprise", response_model=IdeaSummary)
async def surprise(session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(Idea).where(Idea.is_featured == True).order_by(sqlfunc.random()).limit(1)  # noqa: E712
    )
    idea = result.scalars().first()
    if not idea:
        raise HTTPException(404, "No ideas available yet")
    return IdeaSummary.model_validate(idea, from_attributes=True)


@router.get("/{idea_id}", response_model=IdeaDetail)
async def idea_detail(idea_id: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Idea).where(Idea.id == idea_id))
    idea = result.scalars().first()
    if not idea:
        raise HTTPException(404, "Idea not found")
    conn_result = await session.execute(
        select(ConnectedIdea, Idea)
        .join(Idea, Idea.id == ConnectedIdea.connected_idea_id)
        .where(ConnectedIdea.idea_id == idea_id)
        .order_by(ConnectedIdea.shared_paper_count.desc())
        .limit(6)
    )
    connections = [
        ConnectedIdeaOut(
            id=i.id, title=i.title, badge=i.badge,
            shared_paper_count=c.shared_paper_count,
        )
        for c, i in conn_result.all()
    ]
    return IdeaDetail(
        id=idea.id,
        title=idea.title,
        description=idea.description,
        badge=idea.badge,
        novelty_score=idea.novelty_score,
        feasibility_score=idea.feasibility_score,
        is_featured=idea.is_featured,
        paper_ids=idea.paper_ids or [],
        featured_date=idea.featured_date,
        why_novel=idea.why_novel,
        who_builds=idea.who_builds,
        who_buys=idea.who_buys,
        created_at=idea.created_at,
        connections=connections,
    )
