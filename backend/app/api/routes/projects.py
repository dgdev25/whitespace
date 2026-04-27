import logging
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import asyncio
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
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

_PRD_TEMPLATE: str | None = None


def _get_prd_template() -> str:
    global _PRD_TEMPLATE
    if _PRD_TEMPLATE is None:
        _PRD_TEMPLATE = (Path(__file__).parent.parent.parent.parent / "worker" / "prompts" / "prd.md").read_text()
    return _PRD_TEMPLATE

# Per-project run locks: project_id -> Lock
_project_run_locks: dict[int, threading.Lock] = {}
# Track active run ids: project_id -> run_id
_active_project_runs: dict[int, int] = {}
_locks_meta = threading.Lock()

# Ordered stage definitions — name matches prog.emit() step keys
_STAGE_META: list[tuple[str, str]] = [
    ("fetch_arxiv",  "Fetch arXiv"),
    ("fetch_s2",     "Fetch Semantic Scholar"),
    ("fetch_blogs",  "Fetch Blogs"),
    ("fetch_github", "Fetch GitHub"),
    ("fetch_acl",    "Fetch ACL Anthology"),
    ("fetch_oa",     "Fetch OpenAlex"),
    ("analyse",      "Analyse Sources"),
    ("critique",     "Critical Review"),
    ("gap_map",      "Gap Map"),
    ("synthesise",   "Synthesise Ideas"),
    ("score",        "Score Ideas"),
    ("select",       "Select Ideas"),
]


def _stages_from_prog(events: list[dict]) -> list[dict]:
    """Collapse prog events to one entry per step (last event wins)."""
    latest: dict[str, dict] = {}
    for ev in events:
        latest[ev["step"]] = ev
    result = []
    for name, label in _STAGE_META:
        if name in latest:
            ev = latest[name]
            result.append({"name": name, "label": label, "message": ev["message"], "status": ev["status"]})
    return result


def _get_project_lock(project_id: int) -> threading.Lock:
    with _locks_meta:
        if project_id not in _project_run_locks:
            _project_run_locks[project_id] = threading.Lock()
        return _project_run_locks[project_id]


def _run_project_pipeline_sync(project_id: int, run_id: int) -> None:
    from worker.db import SessionLocal
    from worker.orchestrator import run_daily_pipeline
    from worker import progress as prog

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
            events, _ = prog.get_snapshot()
            final_stages = _stages_from_prog(events)
            run = s.get(ProjectRun, run_id)
            if run:
                run.status = "done"
                run.stages = final_stages
                run.completed_at = datetime.now(timezone.utc)
                s.commit()
        except Exception as exc:
            logger.error("Project pipeline failed for project %d run %d: %s", project_id, run_id, exc, exc_info=True)
            events, _ = prog.get_snapshot()
            final_stages = _stages_from_prog(events)
            run = s.get(ProjectRun, run_id)
            if run:
                run.status = "error"
                run.stages = final_stages
                run.error = type(exc).__name__  # store class name only, not internal message
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


@router.get("/{project_id}/ideas/{idea_id}", response_model=ProjectIdeaOut)
async def get_project_idea(
    project_id: int,
    idea_id: str,
    session: AsyncSession = Depends(get_session),
) -> ProjectIdeaOut:
    project = await session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    result = await session.execute(
        select(ProjectIdea).where(ProjectIdea.project_id == project_id, ProjectIdea.id == idea_id)
    )
    idea = result.scalar_one_or_none()
    if idea is None:
        raise HTTPException(status_code=404, detail="Idea not found")
    return ProjectIdeaOut.model_validate(idea)


class PrdResponse(BaseModel):
    prd: str


def _generate_prd_sync(project_id: int, idea_id: str) -> str:
    from worker.db import SessionLocal
    from worker.build_generator import generate_prd
    from app.runners.selector import _default_runners, select_runner_or_raise

    with SessionLocal() as s:
        idea = s.get(ProjectIdea, idea_id)
        if not idea or idea.project_id != project_id:
            raise ValueError("Idea not found")

        runner = select_runner_or_raise(_default_runners())

        # Build a paper refs string from stored IDs
        paper_refs = ", ".join(idea.paper_refs) if idea.paper_refs else ""

        prd_template = _get_prd_template()

        def _s(v: str) -> str:
            return v.replace("{{", "{ {").replace("}}", "} }") if v else ""

        prompt = (prd_template
            .replace("{{title}}", _s(idea.title))
            .replace("{{description}}", _s(idea.description))
            .replace("{{why_novel}}", _s(idea.why_novel or ""))
            .replace("{{who_builds}}", _s(idea.who_builds or ""))
            .replace("{{who_buys}}", _s(idea.who_buys or ""))
            .replace("{{paper_ids}}", paper_refs))

        prd_text = runner.run(prompt)
        # Strip any preamble before the first markdown heading
        lines = prd_text.splitlines()
        for i, line in enumerate(lines):
            if line.startswith("#"):
                prd_text = "\n".join(lines[i:]).strip()
                break

        idea.prd = prd_text
        s.commit()
        return prd_text


@router.post("/{project_id}/ideas/{idea_id}/prd", response_model=PrdResponse)
async def generate_project_idea_prd(
    project_id: int,
    idea_id: str,
    session: AsyncSession = Depends(get_session),
) -> PrdResponse:
    project = await session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    result = await session.execute(
        select(ProjectIdea).where(ProjectIdea.project_id == project_id, ProjectIdea.id == idea_id)
    )
    idea = result.scalar_one_or_none()
    if idea is None:
        raise HTTPException(status_code=404, detail="Idea not found")

    loop = asyncio.get_event_loop()
    prd_text = await loop.run_in_executor(None, _generate_prd_sync, project_id, idea_id)
    return PrdResponse(prd=prd_text)


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
    from worker import progress as prog

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
        result = await session.execute(
            select(ProjectRun)
            .where(ProjectRun.project_id == project_id, ProjectRun.status == "running")
            .order_by(ProjectRun.started_at.desc())
            .limit(1)
        )
        run_row = result.scalar_one_or_none()
        if run_row:
            current_run = ProjectRunOut.model_validate(run_row)
    else:
        # Not running — return the most recent completed run so the UI shows its stages
        result = await session.execute(
            select(ProjectRun)
            .where(ProjectRun.project_id == project_id)
            .order_by(ProjectRun.started_at.desc())
            .limit(1)
        )
        run_row = result.scalar_one_or_none()
        if run_row:
            current_run = ProjectRunOut.model_validate(run_row)

    # Overlay live prog stages while a run is in-flight so the UI updates in real-time
    if running and current_run is not None:
        events, _ = prog.get_snapshot()
        live_stages = _stages_from_prog(events)
        if live_stages:
            current_run = current_run.model_copy(update={"stages": live_stages})

    return ProjectRunStatusOut(running=running, current_run=current_run)
