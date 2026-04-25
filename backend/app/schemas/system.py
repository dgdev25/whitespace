from __future__ import annotations

from pydantic import BaseModel


class HealthOut(BaseModel):
    status: str
    database: str
    last_ingestion_run: str | None


class RunnerOut(BaseModel):
    name: str
    label: str
    available: bool
    method: str


class RunnersOut(BaseModel):
    runners: list[RunnerOut]
    active: str | None


class SystemConfigOut(BaseModel):
    schedule_hour: int
    schedule_minute: int
    ideas_per_run: int
    arxiv_orgs: list[str]        # full pool from .env
    arxiv_categories: list[str]  # full pool from .env
    active_orgs: list[str]       # user-selected subset
    active_categories: list[str] # user-selected subset


class DataSourcesIn(BaseModel):
    orgs: list[str]
    categories: list[str]


class PipelineRunOut(BaseModel):
    status: str
    message: str


class PipelineStatusOut(BaseModel):
    running: bool
    last_completed_run_id: str | None
    last_completed_at: str | None


class RunnerPreferenceIn(BaseModel):
    name: str | None
