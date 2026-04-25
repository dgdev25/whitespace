# Agentic AI Engineering Pivot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pivot the paper source and synthesis prompts from broad academic arXiv categories to AI-lab papers (DeepMind, Anthropic, OpenAI) with a synthesis lens focused on practical agentic AI engineering tooling.

**Architecture:** Replace the per-category arXiv RSS loop in `fetch.py` with a single compound `all:OrgName` query that finds papers mentioning the target orgs, filtered to AI/ML categories. Rewrite the three synthesis prompts (`analysis.md`, `gap_map.md`, `synthesis.md`) to frame every stage around the question "what engineer tool could be built from this?". Add `arxiv_orgs` to the config and plumb it through the orchestrator.

**Tech Stack:** Python 3.12, feedparser, requests, arXiv API (existing), pytest, no new dependencies.

---

## File Map

| Action | File | What changes |
|--------|------|-------------|
| Modify | `backend/app/core/config.py` | Add `arxiv_orgs`, update `arxiv_categories` default |
| Modify | `backend/worker/stages/fetch.py` | Org+category compound arXiv query, single request |
| Modify | `backend/worker/orchestrator.py` | Pass `orgs` + `categories` to `fetch_new_papers` |
| Modify | `backend/worker/prompts/analysis.md` | Agentic AI engineering analysis lens |
| Modify | `backend/worker/prompts/gap_map.md` | Engineering gaps, not research gaps |
| Modify | `backend/worker/prompts/synthesis.md` | Developer tools for agent engineers |
| Modify | `start.sh` | Add `ARXIV_ORGS` to generated `.env` template |
| Modify | `backend/tests/worker/test_fetch.py` | Update for new `orgs` + `categories` signature |

---

## Task 1: Add `arxiv_orgs` to config

**Files:**
- Modify: `backend/app/core/config.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_config.py — add this test
def test_config_has_arxiv_orgs():
    from app.core.config import settings
    assert hasattr(settings, "arxiv_orgs")
    assert "DeepMind" in settings.arxiv_orgs
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && .venv/bin/pytest tests/test_config.py::test_config_has_arxiv_orgs -v
```
Expected: FAIL — `AttributeError: 'Settings' object has no attribute 'arxiv_orgs'`

- [ ] **Step 3: Update config.py**

Replace the entire file content:

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "whitespace"
    database_url: str = "postgresql+psycopg://whitespace:whitespace@localhost:5432/whitespace"
    ruvector_base_url: str = "http://localhost:18732"
    embeddings_mode: str = "full"  # "full" | "stub"
    pipeline_mode: str = "full"    # "full" | "stub"
    worker_schedule_hour: int = 2
    worker_schedule_minute: int = 0
    arxiv_orgs: str = "DeepMind,Anthropic,OpenAI"
    arxiv_categories: str = "cs.AI,cs.LG,cs.CL,cs.MA"
    ideas_per_run: int = 8

settings = Settings()
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && .venv/bin/pytest tests/test_config.py::test_config_has_arxiv_orgs -v
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/core/config.py backend/tests/test_config.py
git commit -m "feat(config): add arxiv_orgs setting for org-based paper filtering"
```

---

## Task 2: Rewrite `fetch.py` with org+category compound query

**Files:**
- Modify: `backend/worker/stages/fetch.py`
- Modify: `backend/tests/worker/test_fetch.py`

- [ ] **Step 1: Write the failing tests**

Replace the contents of `backend/tests/worker/test_fetch.py`:

```python
from unittest.mock import MagicMock, patch

import pytest

from worker.stages.fetch import fetch_new_papers


def _make_entry(arxiv_id: str, title: str = "Test Paper") -> MagicMock:
    entry = MagicMock()
    entry.id = f"http://arxiv.org/abs/{arxiv_id}v1"
    entry.title = title
    entry.summary = "Abstract text here."
    entry.authors = [MagicMock(name="Alice Smith")]
    entry.tags = [MagicMock(term="cs.AI")]
    entry.published = "2026-01-01T00:00:00Z"
    entry.link = f"http://arxiv.org/abs/{arxiv_id}"
    return entry


def test_fetch_deduplicates_existing():
    existing_ids = {"2601.00001"}
    with patch("worker.stages.fetch.requests.get") as mock_get:
        mock_get.return_value.text = ""
        with patch("worker.stages.fetch.feedparser.parse") as mock_parse:
            mock_parse.return_value.entries = [_make_entry("2601.00001")]
            papers = fetch_new_papers(
                orgs=["DeepMind"], categories=["cs.AI"], existing_ids=existing_ids
            )
    assert papers == []


def test_fetch_returns_new_papers():
    with patch("worker.stages.fetch.requests.get") as mock_get:
        mock_get.return_value.text = "<feed/>"
        mock_get.return_value.raise_for_status = lambda: None
        with patch("worker.stages.fetch.feedparser.parse") as mock_parse:
            mock_parse.return_value.entries = [_make_entry("2601.99999", "New Paper")]
            papers = fetch_new_papers(
                orgs=["Anthropic"], categories=["cs.LG"], existing_ids=set()
            )
    assert len(papers) == 1
    assert papers[0]["arxiv_id"] == "2601.99999"
    assert papers[0]["title"] == "New Paper"


def test_fetch_builds_org_category_query():
    """Verify the URL sent to arXiv includes both org and category terms."""
    with patch("worker.stages.fetch.requests.get") as mock_get:
        mock_get.return_value.text = "<feed/>"
        mock_get.return_value.raise_for_status = lambda: None
        with patch("worker.stages.fetch.feedparser.parse") as mock_parse:
            mock_parse.return_value.entries = []
            fetch_new_papers(
                orgs=["DeepMind", "Anthropic"],
                categories=["cs.AI", "cs.LG"],
                existing_ids=set(),
            )
    call_url = mock_get.call_args[0][0]
    assert "DeepMind" in call_url
    assert "Anthropic" in call_url
    assert "cs.AI" in call_url


def test_fetch_skips_invalid_orgs(caplog):
    import logging
    with patch("worker.stages.fetch.requests.get") as mock_get:
        mock_get.return_value.text = "<feed/>"
        mock_get.return_value.raise_for_status = lambda: None
        with patch("worker.stages.fetch.feedparser.parse") as mock_parse:
            mock_parse.return_value.entries = []
            with caplog.at_level(logging.WARNING):
                fetch_new_papers(
                    orgs=["ValidOrg", "bad<script>"],
                    categories=["cs.AI"],
                    existing_ids=set(),
                )
    assert "bad<script>" in caplog.text


def test_fetch_handles_request_error(caplog):
    import logging
    import requests as req
    with patch("worker.stages.fetch.requests.get", side_effect=req.RequestException("timeout")):
        with caplog.at_level(logging.WARNING):
            papers = fetch_new_papers(orgs=["DeepMind"], categories=["cs.AI"], existing_ids=set())
    assert papers == []
    assert "timeout" in caplog.text
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && .venv/bin/pytest tests/worker/test_fetch.py -v
```
Expected: FAIL — `TypeError: fetch_new_papers() got an unexpected keyword argument 'orgs'`

- [ ] **Step 3: Rewrite fetch.py**

Replace the entire file:

```python
import logging
import re
from urllib.parse import quote

import feedparser
import requests

logger = logging.getLogger(__name__)

_CATEGORY_RE = re.compile(r"^[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*$")
_ORG_RE = re.compile(r"^[a-zA-Z0-9 _-]+$")


def _extract_arxiv_id(url: str) -> str:
    match = re.search(r"arxiv\.org/abs/([^v]+)", url)
    return match.group(1) if match else url


def fetch_new_papers(
    orgs: list[str],
    categories: list[str],
    existing_ids: set[str],
    max_results: int = 50,
) -> list[dict]:
    valid_orgs = [o for o in orgs if _ORG_RE.match(o)]
    invalid_orgs = set(orgs) - set(valid_orgs)
    for bad in invalid_orgs:
        logger.warning("Skipping invalid org name: %r", bad)

    valid_cats = [c for c in categories if _CATEGORY_RE.match(c)]

    if not valid_orgs:
        logger.warning("No valid orgs — skipping fetch")
        return []

    org_clause = " OR ".join(f"all:{o}" for o in valid_orgs)
    if valid_cats:
        cat_clause = " OR ".join(f"cat:{c}" for c in valid_cats)
        query = f"({org_clause}) AND ({cat_clause})"
    else:
        query = org_clause

    url = (
        f"http://export.arxiv.org/api/query"
        f"?search_query={quote(query)}"
        f"&sortBy=submittedDate&sortOrder=descending"
        f"&max_results={max_results}"
    )

    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        feed = feedparser.parse(resp.text)
    except requests.RequestException as exc:
        logger.warning("arXiv fetch failed: %s", exc)
        return []

    papers = []
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

    logger.info("Fetched %d new papers for orgs: %s", len(papers), valid_orgs)
    return papers
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && .venv/bin/pytest tests/worker/test_fetch.py -v
```
Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/worker/stages/fetch.py backend/tests/worker/test_fetch.py
git commit -m "feat(fetch): replace category loop with org+category compound arXiv query"
```

---

## Task 3: Update orchestrator to use orgs

**Files:**
- Modify: `backend/worker/orchestrator.py` (lines 26–27)

- [ ] **Step 1: Update orchestrator.py**

Find this block in `orchestrator.py`:

```python
    existing_ids = {r[0] for r in session.execute(text("SELECT arxiv_id FROM papers")).all()}
    categories = [c.strip() for c in settings.arxiv_categories.split(",")]
    raw_papers = fetch_new_papers(categories, existing_ids=existing_ids)
```

Replace with:

```python
    existing_ids = {r[0] for r in session.execute(text("SELECT arxiv_id FROM papers")).all()}
    orgs = [o.strip() for o in settings.arxiv_orgs.split(",")]
    categories = [c.strip() for c in settings.arxiv_categories.split(",")]
    raw_papers = fetch_new_papers(orgs=orgs, categories=categories, existing_ids=existing_ids)
```

- [ ] **Step 2: Run the orchestrator test to verify nothing is broken**

```bash
cd backend && .venv/bin/pytest tests/worker/test_orchestrator.py -v
```
Expected: all existing tests PASS

- [ ] **Step 3: Commit**

```bash
git add backend/worker/orchestrator.py
git commit -m "feat(orchestrator): pass arxiv_orgs to fetch_new_papers"
```

---

## Task 4: Rewrite `analysis.md` prompt — agentic AI engineering lens

**Files:**
- Modify: `backend/worker/prompts/analysis.md`

- [ ] **Step 1: Replace the prompt**

Write this content to `backend/worker/prompts/analysis.md`:

```
You are an expert in agentic AI engineering — the practice of building systems where LLMs use tools, memory, and multi-step reasoning to complete complex tasks.

Your task is to analyze a research paper from a top AI lab (DeepMind, Anthropic, or OpenAI) and extract what is most useful to an engineer building or improving AI agent systems.

Generate a JSON response with the following structure:
{
    "summary": "2-3 sentence summary of the paper's main contribution, written for an AI engineer not a researcher",
    "techniques": ["concrete technique 1 an engineer could implement or use", "technique 2", ...],
    "engineering_gaps": [
        "specific tooling or library that does not exist yet but would be needed to apply this research in production",
        ...
    ],
    "target_engineer": "one sentence: what kind of engineer would benefit most from tooling built on this research",
    "maturity": "one of: research | emerging | production-ready"
}

Rules:
- "techniques" must be concrete enough to put in a GitHub README — not "use better prompting" but "structured decoding with constrained beam search to enforce JSON output"
- "engineering_gaps" must describe missing tools, not missing research — not "more study needed" but "no open-source library for episodic memory with vector-indexed retrieval"
- If the paper is not relevant to agentic AI engineering, return engineering_gaps as an empty list

IMPORTANT: Respond ONLY with a raw JSON object. Do not include markdown code fences, explanations, or any text outside the JSON object.

Paper to analyse:
Title: {{title}}
Abstract: {{abstract}}
Full text excerpt: {{full_text}}
```

- [ ] **Step 2: Verify the prompt file is correct**

```bash
head -5 backend/worker/prompts/analysis.md
```
Expected: first line is `You are an expert in agentic AI engineering`

- [ ] **Step 3: Commit**

```bash
git add backend/worker/prompts/analysis.md
git commit -m "feat(prompts): reframe analysis prompt for agentic AI engineering lens"
```

---

## Task 5: Rewrite `gap_map.md` prompt — engineering gaps not research gaps

**Files:**
- Modify: `backend/worker/prompts/gap_map.md`

- [ ] **Step 1: Replace the prompt**

Write this content to `backend/worker/prompts/gap_map.md`:

```
You are an expert in agentic AI engineering. You have been given structured analyses of recent papers from top AI labs (DeepMind, Anthropic, OpenAI).

Your task is to synthesize these analyses and identify the most important engineering gaps — places where research is ahead of tooling and a practical library, CLI, or SaaS is missing.

Generate a JSON response with the following structure:
{
    "engineering_gaps": [
        "specific description of a missing tool or library that engineers building agent systems need right now",
        ...
    ],
    "ready_to_productize": [
        "a technique from the papers that is mature enough to be wrapped in a developer-facing tool today",
        ...
    ],
    "recurring_pain_points": [
        "a theme that appears across multiple papers pointing to a widespread unsolved problem in agent engineering",
        ...
    ]
}

Rules:
- Every item must be actionable for an engineer, not a researcher
- "engineering_gaps" should name the gap precisely: not "better memory" but "no production-ready library for agent working memory with TTL eviction and context-window budget management"
- "ready_to_productize" should name the technique AND the paper it comes from
- "recurring_pain_points" should explain why the pain point is widespread (mention N papers if relevant)
- Do not include anything that already has a well-known open-source solution

IMPORTANT: Respond ONLY with a raw JSON object. Do not include markdown code fences, explanations, or any text outside the JSON object.

Paper analyses:
{{analyses}}
```

- [ ] **Step 2: Verify the prompt file is correct**

```bash
head -3 backend/worker/prompts/gap_map.md
```
Expected: first line is `You are an expert in agentic AI engineering.`

- [ ] **Step 3: Commit**

```bash
git add backend/worker/prompts/gap_map.md
git commit -m "feat(prompts): reframe gap_map prompt to identify engineering gaps in agentic AI"
```

---

## Task 6: Rewrite `synthesis.md` prompt — developer tools for agent engineers

**Files:**
- Modify: `backend/worker/prompts/synthesis.md`

- [ ] **Step 1: Replace the prompt**

Write this content to `backend/worker/prompts/synthesis.md`:

```
You are a product strategist specializing in developer tools for agentic AI engineering — the infrastructure, libraries, observability, evaluation, and orchestration layer that engineers need to build reliable AI agent systems.

You have been given a set of engineering gaps and recurring pain points identified from recent AI lab research.

Your task: generate {{n}} distinct, concrete tool ideas that a developer could ship to address these gaps. Each idea must:
- Be buildable as a library, CLI tool, API, or focused SaaS by a solo developer or small team in 4–8 weeks
- Target engineers who are building, testing, deploying, or monitoring LLM-based agent systems
- Be grounded in a specific gap or finding from the provided research
- NOT be a general chatbot, a model wrapper, a fine-tuned model, or a "build your own agent" platform
- Focus on one of these categories: evaluation & testing, observability & tracing, memory & context management, agent coordination & handoff, prompt versioning & regression, cost/latency optimization, human-in-the-loop, sandboxed execution

For each idea, provide:
1. title: a concise product name (max 12 words)
2. description: 2–3 sentences — what it does technically, for whom, and how it works at a high level
3. why_novel: 1–2 sentences — what existing tools do NOT do this, and why the research makes it timely now
4. who_builds: who would build this (specific role, e.g. "ML engineer with LangChain or agent framework experience")
5. who_buys: who pays for this (specific org type and qualifying signal, e.g. "AI teams at seed-to-Series-B startups running multi-agent workflows in production")
6. paper_refs: list of paper titles or arXiv IDs from the provided gaps that ground this idea

Return a JSON array of exactly {{n}} objects with these keys and no others.

Engineering gaps and pain points:
{{gaps}}
```

- [ ] **Step 2: Verify the prompt file is correct**

```bash
head -3 backend/worker/prompts/synthesis.md
```
Expected: first line is `You are a product strategist specializing in developer tools for agentic AI engineering`

- [ ] **Step 3: Commit**

```bash
git add backend/worker/prompts/synthesis.md
git commit -m "feat(prompts): reframe synthesis prompt to generate agentic AI engineering tool ideas"
```

---

## Task 7: Update start.sh `.env` template

**Files:**
- Modify: `start.sh` (the `.env` heredoc block)

- [ ] **Step 1: Update the .env template in start.sh**

Find this block in `start.sh`:

```bash
# arXiv categories to ingest
ARXIV_CATEGORIES=cs.LG,cs.AI,cs.SE,cs.HC
IDEAS_PER_RUN=8
```

Replace with:

```bash
# AI lab orgs to source papers from (used with arXiv all: field search)
ARXIV_ORGS=DeepMind,Anthropic,OpenAI
# arXiv categories to filter within (combined with org search)
ARXIV_CATEGORIES=cs.AI,cs.LG,cs.CL,cs.MA
IDEAS_PER_RUN=8
```

- [ ] **Step 2: Verify the change**

```bash
grep -A3 "ARXIV_ORGS" start.sh
```
Expected: shows the new ARXIV_ORGS line followed by ARXIV_CATEGORIES

- [ ] **Step 3: Commit**

```bash
git add start.sh
git commit -m "feat(start.sh): add ARXIV_ORGS to generated .env template"
```

---

## Task 8: Smoke test the full pipeline end-to-end

This task verifies the pivot works together without requiring real API keys.

- [ ] **Step 1: Run the full test suite**

```bash
cd backend && .venv/bin/pytest tests/ -v --ignore=tests/api
```
Expected: all worker tests PASS

- [ ] **Step 2: Run the API tests**

```bash
cd backend && .venv/bin/pytest tests/api/ -v
```
Expected: all API tests PASS

- [ ] **Step 3: Verify fetch builds the right URL by dry-running it**

```bash
cd backend && .venv/bin/python3 - <<'EOF'
from unittest.mock import patch, MagicMock
import requests as real_requests

calls = []
orig_get = real_requests.get

def capture_get(url, **kw):
    calls.append(url)
    r = MagicMock()
    r.text = "<feed><entry></entry></feed>"
    r.raise_for_status = lambda: None
    return r

with patch("worker.stages.fetch.requests.get", side_effect=capture_get):
    import feedparser
    with patch("worker.stages.fetch.feedparser.parse", return_value=MagicMock(entries=[])):
        from worker.stages.fetch import fetch_new_papers
        fetch_new_papers(
            orgs=["DeepMind", "Anthropic", "OpenAI"],
            categories=["cs.AI", "cs.LG", "cs.CL", "cs.MA"],
            existing_ids=set()
        )

print("URL sent to arXiv:")
print(calls[0])
assert "DeepMind" in calls[0]
assert "Anthropic" in calls[0]
assert "cs.AI" in calls[0]
print("OK — URL contains org names and categories")
EOF
```
Expected: prints the URL and `OK — URL contains org names and categories`

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: verify agentic AI pivot smoke test passes"
```
