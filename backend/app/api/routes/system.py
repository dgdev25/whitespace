import asyncio
import json
import logging
import threading
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from app.api.deps import get_session
from app.core.config import settings
from app.db.models.user_settings import UserSettings
from app.runners.selector import set_model_prefs
from app.schemas.system import DataSourcesIn, HealthOut, PipelineConfigIn, PipelineRunOut, PipelineStatusOut, RunnerModelIn, RunnerOut, RunnerPreferenceIn, RunnersOut, ScheduleConfigIn, ScheduleStatusOut, SystemConfigOut

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/system", tags=["system"])

_pipeline_lock = threading.Lock()
_preferred_runner: str | None = None
_active_orgs: list[str] | None = None       # None = use all from settings
_active_categories: list[str] | None = None  # None = use all from settings

# Scheduling state
_schedule_enabled: bool = False
_schedule_interval_minutes: int = 60
_schedule_next_run: datetime | None = None
_schedule_timer: threading.Timer | None = None


def _parse_setting(value: str) -> list[str]:
    return [v.strip() for v in value.split(",") if v.strip()]


def _run_pipeline_sync():
    from worker.db import SessionLocal
    from worker.orchestrator import run_daily_pipeline

    with SessionLocal() as s:
        user_cfg = s.get(UserSettings, 1)
        max_src = user_cfg.max_sources_per_run if user_cfg else settings.max_sources_per_run
        cached = user_cfg.cached_analyses_count if user_cfg else settings.cached_analyses_count
        ideas = user_cfg.ideas_per_run if user_cfg else settings.ideas_per_run
        set_model_prefs(user_cfg.runner_model_prefs if user_cfg else {})
        run_daily_pipeline(s, max_sources=max_src, cached_analyses=cached, ideas_per_run=ideas)


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


@router.put("/runner-model", response_model=SystemConfigOut)
async def set_runner_model(body: RunnerModelIn, session: AsyncSession = Depends(get_session)):
    user_cfg = await _get_user_settings(session)
    prefs: dict[str, str] = dict(user_cfg.runner_model_prefs or {})
    if body.model:
        prefs[body.runner] = body.model
    else:
        prefs.pop(body.runner, None)
    user_cfg.runner_model_prefs = prefs
    await session.commit()
    set_model_prefs(prefs)
    all_orgs = _parse_setting(settings.arxiv_orgs)
    all_cats = _parse_setting(settings.arxiv_categories)
    return await _build_config_out(session, all_orgs, all_cats)


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


@router.get("/pipeline/stream")
async def pipeline_stream():
    """SSE endpoint — streams pipeline progress events as they are emitted."""
    from worker.progress import get_snapshot

    async def generate():
        idx = 0
        # Stream for up to 20 minutes then close
        for _ in range(2400):
            events, active = get_snapshot(idx)
            for event in events:
                idx += 1
                yield {"data": json.dumps(event)}
            # Close when pipeline finishes and all events have been sent
            if not active and idx > 0:
                return
            await asyncio.sleep(0.5)

    return EventSourceResponse(generate())


def _schedule_tick():
    """Called by the recurring timer — runs the pipeline then reschedules."""
    global _schedule_next_run, _schedule_timer
    if not _schedule_enabled:
        return
    if _pipeline_lock.acquire(blocking=False):
        def _task():
            try:
                _run_pipeline_sync()
            finally:
                _pipeline_lock.release()
        threading.Thread(target=_task, daemon=True).start()
    # Reschedule regardless of whether we ran (don't pile up if already running)
    _schedule_next_run = datetime.now(timezone.utc) + timedelta(minutes=_schedule_interval_minutes)
    _schedule_timer = threading.Timer(_schedule_interval_minutes * 60, _schedule_tick)
    _schedule_timer.daemon = True
    _schedule_timer.start()


@router.get("/schedule", response_model=ScheduleStatusOut)
async def get_schedule():
    return ScheduleStatusOut(
        enabled=_schedule_enabled,
        interval_minutes=_schedule_interval_minutes,
        next_run_at=_schedule_next_run.isoformat() if _schedule_next_run else None,
    )


@router.put("/schedule", response_model=ScheduleStatusOut)
async def set_schedule(body: ScheduleConfigIn):
    global _schedule_enabled, _schedule_interval_minutes, _schedule_next_run, _schedule_timer

    # Cancel any existing timer
    if _schedule_timer is not None:
        _schedule_timer.cancel()
        _schedule_timer = None

    _schedule_enabled = body.enabled
    _schedule_interval_minutes = max(5, body.interval_minutes)  # minimum 5 min

    if _schedule_enabled:
        _schedule_next_run = datetime.now(timezone.utc) + timedelta(minutes=_schedule_interval_minutes)
        _schedule_timer = threading.Timer(_schedule_interval_minutes * 60, _schedule_tick)
        _schedule_timer.daemon = True
        _schedule_timer.start()
        logger.info("Auto-schedule enabled: every %d minutes", _schedule_interval_minutes)
    else:
        _schedule_next_run = None
        logger.info("Auto-schedule disabled")

    return ScheduleStatusOut(
        enabled=_schedule_enabled,
        interval_minutes=_schedule_interval_minutes,
        next_run_at=_schedule_next_run.isoformat() if _schedule_next_run else None,
    )


async def _get_user_settings(session: AsyncSession) -> UserSettings:
    user_cfg = await session.get(UserSettings, 1)
    if user_cfg is None:
        user_cfg = UserSettings(
            id=1,
            ideas_per_run=settings.ideas_per_run,
            max_sources_per_run=settings.max_sources_per_run,
            cached_analyses_count=settings.cached_analyses_count,
            runner_model_prefs={},
        )
        session.add(user_cfg)
        await session.commit()
    return user_cfg


async def _build_config_out(session: AsyncSession, all_orgs: list[str], all_cats: list[str]) -> SystemConfigOut:
    user_cfg = await _get_user_settings(session)
    return SystemConfigOut(
        schedule_hour=settings.worker_schedule_hour,
        schedule_minute=settings.worker_schedule_minute,
        ideas_per_run=user_cfg.ideas_per_run,
        max_sources_per_run=user_cfg.max_sources_per_run,
        cached_analyses_count=user_cfg.cached_analyses_count,
        runner_model_prefs=user_cfg.runner_model_prefs or {},
        arxiv_orgs=all_orgs,
        arxiv_categories=all_cats,
        active_orgs=_active_orgs if _active_orgs is not None else all_orgs,
        active_categories=_active_categories if _active_categories is not None else all_cats,
    )


@router.get("/config", response_model=SystemConfigOut)
async def get_config(session: AsyncSession = Depends(get_session)):
    all_orgs = _parse_setting(settings.arxiv_orgs)
    all_cats = _parse_setting(settings.arxiv_categories)
    return await _build_config_out(session, all_orgs, all_cats)


@router.put("/pipeline-config", response_model=SystemConfigOut)
async def set_pipeline_config(body: PipelineConfigIn, session: AsyncSession = Depends(get_session)):
    user_cfg = await _get_user_settings(session)
    user_cfg.max_sources_per_run = max(1, body.max_sources_per_run)
    user_cfg.cached_analyses_count = max(0, body.cached_analyses_count)
    user_cfg.ideas_per_run = max(1, body.ideas_per_run)
    await session.commit()
    all_orgs = _parse_setting(settings.arxiv_orgs)
    all_cats = _parse_setting(settings.arxiv_categories)
    return await _build_config_out(session, all_orgs, all_cats)


@router.put("/data-sources", response_model=SystemConfigOut)
async def set_data_sources(body: DataSourcesIn, session: AsyncSession = Depends(get_session)):
    global _active_orgs, _active_categories
    all_orgs = _parse_setting(settings.arxiv_orgs)
    all_cats = _parse_setting(settings.arxiv_categories)
    _active_orgs = [o for o in body.orgs if o in all_orgs]
    _active_categories = [c for c in body.categories if c in all_cats]
    return await _build_config_out(session, all_orgs, all_cats)
