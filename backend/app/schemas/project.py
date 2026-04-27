from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ProjectCreate(BaseModel):
    name: str
    domain: str
    description: Optional[str] = None
    focus_statement: Optional[str] = None
    source_config: dict = {}
    pipeline_config: dict = {}


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    description: Optional[str] = None
    focus_statement: Optional[str] = None
    source_config: Optional[dict] = None
    pipeline_config: Optional[dict] = None


class ProjectRunOut(BaseModel):
    id: int
    project_id: int
    status: str
    stages: list
    papers_fetched: int
    ideas_generated: int
    error: Optional[str]
    started_at: datetime
    completed_at: Optional[datetime]
    model_config = {"from_attributes": True}


class ProjectIdeaOut(BaseModel):
    id: str
    project_id: int
    run_id: Optional[int]
    title: str
    description: str
    tags: list[str]
    paper_refs: list[str]
    score: int
    novelty_score: int
    feasibility_score: int
    impact_score: int
    is_featured: bool
    created_at: datetime
    model_config = {"from_attributes": True}


class ProjectOut(BaseModel):
    id: int
    name: str
    domain: str
    description: Optional[str]
    focus_statement: Optional[str]
    source_config: dict
    pipeline_config: dict
    created_at: datetime
    ideas_count: int = 0
    papers_count: int = 0
    last_run: Optional[ProjectRunOut] = None
    model_config = {"from_attributes": True}


class ProjectRunStatusOut(BaseModel):
    running: bool
    current_run: Optional[ProjectRunOut]
