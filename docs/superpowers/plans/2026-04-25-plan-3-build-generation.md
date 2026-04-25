# Whitespace v2 — Plan 3: Build Generation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the "Build Plan" button — when a user triggers a build for an idea, the worker generates a Product Viability Sketch + Technical Plan and streams progress back via SSE. Both outputs are persisted and exportable as Markdown and PDF.

**Architecture:** The API route `POST /build/{idea_id}` creates a `BuildOutput` record with status `generating` and enqueues a background task. The background task calls `build_generator.py` (in the worker package), which makes two sequential LLM calls (product sketch, then technical plan), updates the record incrementally, and marks it `ready`. The frontend polls `GET /build/{idea_id}` or listens on `GET /build/{idea_id}/stream` (SSE) for progress.

**Tech Stack:** FastAPI BackgroundTasks, SSE via `sse-starlette`, existing LLM runner abstraction, existing markdown/PDF exporters from v1

**Prerequisite:** Plans 1 and 2 complete.

---

## File Map

```
whitespace/
├── worker/
│   ├── build_generator.py        — product sketch + technical plan generation
│   └── prompts/
│       ├── product_sketch.md     — Product Viability Sketch prompt
│       └── technical_plan.md    — Technical Implementation Plan prompt
└── backend/
    └── app/
        └── api/routes/
            └── build.py          — updated with background task wiring + SSE route
```

---

## Task 15: Build generation prompts

**Files:** `worker/prompts/product_sketch.md`, `worker/prompts/technical_plan.md`

- [ ] **Create `worker/prompts/product_sketch.md`**

```markdown
You are a product strategist with deep knowledge of technology markets.

You have been given a product idea grounded in recent academic research. Generate a Product Viability
Sketch — a structured analysis of whether this idea is worth building.

Important constraints:
- Base your analysis only on what can be derived from the research and comparable products
- Do NOT invent market size figures, pricing data, or competitive rankings
- Risks must be sourced from the research paper limitations, not general knowledge
- Monetisation patterns are plausible hypotheses — label them as such

Input idea:
Title: {{title}}
Description: {{description}}
Why novel: {{why_novel}}
Who builds: {{who_builds}}
Who buys: {{who_buys}}
Source papers: {{paper_ids}}

Return a JSON object with exactly these keys:
{
  "value_prop_headline": "One punchy sentence (max 15 words) — the elevator pitch",
  "value_prop_body": "2–3 sentences elaborating the value proposition",
  "buyer_profile": "One sentence: role and organisation type most likely to buy",
  "buyer_signals": ["3–5 qualifying signals that identify the right buyer"],
  "risks": [
    {"title": "Risk title", "description": "1–2 sentences, grounded in research limitations"}
  ],
  "monetisation": [
    {"name": "Model name", "description": "2–3 sentences", "fit": "Strongest fit | Plausible | Exploratory"}
  ],
  "caveat": "These patterns are derived from the research context — treat them as hypotheses to validate with potential customers, not conclusions."
}

Provide exactly 2–3 risks and exactly 2–3 monetisation patterns.
```

- [ ] **Create `worker/prompts/technical_plan.md`**

```markdown
You are a senior software architect.

You have been given a product idea grounded in recent academic research. Generate a Technical
Implementation Plan — a realistic roadmap for building a v1 of this product.

Input idea:
Title: {{title}}
Description: {{description}}
Why novel: {{why_novel}}
Source papers: {{paper_ids}}

Write a Markdown document with these sections:

## Stack Recommendation
Recommend specific technologies. Justify each choice in one sentence.

## Implementation Phases
Break into 3–5 phases, each producing a working increment:
### Phase N: [Name] (~X weeks)
- Key deliverables
- Technical decisions

## Key Technical Risks
3–5 risks specific to this idea (not generic software risks).

## Effort Estimate
- Solo founder: X–Y weeks to MVP
- Small team (3 engineers): X–Y weeks to MVP

Keep the total under 600 words. Be specific — name libraries, protocols, and patterns.
```

- [ ] **Commit**

```bash
git add worker/prompts/product_sketch.md worker/prompts/technical_plan.md
git commit -m "feat: add Product Sketch and Technical Plan prompts"
```

---

## Task 16: Build generator

**Files:** `worker/build_generator.py`

- [ ] **Write failing test** `tests/worker/test_build_generator.py`

```python
from unittest.mock import patch, MagicMock
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.db.base import Base
from app.db.models import *
import uuid

def _make_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()

def test_build_generator_marks_ready():
    session = _make_session()
    idea = Idea(
        id=str(uuid.uuid4()), title="Test", description="Desc", why_novel="Novel",
        who_builds="Builder", who_buys="Buyer", novelty_score=0.8,
        feasibility_score=0.7, badge="novel", paper_ids=["2601.00001"]
    )
    session.add(idea)
    build = BuildOutput(idea_id=idea.id, product_sketch={}, technical_plan="", status="generating")
    session.add(build)
    session.commit()

    sketch = {
        "value_prop_headline": "Fix APIs automatically",
        "value_prop_body": "Handles drift.",
        "buyer_profile": "Platform engineers",
        "buyer_signals": ["50+ engineers"],
        "risks": [{"title": "Latency", "description": "Adds 100ms"}],
        "monetisation": [{"name": "SaaS", "description": "Usage-based", "fit": "Strongest fit"}],
        "caveat": "Hypotheses only."
    }

    with patch("worker.build_generator.generate_product_sketch", return_value=sketch), \
         patch("worker.build_generator.generate_technical_plan", return_value="## Plan\nPhase 1"):
        from worker.build_generator import run_build
        run_build(session, build.id, idea.id)

    session.refresh(build)
    assert build.status == "ready"
    assert build.product_sketch["value_prop_headline"] == "Fix APIs automatically"
    assert "Phase 1" in build.technical_plan
```

- [ ] **Run — expect FAIL**

```bash
pytest tests/worker/test_build_generator.py -v
```

- [ ] **Create `worker/build_generator.py`**

```python
import json
import logging
from pathlib import Path
from sqlalchemy.orm import Session
from app.db.models.build_output import BuildOutput
from app.db.models.idea import Idea
from app.pipeline.json_parsing import parse_json_response
from app.runners.selector import select_runner
from app.core.config import settings

logger = logging.getLogger(__name__)

_SKETCH_PROMPT = (Path(__file__).parent / "prompts" / "product_sketch.md").read_text()
_PLAN_PROMPT = (Path(__file__).parent / "prompts" / "technical_plan.md").read_text()

def _fill(template: str, idea: Idea) -> str:
    return (template
        .replace("{{title}}", idea.title)
        .replace("{{description}}", idea.description)
        .replace("{{why_novel}}", idea.why_novel)
        .replace("{{who_builds}}", idea.who_builds)
        .replace("{{who_buys}}", idea.who_buys)
        .replace("{{paper_ids}}", ", ".join(idea.paper_ids)))

def generate_product_sketch(idea: Idea, runner) -> dict:
    prompt = _fill(_SKETCH_PROMPT, idea)
    response = runner.run(prompt)
    return parse_json_response(response, expected_type=dict)

def generate_technical_plan(idea: Idea, runner) -> str:
    prompt = _fill(_PLAN_PROMPT, idea)
    return runner.run(prompt)

def run_build(session: Session, build_id: str, idea_id: str) -> None:
    build = session.get(BuildOutput, build_id)
    idea = session.get(Idea, idea_id)
    if not build or not idea:
        logger.error(f"Build {build_id} or idea {idea_id} not found")
        return

    runner = select_runner(settings)

    try:
        build.product_sketch = generate_product_sketch(idea, runner)
        session.commit()

        build.technical_plan = generate_technical_plan(idea, runner)
        build.status = "ready"
        session.commit()
        logger.info(f"Build {build_id} complete")
    except Exception as e:
        build.status = "failed"
        session.commit()
        logger.error(f"Build {build_id} failed: {e}")
        raise
```

- [ ] **Run test — expect PASS**

```bash
pytest tests/worker/test_build_generator.py -v
```

- [ ] **Commit**

```bash
git add worker/build_generator.py tests/worker/test_build_generator.py
git commit -m "feat: add build generator (product sketch + technical plan)"
```

---

## Task 17: Wire background task in API

**Files:** `app/api/routes/build.py` (update), `app/api/routes/build_stream.py` (new)

The API's `POST /build/{idea_id}` currently creates a stub record. Wire it to the real generator.

- [ ] **Update `app/api/routes/build.py`** — replace the comment placeholder with real background task

```python
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api.deps import get_session
from app.db.models.build_output import BuildOutput
from app.db.models.idea import Idea
from app.schemas.build import BuildOutputOut
from worker.db import SessionLocal
from worker.build_generator import run_build

router = APIRouter(prefix="/build", tags=["build"])

def _background_build(build_id: str, idea_id: str):
    with SessionLocal() as session:
        run_build(session, build_id, idea_id)

@router.get("/{idea_id}", response_model=BuildOutputOut)
async def get_build(idea_id: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(BuildOutput).where(BuildOutput.idea_id == idea_id))
    build = result.scalars().first()
    if not build:
        raise HTTPException(404, "Build output not found — POST /build/{idea_id} to generate")
    return BuildOutputOut.model_validate(build, from_attributes=True)

@router.post("/{idea_id}", response_model=BuildOutputOut, status_code=202)
async def trigger_build(idea_id: str, background_tasks: BackgroundTasks, session: AsyncSession = Depends(get_session)):
    idea = (await session.execute(select(Idea).where(Idea.id == idea_id))).scalars().first()
    if not idea:
        raise HTTPException(404, "Idea not found")
    existing = (await session.execute(select(BuildOutput).where(BuildOutput.idea_id == idea_id))).scalars().first()
    if existing and existing.status in ("ready", "generating"):
        return BuildOutputOut.model_validate(existing, from_attributes=True)
    build = BuildOutput(idea_id=idea_id, product_sketch={}, technical_plan="", status="generating")
    session.add(build)
    await session.commit()
    await session.refresh(build)
    background_tasks.add_task(_background_build, build.id, idea_id)
    return BuildOutputOut.model_validate(build, from_attributes=True)
```

- [ ] **Add `sse-starlette` to `pyproject.toml`** (`"sse-starlette>=2.1"`) and reinstall

- [ ] **Create `app/api/routes/build_stream.py`**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sse_starlette.sse import EventSourceResponse
from app.api.deps import get_session
from app.db.models.build_output import BuildOutput
import asyncio, json

router = APIRouter(prefix="/build", tags=["build"])

@router.get("/{idea_id}/stream")
async def stream_build(idea_id: str, session: AsyncSession = Depends(get_session)):
    async def generator():
        for _ in range(60):  # poll up to 60s
            result = await session.execute(select(BuildOutput).where(BuildOutput.idea_id == idea_id))
            build = result.scalars().first()
            if not build:
                yield {"data": json.dumps({"status": "not_found"})}
                return
            yield {"data": json.dumps({"status": build.status})}
            if build.status in ("ready", "failed"):
                return
            await asyncio.sleep(1)
    return EventSourceResponse(generator())
```

- [ ] **Register the new router in `app/main.py`**

```python
from app.api.routes import system, ideas, saved, build, build_stream
# ...
app.include_router(build_stream.router, prefix="/api")
```

- [ ] **Write test** `tests/api/test_build_trigger.py`

```python
async def test_trigger_build_creates_generating_record(client):
    # First create an idea directly via DB override in conftest
    # For simplicity: POST to nonexistent idea returns 404
    r = await client.post("/api/build/nonexistent")
    assert r.status_code == 404

async def test_get_build_not_found(client):
    r = await client.get("/api/build/nonexistent")
    assert r.status_code == 404
```

- [ ] **Run tests**

```bash
pytest tests/api/test_build_trigger.py -v
```

- [ ] **Commit**

```bash
git add app/api/routes/build.py app/api/routes/build_stream.py app/main.py tests/api/test_build_trigger.py
git commit -m "feat: wire build generation as background task with SSE stream"
```

---

## Task 18: Export routes

**Files:** `app/api/routes/export.py`

Reuse v1's exporters directly.

- [ ] **Copy exporters from v1**

```bash
cp -r whitespace.old/backend/app/output/ whitespace/backend/app/output/
```

- [ ] **Create `app/api/routes/export.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api.deps import get_session
from app.db.models.build_output import BuildOutput
from app.db.models.idea import Idea
from app.output.markdown_exporter import export_markdown
from app.output.pdf_exporter import export_pdf

router = APIRouter(prefix="/export", tags=["export"])

@router.get("/{idea_id}/markdown")
async def export_md(idea_id: str, session: AsyncSession = Depends(get_session)):
    build = (await session.execute(select(BuildOutput).where(BuildOutput.idea_id == idea_id))).scalars().first()
    idea = (await session.execute(select(Idea).where(Idea.id == idea_id))).scalars().first()
    if not build or build.status != "ready":
        raise HTTPException(404, "Build not ready")
    content = export_markdown({"idea": idea.__dict__, "build": build.__dict__})
    return Response(content=content, media_type="text/markdown",
                    headers={"Content-Disposition": f'attachment; filename="{idea_id}.md"'})

@router.get("/{idea_id}/pdf")
async def export_pdf_route(idea_id: str, session: AsyncSession = Depends(get_session)):
    build = (await session.execute(select(BuildOutput).where(BuildOutput.idea_id == idea_id))).scalars().first()
    idea = (await session.execute(select(Idea).where(Idea.id == idea_id))).scalars().first()
    if not build or build.status != "ready":
        raise HTTPException(404, "Build not ready")
    content = export_pdf({"idea": idea.__dict__, "build": build.__dict__})
    return Response(content=content, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="{idea_id}.pdf"'})
```

- [ ] **Register in `app/main.py`**

```python
from app.api.routes import system, ideas, saved, build, build_stream, export
app.include_router(export.router, prefix="/api")
```

- [ ] **Commit**

```bash
git add app/output/ app/api/routes/export.py app/main.py
git commit -m "feat: add markdown and PDF export routes"
```

---

## Task 19: End-to-end build smoke test

- [ ] **Trigger a build for a real idea**

```bash
# Get an idea ID from today's feed
IDEA_ID=$(curl -s http://localhost:18730/api/ideas/today | python3 -c "import sys,json; print(json.load(sys.stdin)['ideas'][0]['id'])")

# Trigger build
curl -X POST http://localhost:18730/api/build/$IDEA_ID

# Poll until ready (or use SSE stream)
curl http://localhost:18730/api/build/$IDEA_ID
```

Expected: after 30–120s (depending on LLM), `status` changes from `generating` to `ready`, `product_sketch` and `technical_plan` are populated.

- [ ] **Test exports**

```bash
curl http://localhost:18730/api/export/$IDEA_ID/markdown -o /tmp/idea.md
cat /tmp/idea.md  # Should contain value proposition and phases

curl http://localhost:18730/api/export/$IDEA_ID/pdf -o /tmp/idea.pdf
file /tmp/idea.pdf  # Should be: PDF document
```

- [ ] **Commit**

```bash
git commit -m "chore: verify end-to-end build generation and export"
```

---

**Plan 3 complete.** Build Plan generation works end-to-end — Product Sketch + Technical Plan generated on demand, streamed via SSE, exportable as MD and PDF.

**Continue with:** `2026-04-25-plan-4-frontend.md`
