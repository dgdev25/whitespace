# Whitespace

Whitespace monitors AI research papers and uses an LLM pipeline to surface novel, feasible startup ideas hiding in the gaps between papers. Every run produces a ranked set of ideas with novelty and feasibility scores, detailed breakdowns, and a "product sketch" you can generate on demand.

Papers are fetched from **arXiv**, which is where leading AI research organisations — Google DeepMind, Anthropic, OpenAI, Meta AI, Mistral, and others — publish the majority of their work. Whitespace searches arXiv using configurable organisation names as keywords (e.g. `all:DeepMind OR all:Anthropic`) combined with subject category filters (e.g. `cs.AI`, `cs.LG`). This means any paper on arXiv that mentions a configured organisation in its title, abstract, or author affiliations is eligible for ingestion.

To pull in papers from a specific lab, add its name to `ARXIV_ORGS` in your `.env`. To focus on a particular research area, adjust `ARXIV_CATEGORIES`. Common examples:

| Organisation | Add to `ARXIV_ORGS` |
|---|---|
| Google DeepMind | `DeepMind` |
| Anthropic | `Anthropic` |
| OpenAI | `OpenAI` |
| Meta AI | `Meta AI` |
| Mistral | `Mistral` |
| Microsoft Research | `Microsoft Research` |
| Stanford HAI | `Stanford` |
| Berkeley AI Research | `Berkeley` |

---

## How it works

```
arXiv papers
     │
     ▼
  Fetch          Search arXiv for papers from configured orgs and categories
     │
     ▼
  Analyse        LLM extracts key claims, methods, open questions per paper
     │
     ▼
  Gap map        LLM identifies cross-paper research gaps and opportunities
     │
     ▼
  Synthesise     LLM generates N startup ideas from the gap map
     │
     ▼
  Score          LLM rates each idea on novelty (0–1) and feasibility (0–1)
     │
     ▼
  Select         Top N ideas are persisted and tagged with the run ID
     │
     ▼
  Connect        Ideas sharing source papers are linked to each other
```

Each pipeline run is saved independently so the History page accumulates every batch — you never lose earlier ideas when you run again.

**Fast re-synthesis path:** When no new arXiv papers are found, the pipeline skips the expensive per-paper LLM calls and builds lightweight pseudo-analyses directly from abstracts. Only two LLM calls are made (gap map + synthesise) instead of 30+, so subsequent runs on the same day complete in seconds rather than minutes.

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI + SQLAlchemy (async) |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Migrations | Alembic |
| Worker | Python threads, APScheduler |
| LLM runners | Claude CLI, Codex CLI, Gemini CLI, Anthropic API, Gemini API, OpenRouter |
| Frontend | React 18 + TypeScript + Vite |
| Data fetching | TanStack React Query |
| State | Zustand |

---

## Project structure

```
whitespace/
├── start.sh                  # One-command startup (installs deps, runs migrations, starts both servers)
├── backend/
│   ├── app/
│   │   ├── api/routes/       # FastAPI route handlers
│   │   │   ├── ideas.py      # Today's feed, history, idea detail, surprise
│   │   │   ├── saved.py      # Save / unsave ideas
│   │   │   ├── build.py      # Trigger and fetch product sketch builds
│   │   │   ├── export.py     # Export ideas as Markdown / PDF
│   │   │   └── system.py     # Health, pipeline status/trigger, runner config, data sources
│   │   ├── db/
│   │   │   ├── models/       # SQLAlchemy ORM models
│   │   │   └── migrations/   # Alembic migration versions
│   │   ├── runners/          # LLM runner adapters (see Runner section)
│   │   ├── pipeline/         # Analysis, gap mapping, chunking, scoring utilities
│   │   └── core/config.py    # Pydantic settings (reads .env)
│   └── worker/
│       ├── orchestrator.py   # Full pipeline orchestration logic
│       ├── stages/           # fetch, analyse, gap_map, synthesise, score, select, connect
│       ├── prompts/          # Markdown prompt templates for each LLM stage
│       └── build_generator.py # Product sketch generation for saved ideas
└── frontend/
    └── src/
        ├── pages/            # FeedPage, HistoryPage, IdeaDetailPage, SavedPage, SettingsPage, BuildOutputPage
        ├── components/       # NavBar, IdeaCard, HeroCard, BadgeRow, ScoreBar, ConnectedIdeas
        ├── hooks/            # useIdeas, useSaved, useBuild (React Query hooks)
        └── api/              # Typed API client
```

---

## Quick start

```bash
git clone https://github.com/dgtise25/whitespace.git
cd whitespace
bash start.sh
```

That single command:
1. Stops any existing servers on ports 18730 / 18731
2. Creates `backend/.env` with SQLite defaults if it doesn't exist
3. Creates and activates a Python virtualenv, installs all dependencies
4. Installs frontend npm packages
5. Runs Alembic migrations
6. Starts the FastAPI backend on **http://localhost:18730**
7. Starts the Vite frontend on **http://localhost:18731**

Open **http://localhost:18731** in your browser, then click **Refresh Ideas** to run the pipeline.

---

## Configuration

Copy `backend/.env.example` to `backend/.env` and edit as needed:

```env
# Database — SQLite for local dev, switch to postgres:// for production
DATABASE_URL=sqlite+aiosqlite:///./whitespace.db

# LLM runner — configure at least one (see Runner section below)
# ANTHROPIC_API_KEY=sk-ant-...
# GEMINI_API_KEY=AIza...
# OPENROUTER_API_KEY=sk-or-...

# Pipeline mode: "full" uses a real LLM; "stub" inserts fixture data (fast, no API calls)
PIPELINE_MODE=full

# Scheduled daily run time (24-hour clock, UTC)
WORKER_SCHEDULE_HOUR=2
WORKER_SCHEDULE_MINUTE=0

# arXiv organisations to source papers from
ARXIV_ORGS=DeepMind,Anthropic,OpenAI

# arXiv subject categories to include
ARXIV_CATEGORIES=cs.AI,cs.LG,cs.CL,cs.MA

# Number of ideas to generate per pipeline run
IDEAS_PER_RUN=8
```

### arXiv categories reference

| Code | Subject |
|---|---|
| `cs.AI` | Artificial Intelligence |
| `cs.LG` | Machine Learning |
| `cs.CL` | Computation and Language (NLP) |
| `cs.MA` | Multi-Agent Systems |
| `cs.SE` | Software Engineering |
| `cs.HC` | Human-Computer Interaction |
| `eess.SP` | Signal Processing |

---

## LLM runners

Whitespace picks the first available runner in this priority order:

| Priority | Runner | How to enable |
|---|---|---|
| 1 | **Claude CLI** | Install the Claude Code CLI — no API key required |
| 2 | **Codex CLI** | Install the OpenAI Codex CLI |
| 3 | **Gemini CLI** | Install the Gemini CLI |
| 4 | **Gemini API** | Set `GEMINI_API_KEY` |
| 5 | **Anthropic API** | Set `ANTHROPIC_API_KEY` |
| 6 | **OpenRouter** | Set `OPENROUTER_API_KEY` |

You can override the active runner at runtime from the Settings page in the UI, or via the API:

```bash
# See which runners are available and which is active
curl http://localhost:18730/api/system/runners

# Pin to a specific runner
curl -X PUT http://localhost:18730/api/system/runner \
  -H "Content-Type: application/json" \
  -d '{"name": "anthropic"}'
```

---

## API reference

All endpoints are prefixed with `/api`. Interactive docs at **http://localhost:18730/docs**.

### Ideas

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/ideas/today` | Today's featured ideas (falls back to most recent run if none today) |
| `GET` | `/api/ideas/history` | All ideas grouped by pipeline run, newest first |
| `GET` | `/api/ideas/surprise` | Random featured idea |
| `GET` | `/api/ideas/{id}` | Full idea detail including connected ideas |

**Example — fetch today's feed:**

```bash
curl http://localhost:18730/api/ideas/today
```

```json
{
  "date": "2026-04-25",
  "papers_ingested": 12,
  "ideas": [
    {
      "id": "3fa85f64-...",
      "title": "Federated Gap Detector",
      "description": "A privacy-preserving system that surfaces research blind spots across siloed lab corpora without exposing raw data.",
      "badge": "Novel",
      "novelty_score": 0.91,
      "feasibility_score": 0.74,
      "is_featured": true,
      "featured_date": "2026-04-25"
    }
  ]
}
```

**Example — fetch idea detail:**

```bash
curl http://localhost:18730/api/ideas/3fa85f64-...
```

```json
{
  "id": "3fa85f64-...",
  "title": "Federated Gap Detector",
  "description": "...",
  "why_novel": "No existing tool combines federated learning with cross-corpus gap analysis.",
  "who_builds": "ML infrastructure teams at research-heavy organisations.",
  "who_buys": "AI labs, pharma companies, government research bodies.",
  "novelty_score": 0.91,
  "feasibility_score": 0.74,
  "badge": "Novel",
  "paper_ids": ["2404.12345", "2404.67890"],
  "connections": [
    {
      "id": "abc-...",
      "title": "Cross-Silo Knowledge Distillation",
      "badge": "Feasible",
      "shared_paper_count": 2
    }
  ]
}
```

### Saved ideas

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/saved/` | List all saved ideas |
| `POST` | `/api/saved/` | Save an idea `{"idea_id": "..."}` |
| `DELETE` | `/api/saved/{idea_id}` | Remove a saved idea |

**Example:**

```bash
# Save an idea
curl -X POST http://localhost:18730/api/saved/ \
  -H "Content-Type: application/json" \
  -d '{"idea_id": "3fa85f64-..."}'

# List saved ideas
curl http://localhost:18730/api/saved/
```

### Build output (product sketch)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/build/{idea_id}` | Fetch existing product sketch |
| `POST` | `/api/build/{idea_id}` | Trigger product sketch generation (async, returns 202) |

**Example:**

```bash
# Trigger a build
curl -X POST http://localhost:18730/api/build/3fa85f64-...

# Poll until ready (status changes from "generating" to "ready")
curl http://localhost:18730/api/build/3fa85f64-...
```

```json
{
  "idea_id": "3fa85f64-...",
  "status": "ready",
  "product_sketch": {
    "tagline": "Find the gaps your competitors can't see.",
    "target_user": "Research leads at AI labs",
    "core_loop": "Ingest → Analyse → Surface → Act",
    "risks": [
      { "title": "Data access", "description": "Labs may not share paper corpora." }
    ],
    "monetisation": [
      { "name": "SaaS subscription", "fit": "high", "description": "Per-seat pricing for research teams." }
    ]
  }
}
```

### Export

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/export/{idea_id}/markdown` | Download idea + build as a `.md` file |
| `GET` | `/api/export/{idea_id}/pdf` | Download idea + build as a `.pdf` file |

```bash
curl http://localhost:18730/api/export/3fa85f64-.../markdown -o idea.md
curl http://localhost:18730/api/export/3fa85f64-.../pdf     -o idea.pdf
```

### System

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/system/health` | Health check — API and database status |
| `GET` | `/api/system/pipeline/status` | Whether pipeline is running + last completed run |
| `POST` | `/api/system/pipeline/run` | Trigger a pipeline run manually |
| `GET` | `/api/system/runners` | List available LLM runners and active runner |
| `PUT` | `/api/system/runner` | Set preferred runner |
| `GET` | `/api/system/config` | Current data source configuration |
| `PUT` | `/api/system/data-sources` | Update active orgs and categories |

**Example — trigger the pipeline:**

```bash
curl -X POST http://localhost:18730/api/system/pipeline/run
```

```json
{ "status": "started", "message": "Pipeline started in background." }
```

**Example — update data sources:**

```bash
curl -X PUT http://localhost:18730/api/system/data-sources \
  -H "Content-Type: application/json" \
  -d '{"orgs": ["DeepMind", "Anthropic"], "categories": ["cs.AI", "cs.CL"]}'
```

---

## Frontend pages

| Page | Route | Description |
|---|---|---|
| **Ideas** | `/` | Today's featured ideas — hero card for the top idea, grid below |
| **History** | `/history` | Every pipeline run accumulated over time, filterable by badge |
| **Idea detail** | `/ideas/:id` | Full breakdown: why novel, who builds, who buys, connected ideas |
| **Build** | `/ideas/:id/build` | AI-generated product sketch for a specific idea |
| **Saved** | `/saved` | Ideas you've bookmarked |
| **Settings** | `/settings` | Configure LLM runner, arXiv orgs, and categories |

The NavBar polls the pipeline status every 8 seconds. When a run completes, the Ideas and History pages refresh automatically — no manual reload needed.

---

## Database models

| Table | Purpose |
|---|---|
| `papers` | Raw arXiv papers (title, abstract, authors, categories, URL) |
| `chunks` | Text chunks derived from paper abstracts |
| `ingestion_runs` | One row per pipeline run — tracks papers fetched, ideas generated, errors |
| `ideas` | Generated ideas with scores, badges, and `run_id` linking to the ingestion run |
| `connected_ideas` | Pairs of ideas that share source papers, ranked by shared paper count |
| `saved_ideas` | User bookmarks linking to ideas |
| `build_outputs` | AI-generated product sketches for saved ideas |

---

## Badges

Each idea receives one badge based on its scores:

| Badge | Meaning |
|---|---|
| **Novel** | High novelty (≥ 0.7), lower feasibility — forward-looking research opportunity |
| **Feasible** | High feasibility (≥ 0.7), lower novelty — buildable with current technology |
| **Emerging** | Both scores moderate — interesting but early |
| **Speculative** | Both scores lower — long-horizon, high-risk |

---

## Running in production

Switch to PostgreSQL by updating `DATABASE_URL`:

```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/whitespace
```

Run migrations with the synchronous driver:

```bash
DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/whitespace \
  alembic upgrade head
```

Start the backend with a production ASGI server:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 18730 --workers 2
```

Build the frontend for production:

```bash
cd frontend && npm run build
# Serve the dist/ folder with nginx or any static host
```

---

## Development

```bash
# Backend tests
cd backend && pytest

# Frontend tests
cd frontend && npm test

# Type-check frontend
cd frontend && npm run build

# Lint backend
cd backend && ruff check .
```

To use the stub pipeline (no LLM calls, instant fixture data):

```env
PIPELINE_MODE=stub
```
