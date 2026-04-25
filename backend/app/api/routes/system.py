import logging
import threading

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_session
from app.core.config import settings
from app.schemas.system import DataSourcesIn, HealthOut, PipelineRunOut, PipelineStatusOut, RunnerOut, RunnerPreferenceIn, RunnersOut, SystemConfigOut

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/system", tags=["system"])

_pipeline_lock = threading.Lock()
_preferred_runner: str | None = None
_active_orgs: list[str] | None = None       # None = use all from settings
_active_categories: list[str] | None = None  # None = use all from settings


def _parse_setting(value: str) -> list[str]:
    return [v.strip() for v in value.split(",") if v.strip()]


def _run_pipeline_sync():
    from worker.db import SessionLocal
    from worker.orchestrator import run_daily_pipeline

    with SessionLocal() as s:
        run_daily_pipeline(s)


@router.get("/health", response_model=HealthOut)
async def health(session: AsyncSession = Depends(get_session)):
    try:
        await session.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception as e:
        logger.warning("DB health check failed: %s", e)
        db_status = "error"
    row = None
    if db_status == "ok":
        result = await session.execute(
            text("SELECT run_date FROM ingestion_runs ORDER BY started_at DESC LIMIT 1")
        )
        row = result.fetchone()
    return HealthOut(status="ok", database=db_status, last_ingestion_run=row[0] if row else None)


def _build_runner_checks() -> list[RunnerOut]:
    import os
    import shutil
    return [
        RunnerOut(name="claude_cli", label="Claude CLI", available=shutil.which("claude") is not None, method="cli"),
        RunnerOut(name="codex_cli", label="Codex CLI", available=shutil.which("codex") is not None, method="cli"),
        RunnerOut(name="gemini_cli", label="Gemini CLI", available=shutil.which("gemini") is not None, method="cli"),
        RunnerOut(name="anthropic", label="Anthropic API", available=bool(os.getenv("ANTHROPIC_API_KEY")), method="api"),
        RunnerOut(name="gemini", label="Gemini API", available=bool(os.getenv("GEMINI_API_KEY")), method="api"),
        RunnerOut(name="openrouter", label="OpenRouter", available=bool(os.getenv("OPENROUTER_API_KEY")), method="api"),
    ]


@router.get("/runners", response_model=RunnersOut)
async def get_runners():
    checks = _build_runner_checks()
    # Use the preferred runner if it's available, otherwise fall back to first available.
    if _preferred_runner and any(r.name == _preferred_runner and r.available for r in checks):
        active = _preferred_runner
    else:
        active = next((r.name for r in checks if r.available), None)
    return RunnersOut(runners=checks, active=active)


@router.put("/runner", response_model=RunnersOut)
async def set_runner(body: RunnerPreferenceIn):
    global _preferred_runner
    checks = _build_runner_checks()
    if body.name is not None:
        match = next((r for r in checks if r.name == body.name), None)
        if not match:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail=f"Unknown runner: {body.name}")
        if not match.available:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail=f"Runner '{body.name}' is not available")
    _preferred_runner = body.name
    if _preferred_runner and any(r.name == _preferred_runner and r.available for r in checks):
        active = _preferred_runner
    else:
        active = next((r.name for r in checks if r.available), None)
    return RunnersOut(runners=checks, active=active)


@router.get("/pipeline/status", response_model=PipelineStatusOut)
async def pipeline_status(session: AsyncSession = Depends(get_session)):
    running = not _pipeline_lock.acquire(blocking=False)
    if not running:
        _pipeline_lock.release()
    result = await session.execute(
        text("SELECT id, completed_at FROM ingestion_runs WHERE completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT 1")
    )
    row = result.fetchone()
    return PipelineStatusOut(
        running=running,
        last_completed_run_id=str(row[0]) if row else None,
        last_completed_at=str(row[1]) if row else None,
    )


@router.post("/pipeline/run", response_model=PipelineRunOut)
async def run_pipeline():
    if not _pipeline_lock.acquire(blocking=False):
        return PipelineRunOut(status="already_running", message="Pipeline is already running.")

    def _task():
        try:
            _run_pipeline_sync()
        finally:
            _pipeline_lock.release()

    t = threading.Thread(target=_task, daemon=True)
    t.start()
    return PipelineRunOut(status="started", message="Pipeline started in background.")


@router.get("/config", response_model=SystemConfigOut)
async def get_config():
    all_orgs = _parse_setting(settings.arxiv_orgs)
    all_cats = _parse_setting(settings.arxiv_categories)
    return SystemConfigOut(
        schedule_hour=settings.worker_schedule_hour,
        schedule_minute=settings.worker_schedule_minute,
        ideas_per_run=settings.ideas_per_run,
        arxiv_orgs=all_orgs,
        arxiv_categories=all_cats,
        active_orgs=_active_orgs if _active_orgs is not None else all_orgs,
        active_categories=_active_categories if _active_categories is not None else all_cats,
    )


@router.put("/data-sources", response_model=SystemConfigOut)
async def set_data_sources(body: DataSourcesIn):
    global _active_orgs, _active_categories
    all_orgs = _parse_setting(settings.arxiv_orgs)
    all_cats = _parse_setting(settings.arxiv_categories)
    _active_orgs = [o for o in body.orgs if o in all_orgs]
    _active_categories = [c for c in body.categories if c in all_cats]
    return SystemConfigOut(
        schedule_hour=settings.worker_schedule_hour,
        schedule_minute=settings.worker_schedule_minute,
        ideas_per_run=settings.ideas_per_run,
        arxiv_orgs=all_orgs,
        arxiv_categories=all_cats,
        active_orgs=_active_orgs,
        active_categories=_active_categories,
    )
