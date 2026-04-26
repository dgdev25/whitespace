from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func as sqlfunc
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_session
from app.db.models.connected_idea import ConnectedIdea
from app.db.models.idea import Idea
from app.db.models.ingestion_run import IngestionRun
from app.db.models.paper import Paper
from app.schemas.ideas import ConnectedIdeaOut, HistoryGroup, IdeaDetail, IdeaSummary, PaperRef, TodayFeed

router = APIRouter(prefix="/ideas", tags=["ideas"])


@router.get("/today", response_model=TodayFeed)
async def today_feed(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
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


@router.get("/history", response_model=list[HistoryGroup])
async def idea_history(session: AsyncSession = Depends(get_session)):
    # Load runs newest-first so we can attach timestamps to ideas grouped by run
    runs_result = await session.execute(
        select(IngestionRun).order_by(IngestionRun.started_at.desc())
    )
    runs = {r.id: r for r in runs_result.scalars().all()}

    ideas_result = await session.execute(
        select(Idea)
        .where(Idea.featured_date.isnot(None))
        .order_by(Idea.run_id.desc(), Idea.novelty_score.desc())
    )
    ideas = ideas_result.scalars().all()

    # Group by run_id, falling back to featured_date for pre-migration ideas
    groups: dict[str, list] = {}
    group_meta: dict[str, dict] = {}
    for idea in ideas:
        key = idea.run_id or f"date:{idea.featured_date}"
        if key not in group_meta:
            run = runs.get(idea.run_id) if idea.run_id else None
            started = run.started_at if run else None
            group_meta[key] = {
                "run_id": idea.run_id,
                "date": idea.featured_date or "unknown",
                "started_at": started,
            }
        groups.setdefault(key, []).append(IdeaSummary.model_validate(idea, from_attributes=True))

    # Sort groups by started_at desc (newest run first).
    # Normalise to ISO string so datetime and date-string keys compare cleanly.
    def _sort_key(k: str) -> str:
        v = group_meta[k]["started_at"]
        if v is None:
            return group_meta[k]["date"]
        return str(v)

    ordered_keys = sorted(group_meta.keys(), key=_sort_key, reverse=True)

    result = []
    run_counts: dict[str, int] = {}
    for key in ordered_keys:
        meta = group_meta[key]
        d = meta["date"]
        run_counts[d] = run_counts.get(d, 0) + 1
        count = run_counts[d]
        label = f"Run #{count}" if count > 1 else ""
        result.append(HistoryGroup(
            date=d,
            run_id=meta["run_id"],
            run_label=label,
            ideas=groups[key],
        ))
    return result


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

    paper_ids: list[str] = idea.paper_ids or []
    papers_result = await session.execute(
        select(Paper).where(Paper.arxiv_id.in_(paper_ids))
    )
    paper_map = {p.arxiv_id: p for p in papers_result.scalars().all()}
    paper_refs: list[PaperRef] = []
    for pid in paper_ids:
        p = paper_map.get(pid)
        if p:
            paper_refs.append(PaperRef(
                arxiv_id=pid,
                title=p.title or pid,
                url=p.url or "",
                source=p.source or "arxiv",
            ))
        else:
            # Fallback: construct from ID shape
            is_github = pid.startswith("github:")
            paper_refs.append(PaperRef(
                arxiv_id=pid,
                title=pid.replace("github:", "") if is_github else pid,
                url=f"https://github.com/{pid[7:]}" if is_github else f"https://arxiv.org/abs/{pid}",
                source="github" if is_github else "arxiv",
            ))

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
        paper_ids=paper_ids,
        featured_date=idea.featured_date,
        why_novel=idea.why_novel,
        who_builds=idea.who_builds,
        who_buys=idea.who_buys,
        created_at=idea.created_at,
        paper_refs=paper_refs,
        connections=connections,
    )
