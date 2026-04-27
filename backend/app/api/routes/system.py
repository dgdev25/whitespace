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
from app.schemas.system import DataSourcesIn, GitHubReposIn, HealthOut, OrgImportIn, OrgImportStatusOut, PipelineConfigIn, PipelineRunOut, PipelineStatusOut, RunnerModelIn, RunnerOut, RunnerPreferenceIn, RunnersOut, ScheduleConfigIn, ScheduleStatusOut, SourceToggleIn, SystemConfigOut

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/system", tags=["system"])

_pipeline_lock = threading.Lock()
_preferred_runner: str | None = None
_active_orgs: list[str] | None = None       # None = use all from settings
_active_categories: list[str] | None = None  # None = use all from settings

_ALL_SOURCE_KEYS = ["arxiv", "semantic_scholar", "blogs", "github", "acl_anthology", "open_alex"]


def _resolve_enabled_sources(raw: dict | None) -> dict[str, bool]:
    return {k: (raw or {}).get(k, True) for k in _ALL_SOURCE_KEYS}

# Org import state
_org_import_lock = threading.Lock()
_org_import_state: dict = {
    "running": False, "handle": None, "scanned": 0,
    "total": None, "imported": 0, "message": "",
}

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
        github_repos = list(user_cfg.github_repos or []) if user_cfg else []
        enabled_sources = _resolve_enabled_sources(user_cfg.enabled_sources if user_cfg else None)
        run_daily_pipeline(
            s,
            max_sources=max_src,
            cached_analyses=cached,
            ideas_per_run=ideas,
            orgs=_active_orgs,
            categories=_active_categories,
            github_repos=github_repos,
            enabled_sources=enabled_sources,
        )


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
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(user_cfg, "runner_model_prefs")
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


def _import_handle_sync(handle: str) -> None:
    from sqlalchemy import text as sql_text
    from sqlalchemy.orm.attributes import flag_modified
    from app.db.models.paper import Paper
    from app.db.models.user_settings import UserSettings
    from worker.db import SessionLocal
    from worker.stages.fetch_github import fetch_handle_repos

    try:
        with SessionLocal() as session:
            existing_ids = {r[0] for r in session.execute(sql_text("SELECT arxiv_id FROM papers")).all()}

            def _progress(scanned: int, total: int) -> None:
                _org_import_state.update({"scanned": scanned, "total": total,
                                          "message": f"Scanning {scanned} of {total}…"})

            repos = fetch_handle_repos(handle, existing_ids, on_progress=_progress)
            for p in repos:
                session.add(Paper(
                    arxiv_id=p["arxiv_id"],
                    title=p["title"],
                    authors=p["authors"],
                    abstract=p.get("abstract", ""),
                    full_text=p.get("full_text", ""),
                    categories=p.get("categories", ""),
                    published_date=p.get("published_date", ""),
                    url=p.get("url", ""),
                    source="github",
                ))

            # Add imported repo slugs to UserSettings.github_repos so they appear in the UI
            # and are re-fetched on future pipeline runs.
            new_slugs = [p["title"] for p in repos]  # title = "owner/repo"
            if new_slugs:
                user_cfg = session.get(UserSettings, 1)
                if user_cfg is None:
                    user_cfg = UserSettings(
                        id=1, ideas_per_run=8, max_sources_per_run=40,
                        cached_analyses_count=30, runner_model_prefs={},
                        github_repos=[], enabled_sources={},
                    )
                    session.add(user_cfg)
                existing_slugs = list(user_cfg.github_repos or [])
                merged = existing_slugs + [s for s in new_slugs if s not in existing_slugs]
                user_cfg.github_repos = merged
                flag_modified(user_cfg, "github_repos")

            session.commit()
            _org_import_state.update({
                "running": False,
                "imported": len(repos),
                "message": f"Done — {len(repos)} new repo(s) added from {handle}",
            })
    except Exception as exc:
        logger.error("Org import failed: %s", exc)
        _org_import_state.update({"running": False, "message": f"Error: {exc}"})
    finally:
        _org_import_lock.release()


@router.post("/github-repos/import-org", response_model=OrgImportStatusOut)
async def import_org_repos(body: OrgImportIn):
    global _org_import_state
    handle = body.handle.strip().lstrip("@").rstrip("/")
    if not handle:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="handle must not be empty")
    if not _org_import_lock.acquire(blocking=False):
        return OrgImportStatusOut(**_org_import_state)
    _org_import_state = {
        "running": True, "handle": handle, "scanned": 0,
        "total": None, "imported": 0, "message": f"Starting scan of {handle}…",
    }
    threading.Thread(target=_import_handle_sync, args=(handle,), daemon=True).start()
    return OrgImportStatusOut(**_org_import_state)


@router.get("/github-repos/import-org/status", response_model=OrgImportStatusOut)
async def get_org_import_status():
    with _org_import_lock:
        snapshot = dict(_org_import_state)
    return OrgImportStatusOut(**snapshot)


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
        github_repos=list(user_cfg.github_repos or []),
        enabled_sources=_resolve_enabled_sources(user_cfg.enabled_sources),
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


@router.put("/github-repos", response_model=SystemConfigOut)
async def set_github_repos(body: GitHubReposIn, session: AsyncSession = Depends(get_session)):
    import re
    from sqlalchemy.orm.attributes import flag_modified
    _slug_re = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
    valid = [r for r in body.repos if _slug_re.match(r)]
    user_cfg = await _get_user_settings(session)
    user_cfg.github_repos = valid
    flag_modified(user_cfg, "github_repos")
    await session.commit()
    all_orgs = _parse_setting(settings.arxiv_orgs)
    all_cats = _parse_setting(settings.arxiv_categories)
    return await _build_config_out(session, all_orgs, all_cats)


@router.put("/sources/toggle", response_model=SystemConfigOut)
async def toggle_source(body: SourceToggleIn, session: AsyncSession = Depends(get_session)):
    from fastapi import HTTPException
    from sqlalchemy.orm.attributes import flag_modified
    if body.source not in _ALL_SOURCE_KEYS:
        raise HTTPException(status_code=400, detail=f"Unknown source: {body.source!r}")
    user_cfg = await _get_user_settings(session)
    current = dict(user_cfg.enabled_sources or {})
    current[body.source] = body.enabled
    user_cfg.enabled_sources = current
    flag_modified(user_cfg, "enabled_sources")
    await session.commit()
    all_orgs = _parse_setting(settings.arxiv_orgs)
    all_cats = _parse_setting(settings.arxiv_categories)
    return await _build_config_out(session, all_orgs, all_cats)
