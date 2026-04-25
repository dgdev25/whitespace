# Whitespace v2 — Design Specification

**Date:** 2026-04-25  
**Status:** Approved  
**Replaces:** whitespace.old (full rebuild)

---

## 1. What We're Building

Whitespace v2 is a local-first idea generation tool that automatically synthesises product concepts from arXiv research papers. It has no user input at the start — you open it and ideas are waiting. The core experience is discovery, not validation.

This is a deliberate pivot from v1, which required users to frame a project before the system could help them. v2 inverts that: the research comes first, the ideas emerge from it, and the user's job is to explore and pick.

---

## 2. The Pivot from v1

| v1 | v2 |
|---|---|
| "Describe your project, then find papers" | "Here are ideas from today's research — explore them" |
| User-triggered pipeline (wizard → session) | Automated daily ingestion + pre-generated idea pool |
| Session-based results in tabs | Persistent feed + saved collection |
| Research synthesises *to* a user brief | Research synthesises *without* a brief |
| Technical plan as sole output | Technical plan + Product Viability Sketch |
| Dark-only UI | Light default, dark toggle |

---

## 3. Core User Flow

```
Open app
  └─ Daily feed — ideas waiting, no setup required
       └─ Explore an idea
            ├─ Research basis (papers, arXiv categories)
            ├─ Why it's novel
            ├─ Who builds / who buys
            ├─ Connected ideas (right rail, B's constellation concept)
            └─ Two actions:
                 ├─ Save → goes to Saved Collection
                 └─ Build Plan → generates Technical Plan + Product Viability Sketch
                      ├─ Tab 1: Product Viability Sketch
                      │    ├─ Value proposition (one-liner)
                      │    ├─ Likely buyer (qualifying signals)
                      │    ├─ Key risks (sourced from paper limitations)
                      │    └─ Monetisation patterns (2–3, labelled as hypotheses)
                      └─ Tab 2: Technical Implementation Plan
                           ├─ Implementation phases
                           ├─ Stack recommendations
                           ├─ Effort estimate
                           └─ Export: MD / PDF
```

"Surprise me" button (nav + idea detail) pulls a random unseen idea from the pre-generated pool on demand.

---

## 4. Screens

### 4.1 Daily Feed (Home)

- **Top nav:** Whitespace wordmark · Ideas / Saved / Settings tabs · Dark toggle · Surprise me button
- **Date strip:** "FRIDAY, APRIL 25 · 8 ideas synthesised from 23 new papers"
- **Hero card:** Featured idea of the day — full title, description, badges, paper sources, Save + Explore CTAs
- **3-column grid:** Remaining ideas — title, one-line description, novelty/feasibility/speculative badges, paper count, inline Explore link
- Ideas are pre-generated overnight; the feed is static during the day unless Surprise Me is used

### 4.2 Idea Detail (Explore)

Two-panel layout:

**Left column (detail):**
- Badges (novelty, feasibility, emerging area)
- Title + full description
- Why it's novel — AI explanation of the synthesis gap across papers
- Who builds / who buys — two boxes with qualifying signals
- Research basis — list of arXiv papers with category badge, title, authors, arXiv ID

**Right rail (connections):**
- "Connected ideas" — other concepts sharing ≥1 source paper, coloured dot by research thread, "shares N papers" label
- Hoverable cards link to those idea detail views
- "Surprise me" at the bottom of the rail to jump to a random idea

**Top nav:**
- Back to feed, date, Save button, Build Plan → CTA

### 4.3 Build Output

Two tabs:

**Tab 1 — Product Sketch:**

Left column:
- Value proposition (bold one-liner + paragraph)
- Likely buyer (coloured box with qualifying signals)
- Key risks (orange left-border cards, each risk sourced from paper limitations explicitly)

Right column:
- Monetisation patterns (2–3 cards capped at 3, labelled by strength-of-fit: "Strongest fit" / "Plausible" / "Exploratory")
- Honest caveat: "These patterns are derived from the research context — treat them as hypotheses to validate, not conclusions."

**Tab 2 — Technical Plan:**
- Implementation phases with estimated effort
- Stack recommendations grounded in the research
- Export to Markdown / PDF

### 4.4 Saved Collection

- Top filters: All / Built / Unexplored
- List view (not grid — ideas with build plans need more horizontal space for CTAs)
- Each row: badges · title · one-line description · saved date · paper count · arXiv categories
- Ideas with a build plan: green "✓ Build Plan Ready" badge + "View Plan →" CTA
- Ideas without: "Build Plan →" CTA (generates on demand)
- Secondary CTAs: Explore · Remove

---

## 5. Architecture

### 5.1 Approach: Separated Worker + API (Approach B)

Two processes sharing a single PostgreSQL + RuVector database:

```
┌─────────────────────────┐     ┌──────────────────────────┐
│   Worker Process        │     │   API Process (FastAPI)  │
│   (Python, APScheduler) │     │   Port 18730             │
│                         │     │                          │
│  Daily job (02:00):     │     │  GET /api/ideas          │
│  ├─ Fetch new arXiv     │     │  GET /api/ideas/:id      │
│  ├─ Chunk + embed       │──→  │  POST /api/ideas/:id/save│
│  ├─ Analyse papers      │  DB │  DELETE /api/saved/:id   │
│  ├─ Synthesise ideas    │     │  POST /api/build/:id     │
│  ├─ Score + rank        │     │  GET /api/build/:id      │
│  └─ Write idea pool     │     │  GET /api/saved          │
│                         │     │  GET /api/system/health  │
│  On-demand:             │     │                          │
│  └─ /api/surprise       │     │  SSE: /api/build/:id/sse │
└─────────────────────────┘     └──────────────────────────┘
         │                               │
         └───────────┬───────────────────┘
                     ▼
         ┌─────────────────────┐
         │  PostgreSQL         │
         │  + RuVector         │
         │  Port 18733         │
         └─────────────────────┘
```

The worker owns all pipeline execution. The API only reads and serves. A worker crash means the feed goes stale (ideas from yesterday appear) — the app remains functional.

### 5.2 Frontend

- **React 18 + Vite + TypeScript** (non-negotiable)
- **React Query** for server state (ideas, saved, build status)
- **Zustand** for UI state (dark/light mode, current idea)
- **IBM Plex Sans** font (consistent with v1)
- **Light mode default**, dark mode toggle persisted in localStorage
- Routes: `/` (feed) · `/ideas/:id` (detail) · `/ideas/:id/build` (output) · `/saved` (collection) · `/settings`
- No wizard, no modal-driven flows — everything is a page

### 5.3 Backend API

- **FastAPI** + fully async SQLAlchemy (no hybrid async/sync — this is fixed in v2)
- **Alembic** for migrations
- **Pydantic v2** for all request/response schemas
- SSE for build plan generation progress (reused from v1)
- All routes return typed Pydantic models

### 5.4 Worker

- Standalone Python process (`worker/main.py`)
- **APScheduler** for daily job scheduling (02:00 local time by default, configurable)
- Connects to the same database via its own sync SessionLocal (worker is single-threaded, sync is correct here)
- Configurable via `.env`: `WORKER_SCHEDULE_HOUR` (default: `2`), `WORKER_SCHEDULE_MINUTE` (default: `0`), `ARXIV_CATEGORIES` (default: `cs.LG,cs.AI,cs.SE,cs.HC,cs.AR,cs.DC,eess.SP,q-bio.QM`), `IDEAS_PER_RUN` (default: `8`)
- On first run (empty database): worker runs immediately on startup rather than waiting for the scheduled time, ensuring the feed is populated before the user opens the app

### 5.5 Database: PostgreSQL + RuVector (non-negotiable)

Core tables:

| Table | Purpose |
|---|---|
| `ideas` | Pre-generated idea pool. `featured_date`, `novelty_score`, `feasibility_score`, `badge` (novel/feasible/speculative/emerging) |
| `idea_papers` | Junction: idea → arXiv papers that generated it |
| `papers` | Ingested arXiv papers with metadata and full text |
| `chunks` | Text chunks with RuVector embeddings |
| `saved_ideas` | User-saved ideas with timestamp |
| `build_outputs` | Generated Technical Plan + Product Sketch JSON, keyed by idea |
| `connected_ideas` | Pre-computed idea→idea connections via shared papers |
| `ingestion_runs` | Audit log of worker runs (papers fetched, ideas generated, errors) |

RuVector is used for:
- Chunk-level similarity search during synthesis
- Connected idea discovery (vector similarity between idea embeddings)

### 5.6 LLM Runners

Retain the v1 runner abstraction unchanged. Priority order:
1. `claude_cli`
2. `codex_cli`
3. `gemini`
4. `anthropic`
5. `openrouter`

Runner is selected once at worker startup and used for the full daily run.

---

## 6. Pipeline (Worker)

The daily pipeline runs against new arXiv papers published since the last run:

```
1. Fetch       — arXiv API: categories from ARXIV_CATEGORIES env, last N days
2. Ingest      — download PDFs, extract text (pdfplumber), clean
3. Chunk       — token-aware chunking (tiktoken), build Chunk records
4. Embed       — embed chunks via RuVector, store vectors
5. Analyse     — per-paper: claims, methods, limitations, open questions (LLM)
6. Gap map     — cross-paper: contradictions, themes, unexplored intersections (LLM)
7. Synthesise  — generate idea candidates from gaps (LLM)
8. Score       — novelty + feasibility scores per idea (LLM + heuristics)
9. Select      — pick top 8 ideas (configurable via IDEAS_PER_RUN), mark the highest-scoring as featured, write to `ideas` table with `featured_date` = today
10. Connect    — compute connected_ideas via shared papers + vector similarity
11. Log        — write ingestion_run record
```

Steps 1–4 are reused from v1 with minor modification.  
Steps 5–8 are reused with prompt updates (ideas now stand alone, not tied to a project brief).  
Steps 9–11 are new.

Build plan generation (on-demand, triggered by user):
```
1. Product Sketch  — value prop, likely buyer, risks, monetisation patterns (LLM, single prompt)
2. Technical Plan  — implementation phases, stack, effort estimate (LLM)
3. Store           — write to build_outputs, stream progress via SSE
```

---

## 7. Product Viability Sketch — Design Constraints

The sketch is explicitly scoped to what the system can credibly derive from research:

**Derivable from papers:**
- Value proposition (what problem the technology solves)
- Key risks (paper limitations sections are the primary source)
- Technical feasibility signals

**Pattern-matched from research context + comparables:**
- Likely buyer profile (who has this problem at scale)
- Monetisation patterns (2–3 plausible models with fit labels)

**Not included (would require market data we don't have):**
- Market size estimates
- Competitive landscape
- Pricing benchmarks
- Customer validation

Every sketch includes an explicit caveat: *"These patterns are derived from the research context — treat them as hypotheses to validate with potential customers, not conclusions."*

---

## 8. What's Reused from v1

| Component | Decision |
|---|---|
| arXiv ingestion (`ingestion/arxiv.py`) | Reuse, minor updates |
| PDF extraction (`ingestion/pdf.py`) | Reuse unchanged |
| Text cleaning (`ingestion/text_cleaner.py`) | Reuse unchanged |
| Chunking (`pipeline/chunking.py`) | Reuse unchanged |
| Paper analysis (`pipeline/analysis.py`) | Reuse, update prompts |
| Gap mapping (`pipeline/gap_map.py`) | Reuse, update prompts |
| Synthesis (`pipeline/synthesis.py`) | Reuse, update prompts (no project brief) |
| Scoring (`pipeline/scoring.py`) | Reuse, update scoring rubric |
| LLM runners (`runners/`) | Reuse unchanged |
| Markdown/PDF exporters (`output/`) | Reuse for build plan export |
| RuVector client (`vector/client.py`) | Reuse unchanged |
| Core config (`core/config.py`) | Reuse, add worker env vars |

**Removed entirely:**
- Wizard / NewProjectWizard
- Session model and session-based pipeline trigger
- Industry assessment module (replaced by Product Viability Sketch)
- Portfolio analyzer (out of scope for v2)
- Decision funnel
- Knowledge graph drawer (connection concept moved to idea detail right rail)
- Dashboard/analytics pages

---

## 9. Dark / Light Mode

- Light is default
- Toggle in top-right nav, persisted to `localStorage`
- CSS custom properties on `:root` and `[data-theme="dark"]` — no library needed
- All screens designed for both modes from the start (not retrofitted)

**Light palette:**
- Background: `#f7f7f5`
- Surface: `#ffffff`
- Border: `#e5e5e0`
- Text primary: `#111111`
- Text secondary: `#666666`
- Text muted: `#aaaaaa`
- Accent: `#2563eb`

**Dark palette:**
- Background: `#0a0a0a`
- Surface: `#111111`
- Border: `#1e1e1e`
- Text primary: `#f0f0f0`
- Text secondary: `#aaaaaa`
- Text muted: `#555555`
- Accent: `#7c9ef0`

---

## 10. Repository Layout

```
whitespace/
├── backend/
│   ├── app/
│   │   ├── api/routes/       — ideas, saved, build, system
│   │   ├── db/models/        — ideas, papers, chunks, saved, builds, connections
│   │   ├── db/migrations/    — Alembic versions
│   │   ├── schemas/          — Pydantic request/response models
│   │   ├── runners/          — LLM runner abstraction (reused)
│   │   ├── ingestion/        — arXiv, PDF, text cleaner (reused)
│   │   ├── pipeline/         — analysis, gap_map, synthesis, scoring (reused)
│   │   ├── output/           — MD, PDF exporters (reused)
│   │   ├── vector/           — RuVector client (reused)
│   │   └── core/             — config, logging, lifespan
│   └── pyproject.toml
├── worker/
│   ├── main.py               — APScheduler entry point
│   ├── orchestrator.py       — daily pipeline orchestration
│   └── build_generator.py    — on-demand build plan generation
├── frontend/
│   └── src/
│       ├── api/              — typed API client
│       ├── pages/            — Feed, Detail, Build, Saved, Settings
│       ├── components/       — IdeaCard, HeroCard, BadgeRow, ConnectedIdeas, BuildOutput
│       ├── hooks/            — useIdeas, useSaved, useBuild, useSurprise
│       ├── store/            — theme store (Zustand)
│       └── styles/           — CSS custom properties, light/dark tokens
├── docker/
│   └── docker-compose.yml    — postgres, ruvector, backend, worker, frontend
├── scripts/
│   └── start.sh
└── .env.example
```

---

## 11. Non-Negotiables (Constraints)

- RuVector for vector search — no pgvector substitution
- React 18 + Vite + TypeScript for the frontend
- Local-first — no cloud dependency for core functionality
- Repo scanning and path safety constraints retained from v1 (`PORTFOLIO_ALLOWED_ROOTS` pattern)

---

## 12. Out of Scope for v2

- Portfolio / multi-repo analysis
- User accounts or authentication
- Sharing or collaboration features
- Mobile-native app
- Custom arXiv category filtering (categories fixed in `.env`)
- Real-time push notifications for new ideas
