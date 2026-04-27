import logging
import threading
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_session
from app.db.models.project import Project, ProjectIdea, ProjectRun
from app.schemas.project import (
    ProjectCreate,
    ProjectIdeaOut,
    ProjectOut,
    ProjectRunOut,
    ProjectRunStatusOut,
    ProjectUpdate,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/projects", tags=["projects"])

# Per-project run locks: project_id -> Lock
_project_run_locks: dict[int, threading.Lock] = {}
# Track active run ids: project_id -> run_id
_active_project_runs: dict[int, int] = {}
_locks_meta = threading.Lock()


def _get_project_lock(project_id: int) -> threading.Lock:
    with _locks_meta:
        if project_id not in _project_run_locks:
            _project_run_locks[project_id] = threading.Lock()
        return _project_run_locks[project_id]


def _run_project_pipeline_sync(project_id: int, run_id: int) -> None:
    from worker.db import SessionLocal
    from worker.orchestrator import run_daily_pipeline

    with SessionLocal() as s:
        run = s.get(ProjectRun, run_id)
        project = s.get(Project, project_id)
        if not run or not project:
            return
        try:
            src_cfg = project.source_config or {}
            pip_cfg = project.pipeline_config or {}
            enabled_sources = src_cfg.get("enabled_sources") or None
            orgs = src_cfg.get("orgs") or None
            categories = src_cfg.get("categories") or None
            github_repos = src_cfg.get("github_repos") or []
            max_sources = pip_cfg.get("max_sources_per_run", 40)
            cached = pip_cfg.get("cached_analyses_count", 30)
            n_ideas = pip_cfg.get("ideas_per_run", 8)
            focus = project.focus_statement

            run_daily_pipeline(
                s,
                max_sources=max_sources,
                cached_analyses=cached,
                ideas_per_run=n_ideas,
                orgs=orgs,
                categories=categories,
                github_repos=github_repos,
                enabled_sources=enabled_sources,
                focus_context=focus,
                project_run_id=run_id,
                project_id=project_id,
            )
            run = s.get(ProjectRun, run_id)
            if run:
                run.status = "done"
                run.completed_at = datetime.now(timezone.utc)
                s.commit()
        except Exception as exc:
            logger.error("Project pipeline failed for project %d run %d: %s", project_id, run_id, exc)
            run = s.get(ProjectRun, run_id)
            if run:
                run.status = "error"
                run.error = str(exc)
                run.completed_at = datetime.now(timezone.utc)
                s.commit()
        finally:
            _active_project_runs.pop(project_id, None)


async def _project_out(session: AsyncSession, project: Project) -> ProjectOut:
    ideas_count_result = await session.execute(
        select(func.count()).where(ProjectIdea.project_id == project.id)
    )
    ideas_count = ideas_count_result.scalar() or 0

    # papers_count: count distinct paper_refs across all project ideas
    # Use 0 for now; paper refs are stored as JSON arrays, aggregation requires iteration
    papers_count = 0

    last_run_result = await session.execute(
        select(ProjectRun)
        .where(ProjectRun.project_id == project.id)
        .order_by(ProjectRun.started_at.desc())
        .limit(1)
    )
    last_run_row = last_run_result.scalar_one_or_none()
    last_run = ProjectRunOut.model_validate(last_run_row) if last_run_row else None

    return ProjectOut(
        id=project.id,
        name=project.name,
        domain=project.domain,
        description=project.description,
        focus_statement=project.focus_statement,
        source_config=project.source_config or {},
        pipeline_config=project.pipeline_config or {},
        created_at=project.created_at,
        ideas_count=ideas_count,
        papers_count=papers_count,
        last_run=last_run,
    )


@router.get("", response_model=list[ProjectOut])
async def list_projects(session: AsyncSession = Depends(get_session)) -> list[ProjectOut]:
    result = await session.execute(select(Project).order_by(Project.created_at.desc()))
    projects = result.scalars().all()
    return [await _project_out(session, p) for p in projects]


@router.post("", response_model=ProjectOut, status_code=201)
async def create_project(
    body: ProjectCreate, session: AsyncSession = Depends(get_session)
) -> ProjectOut:
    project = Project(
        name=body.name,
        domain=body.domain,
        description=body.description,
        focus_statement=body.focus_statement,
        source_config=body.source_config,
        pipeline_config=body.pipeline_config,
    )
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return await _project_out(session, project)


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: int, session: AsyncSession = Depends(get_session)
) -> ProjectOut:
    project = await session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return await _project_out(session, project)


@router.put("/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: int,
    body: ProjectUpdate,
    session: AsyncSession = Depends(get_session),
) -> ProjectOut:
    project = await session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    if body.name is not None:
        project.name = body.name
    if body.domain is not None:
        project.domain = body.domain
    if body.description is not None:
        project.description = body.description
    if body.focus_statement is not None:
        project.focus_statement = body.focus_statement
    if body.source_config is not None:
        project.source_config = body.source_config
    if body.pipeline_config is not None:
        project.pipeline_config = body.pipeline_config

    await session.commit()
    await session.refresh(project)
    return await _project_out(session, project)


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: int, session: AsyncSession = Depends(get_session)
) -> None:
    project = await session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    await session.delete(project)
    await session.commit()


@router.get("/{project_id}/ideas", response_model=list[ProjectIdeaOut])
async def list_project_ideas(
    project_id: int,
    offset: int = 0,
    limit: int = 50,
    session: AsyncSession = Depends(get_session),
) -> list[ProjectIdeaOut]:
    project = await session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    result = await session.execute(
        select(ProjectIdea)
        .where(ProjectIdea.project_id == project_id)
        .order_by(ProjectIdea.score.desc())
        .offset(offset)
        .limit(limit)
    )
    ideas = result.scalars().all()
    return [ProjectIdeaOut.model_validate(i) for i in ideas]


@router.get("/{project_id}/runs", response_model=list[ProjectRunOut])
async def list_project_runs(
    project_id: int,
    session: AsyncSession = Depends(get_session),
) -> list[ProjectRunOut]:
    project = await session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    result = await session.execute(
        select(ProjectRun)
        .where(ProjectRun.project_id == project_id)
        .order_by(ProjectRun.started_at.desc())
    )
    runs = result.scalars().all()
    return [ProjectRunOut.model_validate(r) for r in runs]


@router.post("/{project_id}/run", response_model=ProjectRunStatusOut)
async def trigger_project_run(
    project_id: int, session: AsyncSession = Depends(get_session)
) -> ProjectRunStatusOut:
    project = await session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    lock = _get_project_lock(project_id)
    if not lock.acquire(blocking=False):
        # Already running — return current run status
        run_id = _active_project_runs.get(project_id)
        current_run: Optional[ProjectRunOut] = None
        if run_id is not None:
            run_row = await session.get(ProjectRun, run_id)
            if run_row:
                current_run = ProjectRunOut.model_validate(run_row)
        return ProjectRunStatusOut(running=True, current_run=current_run)

    # Create a new ProjectRun record
    run = ProjectRun(
        project_id=project_id,
        status="running",
        stages=[],
        papers_fetched=0,
        ideas_generated=0,
    )
    session.add(run)
    await session.commit()
    await session.refresh(run)
    run_id = run.id
    _active_project_runs[project_id] = run_id

    def _task() -> None:
        try:
            _run_project_pipeline_sync(project_id, run_id)
        finally:
            lock.release()

    t = threading.Thread(target=_task, daemon=True)
    t.start()

    current_run = ProjectRunOut.model_validate(run)
    return ProjectRunStatusOut(running=True, current_run=current_run)


@router.get("/{project_id}/run/status", response_model=ProjectRunStatusOut)
async def get_project_run_status(
    project_id: int, session: AsyncSession = Depends(get_session)
) -> ProjectRunStatusOut:
    project = await session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    lock = _get_project_lock(project_id)
    running = not lock.acquire(blocking=False)
    if not running:
        lock.release()

    current_run: Optional[ProjectRunOut] = None
    run_id = _active_project_runs.get(project_id)
    if run_id is not None:
        run_row = await session.get(ProjectRun, run_id)
        if run_row:
            current_run = ProjectRunOut.model_validate(run_row)
    elif running:
        # Lock is held but no active run tracked — check most recent running run
        result = await session.execute(
            select(ProjectRun)
            .where(ProjectRun.project_id == project_id, ProjectRun.status == "running")
            .order_by(ProjectRun.started_at.desc())
            .limit(1)
        )
        run_row = result.scalar_one_or_none()
        if run_row:
            current_run = ProjectRunOut.model_validate(run_row)

    return ProjectRunStatusOut(running=running, current_run=current_run)
