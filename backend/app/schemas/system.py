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
    max_sources_per_run: int
    cached_analyses_count: int
    runner_model_prefs: dict[str, str]
    arxiv_orgs: list[str]        # full pool from .env
    arxiv_categories: list[str]  # full pool from .env
    active_orgs: list[str]       # user-selected subset
    active_categories: list[str] # user-selected subset
    github_repos: list[str]
    enabled_sources: dict[str, bool]


class DataSourcesIn(BaseModel):
    orgs: list[str]
    categories: list[str]


class SourceToggleIn(BaseModel):
    source: str
    enabled: bool


class GitHubReposIn(BaseModel):
    repos: list[str]


class PipelineRunOut(BaseModel):
    status: str
    message: str


class PipelineStatusOut(BaseModel):
    running: bool
    last_completed_run_id: str | None
    last_completed_at: str | None


class ScheduleConfigIn(BaseModel):
    enabled: bool
    interval_minutes: int  # how often to auto-run; 0 = use daily cron


class ScheduleStatusOut(BaseModel):
    enabled: bool
    interval_minutes: int
    next_run_at: str | None


class PipelineConfigIn(BaseModel):
    ideas_per_run: int
    max_sources_per_run: int
    cached_analyses_count: int


class RunnerPreferenceIn(BaseModel):
    name: str | None


class RunnerModelIn(BaseModel):
    runner: str
    model: str | None  # None clears the preference (reverts to default)


class OrgImportIn(BaseModel):
    handle: str


class OrgImportStatusOut(BaseModel):
    running: bool
    handle: str | None
    scanned: int
    total: int | None
    imported: int
    message: str
