from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    domain: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    focus_statement: Optional[str] = Field(None, max_length=2000)
    source_config: dict = {}
    pipeline_config: dict = {}


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    domain: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    focus_statement: Optional[str] = Field(None, max_length=2000)
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
    why_novel: Optional[str] = None
    who_builds: Optional[str] = None
    who_buys: Optional[str] = None
    tags: list[str]
    paper_refs: list[str]
    score: int
    novelty_score: int
    feasibility_score: int
    impact_score: int
    is_featured: bool
    prd: Optional[str] = None
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
