# Whitespace v2 — Plan 2: Worker Pipeline

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the standalone worker process that ingests arXiv papers daily, synthesises product ideas, scores them, and writes a pre-generated idea pool to the database. After this plan, the feed is live with real ideas.

**Architecture:** Separate Python process (`worker/`) connected to the same PostgreSQL database as the API. APScheduler triggers the daily pipeline at 02:00. On first run (empty DB), the pipeline runs immediately. Reuses v1's ingestion, chunking, analysis, synthesis, and scoring stages with prompt updates.

**Tech Stack:** Python 3.12, APScheduler, SQLAlchemy (sync, correct for single-threaded worker), tiktoken, pdfplumber, requests (arXiv API), existing LLM runner abstraction from v1

**Prerequisite:** Plan 1 complete — database schema migrated, API running. Copy the following directories from `whitespace.old/backend/app/` into `whitespace/backend/app/`:
- `runners/` (all 5 runners + selector + base — unchanged)
- `ingestion/` (arxiv.py, pdf.py, text_cleaner.py — unchanged)
- `embeddings/` (model.py — unchanged)
- `vector/` (client.py — unchanged)
- `output/` (json_exporter.py, markdown_exporter.py, pdf_exporter.py — unchanged)
- `pipeline/chunking.py` (unchanged)
- `pipeline/json_parsing.py` (unchanged)

After copying, add their dependencies to `pyproject.toml`: `tiktoken`, `pdfplumber`, `weasyprint`, `requests`, `huggingface_hub`, `onnxruntime`.

---

## File Map

```
whitespace/
└── worker/
    ├── main.py              — APScheduler entry point
    ├── orchestrator.py      — full daily pipeline
    ├── stages/
    │   ├── fetch.py         — arXiv fetch + dedup
    │   ├── analyse.py       — per-paper analysis (adapted from v1)
    │   ├── gap_map.py       — cross-paper gap mapping (adapted from v1)
    │   ├── synthesise.py    — idea synthesis from gaps (adapted, no project brief)
    │   ├── score.py         — novelty + feasibility scoring (adapted from v1)
    │   ├── select.py        — pick top N, mark featured, write to DB
    │   └── connect.py       — compute connected_ideas table
    ├── db.py                — sync SessionLocal for worker
    └── prompts/
        ├── analysis.md      — updated paper analysis prompt
        ├── gap_map.md       — updated gap mapping prompt
        ├── synthesis.md     — updated synthesis prompt (no project brief)
        └── score.md         — scoring prompt
```

---

## Task 9: Worker project scaffold

**Files:** `worker/main.py`, `worker/db.py`, add APScheduler to `pyproject.toml`

- [ ] **Add worker dependencies to `backend/pyproject.toml`**

```toml
# Add to [project] dependencies:
"apscheduler>=3.10",
"tiktoken>=0.7",
"pdfplumber>=0.11",
"requests>=2.32",
"huggingface_hub>=0.23",
```

- [ ] **Re-install**

```bash
cd backend && pip install -e ".[dev]"
```

- [ ] **Create `worker/db.py`**

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Worker is single-threaded — sync engine is correct here
_sync_url = settings.database_url.replace("+psycopg", "").replace("+aiosqlite", "")
engine = create_engine(_sync_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False)
```

- [ ] **Write failing test** `tests/test_worker_db.py`

```python
def test_worker_session_creates():
    from worker.db import SessionLocal
    session = SessionLocal()
    assert session is not None
    session.close()
```

- [ ] **Run — expect PASS** (SQLAlchemy sync is already a dependency)

```bash
pytest tests/test_worker_db.py -v
```

- [ ] **Create `worker/main.py`**

```python
import logging
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
from app.core.config import settings
from worker.orchestrator import run_daily_pipeline
from worker.db import SessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def _run():
    with SessionLocal() as session:
        run_daily_pipeline(session)

def main():
    # First-run bootstrap: if no ideas exist, run immediately
    with SessionLocal() as session:
        from sqlalchemy import text
        count = session.execute(text("SELECT COUNT(*) FROM ideas")).scalar()
        if count == 0:
            logger.info("Empty database — running pipeline immediately")
            run_daily_pipeline(session)

    scheduler = BlockingScheduler()
    scheduler.add_job(
        _run,
        CronTrigger(hour=settings.worker_schedule_hour, minute=settings.worker_schedule_minute),
    )
    logger.info(f"Worker scheduled at {settings.worker_schedule_hour:02d}:{settings.worker_schedule_minute:02d} daily")
    scheduler.start()

if __name__ == "__main__":
    main()
```

- [ ] **Commit**

```bash
git add worker/ tests/test_worker_db.py
git commit -m "feat: scaffold worker with APScheduler and sync DB session"
```

---

## Task 10: arXiv fetch stage

**Files:** `worker/stages/fetch.py`

- [ ] **Write failing test** `tests/worker/test_fetch.py`

```python
from unittest.mock import patch, MagicMock
from worker.stages.fetch import fetch_new_papers

def test_fetch_deduplicates_existing(tmp_path):
    existing_ids = {"2601.00001"}
    mock_entry = MagicMock()
    mock_entry.id = "http://arxiv.org/abs/2601.00001v1"
    mock_entry.title = "Test Paper"
    mock_entry.summary = "Abstract"
    mock_entry.authors = [MagicMock(name="Author")]
    mock_entry.tags = [MagicMock(term="cs.LG")]
    mock_entry.published = "2026-01-01T00:00:00Z"
    mock_entry.link = "http://arxiv.org/abs/2601.00001"

    with patch("worker.stages.fetch.feedparser.parse") as mock_parse:
        mock_parse.return_value.entries = [mock_entry]
        papers = fetch_new_papers(["cs.LG"], existing_ids=existing_ids, max_results=10)

    assert papers == []  # deduplicated
```

- [ ] **Run — expect FAIL**

```bash
pytest tests/worker/test_fetch.py -v
```

- [ ] **Create `worker/stages/fetch.py`**

```python
import feedparser
import re
import logging

logger = logging.getLogger(__name__)

def _extract_arxiv_id(url: str) -> str:
    match = re.search(r"arxiv\.org/abs/([^v]+)", url)
    return match.group(1) if match else url

def fetch_new_papers(categories: list[str], existing_ids: set[str], max_results: int = 50) -> list[dict]:
    papers = []
    for cat in categories:
        url = f"http://export.arxiv.org/api/query?search_query=cat:{cat}&sortBy=submittedDate&sortOrder=descending&max_results={max_results}"
        feed = feedparser.parse(url)
        for entry in feed.entries:
            arxiv_id = _extract_arxiv_id(entry.id)
            if arxiv_id in existing_ids:
                continue
            papers.append({
                "arxiv_id": arxiv_id,
                "title": entry.title.strip(),
                "authors": ", ".join(a.name for a in entry.authors),
                "abstract": entry.summary.strip(),
                "categories": ", ".join(t.term for t in getattr(entry, "tags", [])),
                "published_date": entry.get("published", "")[:10],
                "url": f"https://arxiv.org/abs/{arxiv_id}",
            })
    logger.info(f"Fetched {len(papers)} new papers across {len(categories)} categories")
    return papers
```

- [ ] **Add feedparser to `pyproject.toml` dependencies** (`"feedparser>=6.0"`)

- [ ] **Run test — expect PASS**

```bash
pip install feedparser && pytest tests/worker/test_fetch.py -v
```

- [ ] **Commit**

```bash
git add worker/stages/fetch.py tests/worker/test_fetch.py
git commit -m "feat: add arXiv fetch stage with deduplication"
```

---

## Task 11: Updated synthesis prompt

**Files:** `worker/prompts/synthesis.md`

The v1 synthesis prompt assumed a project brief. v2 has no project — ideas must stand alone.

- [ ] **Create `worker/prompts/synthesis.md`**

```markdown
You are a product innovation analyst. You have been given a set of research gaps and open questions
identified across a corpus of recent academic papers.

Your task: generate {{n}} distinct, concrete product ideas that could be built to address or exploit
these research findings. Each idea must:
- Be grounded in at least one specific finding or gap from the papers
- Describe a product or tool that a software engineer or founder could realistically build
- Stand alone — do not assume any specific user's project or goals

For each idea, provide:
1. title: a concise product name/concept (max 12 words)
2. description: 2–3 sentences explaining what the product does and for whom
3. why_novel: 1–2 sentences on what makes this idea novel relative to existing tools, grounded in the research
4. who_builds: who would build this (role/team type)
5. who_buys: who would pay for this (role/org type, with qualifying signals)
6. paper_refs: list of paper titles or arXiv IDs that directly support this idea

Return a JSON array of {{n}} objects with exactly these keys.

Research gaps:
{{gaps}}
```

- [ ] **Create `worker/prompts/analysis.md`** (copy from `whitespace.old/backend/prompts/paper_analysis.md` — no changes needed)

- [ ] **Create `worker/prompts/gap_map.md`** (copy from `whitespace.old/backend/prompts/gap_mapping.md` — no changes needed)

- [ ] **Commit**

```bash
git add worker/prompts/
git commit -m "feat: add updated synthesis prompt (no project brief)"
```

---

## Task 12: Pipeline orchestrator

**Files:** `worker/orchestrator.py`, `worker/stages/analyse.py`, `worker/stages/gap_map.py`, `worker/stages/synthesise.py`, `worker/stages/score.py`, `worker/stages/select.py`, `worker/stages/connect.py`

- [ ] **Create `worker/stages/analyse.py`** — thin wrapper around v1's `app/pipeline/analysis.py`

```python
from app.pipeline.analysis import run_analysis
from app.runners.selector import select_runner
from app.core.config import settings

def analyse_papers(papers: list[dict], runner=None) -> list[dict]:
    """Run per-paper analysis. Returns list of analysis dicts."""
    if runner is None:
        runner = select_runner(settings)
    return run_analysis(papers, runner)
```

- [ ] **Create `worker/stages/gap_map.py`**

```python
from app.pipeline.gap_map import run_gap_map
from app.runners.selector import select_runner
from app.core.config import settings

def map_gaps(analyses: list[dict], runner=None) -> dict:
    if runner is None:
        runner = select_runner(settings)
    return run_gap_map(analyses, runner)
```

- [ ] **Create `worker/stages/synthesise.py`**

```python
import json
from pathlib import Path
from app.runners.selector import select_runner
from app.core.config import settings
from app.pipeline.json_parsing import parse_json_response

PROMPT_TEMPLATE = (Path(__file__).parent.parent / "prompts" / "synthesis.md").read_text()

def synthesise_ideas(gaps: dict, n: int, runner=None) -> list[dict]:
    if runner is None:
        runner = select_runner(settings)
    prompt = PROMPT_TEMPLATE.replace("{{n}}", str(n)).replace("{{gaps}}", json.dumps(gaps, indent=2))
    response = runner.run(prompt)
    return parse_json_response(response, expected_type=list)
```

- [ ] **Create `worker/stages/score.py`** — thin wrapper around v1's scoring

```python
from app.pipeline.scoring import score_ideas as _score
from app.runners.selector import select_runner
from app.core.config import settings

def score_ideas(ideas: list[dict], runner=None) -> list[dict]:
    if runner is None:
        runner = select_runner(settings)
    return _score(ideas, runner)
```

- [ ] **Create `worker/stages/select.py`**

```python
from datetime import date
from sqlalchemy.orm import Session
from app.db.models.idea import Idea
from app.db.models.paper import Paper
from app.db.models.ingestion_run import IngestionRun

def _badge(novelty: float, feasibility: float) -> str:
    if novelty > 0.75:
        return "novel"
    if feasibility > 0.75:
        return "feasible"
    if novelty > 0.5:
        return "emerging"
    return "speculative"

def select_and_persist(
    session: Session,
    ideas: list[dict],
    paper_records: list[Paper],
    papers_fetched: int,
    n: int,
) -> list[Idea]:
    today = date.today().isoformat()
    ranked = sorted(ideas, key=lambda x: x.get("novelty_score", 0) + x.get("feasibility_score", 0), reverse=True)
    top = ranked[:n]
    idea_records = []
    for i, idea_data in enumerate(top):
        paper_ids = idea_data.get("paper_refs", [])
        record = Idea(
            title=idea_data["title"],
            description=idea_data["description"],
            why_novel=idea_data["why_novel"],
            who_builds=idea_data["who_builds"],
            who_buys=idea_data["who_buys"],
            novelty_score=float(idea_data.get("novelty_score", 0.5)),
            feasibility_score=float(idea_data.get("feasibility_score", 0.5)),
            badge=_badge(idea_data.get("novelty_score", 0.5), idea_data.get("feasibility_score", 0.5)),
            featured_date=today,
            is_featured=(i == 0),
            paper_ids=paper_ids,
        )
        session.add(record)
        idea_records.append(record)
    run = IngestionRun(run_date=today, papers_fetched=papers_fetched, ideas_generated=len(idea_records))
    session.add(run)
    session.commit()
    for r in idea_records:
        session.refresh(r)
    return idea_records
```

- [ ] **Create `worker/stages/connect.py`**

```python
from sqlalchemy.orm import Session
from app.db.models.idea import Idea
from app.db.models.connected_idea import ConnectedIdea

def compute_connections(session: Session, ideas: list[Idea]) -> None:
    """Link ideas that share source papers."""
    for idea in ideas:
        idea_paper_set = set(idea.paper_ids)
        for other in ideas:
            if other.id == idea.id:
                continue
            shared = idea_paper_set & set(other.paper_ids)
            if shared:
                conn = ConnectedIdea(
                    idea_id=idea.id,
                    connected_idea_id=other.id,
                    shared_paper_count=len(shared),
                )
                session.add(conn)
    session.commit()
```

- [ ] **Create `worker/orchestrator.py`**

```python
import logging
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import select, text
from app.core.config import settings
from app.db.models.paper import Paper
from app.ingestion.arxiv import fetch_paper_pdf
from app.ingestion.pdf import extract_text
from app.ingestion.text_cleaner import clean_text
from app.pipeline.chunking import chunk_text, build_chunk_records
from app.db.models.chunk import Chunk
from worker.stages.fetch import fetch_new_papers
from worker.stages.analyse import analyse_papers
from worker.stages.gap_map import map_gaps
from worker.stages.synthesise import synthesise_ideas
from worker.stages.score import score_ideas
from worker.stages.select import select_and_persist
from worker.stages.connect import compute_connections

logger = logging.getLogger(__name__)

def run_daily_pipeline(session: Session) -> None:
    today = date.today().isoformat()
    logger.info(f"Starting daily pipeline for {today}")

    # 1. Fetch new arXiv papers
    existing_ids = {r[0] for r in session.execute(select(Paper.arxiv_id)).all()}
    categories = [c.strip() for c in settings.arxiv_categories.split(",")]
    raw_papers = fetch_new_papers(categories, existing_ids=existing_ids)
    if not raw_papers:
        logger.info("No new papers found — skipping pipeline")
        return

    # 2. Ingest: download PDFs, extract + clean text
    paper_records = []
    for p in raw_papers[:30]:  # cap per run to avoid runaway cost
        try:
            pdf_path = fetch_paper_pdf(p["arxiv_id"])
            text = clean_text(extract_text(pdf_path)) if pdf_path else p.get("abstract", "")
        except Exception as e:
            logger.warning(f"PDF extraction failed for {p['arxiv_id']}: {e}")
            text = p.get("abstract", "")
        if not text:
            continue
        paper = Paper(**{k: p[k] for k in ["arxiv_id","title","authors","abstract","categories","published_date","url"]}, full_text=text)
        session.add(paper)
        paper_records.append(paper)
    session.commit()
    for r in paper_records:
        session.refresh(r)

    # 3. Chunk + embed
    for paper in paper_records:
        chunks_text = chunk_text(paper.full_text)
        chunk_records = build_chunk_records(paper.id, chunks_text)
        for c in chunk_records:
            session.add(Chunk(paper_id=paper.id, text=c["text"], chunk_index=c["index"], token_count=c["token_count"]))
    session.commit()

    # 4. Analyse → Gap map → Synthesise → Score
    paper_dicts = [{"title": p.title, "abstract": p.abstract, "full_text": p.full_text, "arxiv_id": p.arxiv_id} for p in paper_records]
    analyses = analyse_papers(paper_dicts)
    gaps = map_gaps(analyses)
    ideas_raw = synthesise_ideas(gaps, n=settings.ideas_per_run)
    ideas_scored = score_ideas(ideas_raw)

    # 5. Select top N, persist
    idea_records = select_and_persist(session, ideas_scored, paper_records, len(paper_records), n=settings.ideas_per_run)

    # 6. Compute connections
    compute_connections(session, idea_records)

    logger.info(f"Pipeline complete — {len(idea_records)} ideas written for {today}")
```

- [ ] **Write integration test** `tests/worker/test_orchestrator.py`

```python
import pytest
from unittest.mock import patch, MagicMock
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.db.base import Base
from app.db.models import *

@pytest.fixture
def sync_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    with Session() as s:
        yield s
    Base.metadata.drop_all(engine)

def test_pipeline_runs_with_stubs(sync_session):
    with patch("worker.stages.fetch.fetch_new_papers", return_value=[
        {"arxiv_id": "2601.00001", "title": "T", "authors": "A", "abstract": "Ab",
         "categories": "cs.LG", "published_date": "2026-01-01", "url": "http://x"}
    ]), patch("worker.orchestrator.fetch_paper_pdf", return_value=None), \
       patch("worker.stages.analyse.run_analysis", return_value=[{"paper": "T", "gaps": ["gap1"]}]), \
       patch("worker.stages.gap_map.run_gap_map", return_value={"gaps": ["gap1"]}), \
       patch("worker.stages.synthesise.synthesise_ideas", return_value=[{
           "title": "Idea", "description": "Desc", "why_novel": "Novel",
           "who_builds": "Builder", "who_buys": "Buyer",
           "novelty_score": 0.8, "feasibility_score": 0.7, "paper_refs": ["2601.00001"]
       }]), patch("worker.stages.score.score_ideas", side_effect=lambda x, **kw: x):
        from worker.orchestrator import run_daily_pipeline
        run_daily_pipeline(sync_session)

    count = sync_session.execute(text("SELECT COUNT(*) FROM ideas")).scalar()
    assert count == 1
```

- [ ] **Run test — expect PASS**

```bash
pytest tests/worker/test_orchestrator.py -v
```

- [ ] **Commit**

```bash
git add worker/ tests/worker/
git commit -m "feat: add full pipeline orchestrator with all stages"
```

---

## Task 13: End-to-end stub run

Verify the worker runs and populates the database before wiring to a real LLM.

- [ ] **Set stub mode in `.env`**

```env
EMBEDDINGS_MODE=stub
PIPELINE_MODE=stub
```

- [ ] **Run worker once (bypass scheduler for manual test)**

```bash
cd backend && python -c "
from worker.db import SessionLocal
from worker.orchestrator import run_daily_pipeline
with SessionLocal() as s:
    run_daily_pipeline(s)
print('Done')
"
```

Expected: logs show fetch → ingest → analyse → synthesise → select. At least 1 idea written to DB.

- [ ] **Check database**

```bash
python -c "
from worker.db import SessionLocal
from sqlalchemy import text
with SessionLocal() as s:
    n = s.execute(text('SELECT COUNT(*) FROM ideas')).scalar()
    print(f'{n} ideas in database')
"
```

Expected: `N ideas in database` where N > 0.

- [ ] **Verify via API**

```bash
curl http://localhost:18730/api/ideas/today
```

Expected: JSON with `ideas` array containing today's ideas.

- [ ] **Commit**

```bash
git commit -m "chore: verify end-to-end pipeline populates feed"
```

---

## Task 14: Worker start script

**Files:** `worker/start.sh`

- [ ] **Create `worker/start.sh`**

```bash
#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
source backend/.venv/bin/activate
cd backend
python -m worker.main
```

- [ ] **Make executable and test**

```bash
chmod +x worker/start.sh
# Run in background to test scheduler wires up
timeout 5 ./worker/start.sh || true
```

Expected: logs show "Worker scheduled at 02:00 daily" then exits after 5s timeout.

- [ ] **Commit**

```bash
git add worker/start.sh
git commit -m "feat: add worker start script"
```

---

**Plan 2 complete.** The worker runs daily, populates the idea pool, and the API feed serves real ideas. The frontend (Plan 3) can now consume live data.

**Continue with:** `2026-04-25-plan-3-build-generation.md`
