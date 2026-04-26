from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class PaperRef(BaseModel):
    arxiv_id: str
    title: str
    url: str
    source: str  # "arxiv" | "github" | "blog" | "semantic_scholar"


class ConnectedIdeaOut(BaseModel):
    id: str
    title: str
    badge: str
    shared_paper_count: int


class IdeaSummary(BaseModel):
    id: str
    title: str
    description: str
    badge: str
    novelty_score: float
    feasibility_score: float
    is_featured: bool
    paper_ids: list[str]
    featured_date: str | None
    created_at: datetime


class IdeaDetail(IdeaSummary):
    why_novel: str
    who_builds: str
    who_buys: str
    paper_refs: list[PaperRef] = []
    connections: list[ConnectedIdeaOut] = []
    created_at: datetime


class TodayFeed(BaseModel):
    date: str
    papers_ingested: int
    ideas: list[IdeaSummary]


class HistoryGroup(BaseModel):
    date: str
    run_id: str | None
    run_label: str
    ideas: list[IdeaSummary]
