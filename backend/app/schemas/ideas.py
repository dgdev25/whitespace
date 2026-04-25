from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


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


class IdeaDetail(IdeaSummary):
    why_novel: str
    who_builds: str
    who_buys: str
    connections: list[ConnectedIdeaOut] = []
    created_at: datetime


class TodayFeed(BaseModel):
    date: str
    papers_ingested: int
    ideas: list[IdeaSummary]
