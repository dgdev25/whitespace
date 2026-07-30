# Whitespace — Primer State
<!-- Maintained by the /primer skill. AUTO blocks are regenerated each run; edit CARRY blocks freely. -->

## At a glance  <!-- AUTO -->
- **Purpose:** LLM pipeline that monitors AI research papers from arXiv and surfaces novel, feasible startup ideas hiding in research gaps.
- **Stack:** Python FastAPI (async) + SQLAlchemy · React 18 + TypeScript + Vite · SQLite (dev) / PostgreSQL (prod) · Claude/Gemini/OpenRouter LLM runners
- **Dev loop:** build `bash start.sh` (one-command: deps + migrations + both servers) · test `cd backend && pytest` / `cd frontend && npm test` · run http://localhost:18731 (frontend) with backend on 18730
- **Last primed:** 2026-07-03 · HEAD `b39a42b` on `master`

## Structure  <!-- AUTO -->
```
backend/
├── app/
│   ├── api/routes/       (ideas, saved, build, export, system endpoints)
│   ├── db/models/        (SQLAlchemy ORM)
│   ├── runners/          (Claude CLI, Gemini, Anthropic, OpenRouter adapters)
│   └── pipeline/         (analysis, gap mapping, chunking, scoring)
├── worker/
│   ├── orchestrator.py   (full pipeline orchestration)
│   ├── stages/           (fetch, analyse, gap_map, synthesise, score, select, connect)
│   └── prompts/          (Markdown LLM prompt templates)
frontend/
├── src/
│   ├── pages/            (Feed, History, IdeaDetail, Build, Saved, Settings)
│   ├── components/       (NavBar, IdeaCard, ScoreBar, ConnectedIdeas, etc.)
│   ├── hooks/            (useIdeas, useSaved, useBuild via React Query)
│   └── api/              (typed API client)
docker/                    (Docker Compose dev setup + ruvector init SQL)
```

## In flight  <!-- AUTO -->
**Branch:** `master` · **Uncommitted:** `frontend/package-lock.json`, `frontend/src/components/IdeaCard.tsx`

**Recent commits suggest:**
- **Fix: GitHub bulk import + reference list population** (most recent) — likely refinement of GitHub source integration
- **Feat: Project ideas, PRD generation, GitHub reference repos, security hardening** — active expansion of project system + GitHub data sourcing
- **Feat: Multi-domain project system with wizard, ideas, and pipeline views** — new project infrastructure
- **Feat: Settings ACL/OpenAlex sources, per-source toggles, nested sub-tabs** — expanding configuration UI
- **Fixes to research basis, GitHub pipeline panel, history pagination, link rendering, CLI tool use, surprise button** — rapid iteration on core flows

The codebase is in **active feature development** with emphasis on multi-source paper ingestion (GitHub, OpenAlex) + project scoping + improved UI/settings.

## Drift / distrust  <!-- AUTO -->
None found. README accurately reflects current architecture and configuration options. Code matches documented API endpoints and database schema.

## Roadmap — next steps  <!-- AUTO -->
1. **Expand LLM runner coverage beyond top 3** — why now: OpenRouter is fallback but priority list in README shows 6 runners; gap suggests incomplete runner adapter parity — effort low / impact medium
2. **Complete GitHub source integration & pagination** — why now: recent commits show bulk import + reference list work; uncommented IdeaCard.tsx suggests active refinement — effort medium / impact medium
3. **Harden project-scoping system (multi-domain wizard)** — why now: 3 recent commits on project system + security; scope narrowing is key to startup idea accuracy — effort medium / impact high
4. **Add real-time pipeline status polling + WebSocket support** — why now: NavBar polls every 8s (commented as interval); WebSocket would reduce server load & latency for multi-user scenarios — effort medium / impact low
5. **Extend export formats (PDF via LaTeX, JSON API dump)** — why now: Markdown + PDF exports exist; JSON+automation would unlock third-party integrations — effort low / impact medium
<!-- For the exhaustive prioritized worklist, run /audit. -->

## Locked decisions & invariants  <!-- AUTO -->
- **LLM pipeline stages are immutable steps** — fetch → analyse → gap_map → synthesise → score → select → connect. Each stage is asynchronous, persists to DB, and can be re-run independently.
- **Fast re-synthesis path optimization** — when no new papers found, skip expensive per-paper LLM calls and build pseudo-analyses from abstracts. Only 2 LLM calls instead of 30+.
- **One badge per idea** — Novel (high novelty ≥0.7, low feasibility) · Feasible (high feasibility ≥0.7, low novelty) · Emerging (both moderate) · Speculative (both low).
- **Database is the source of truth for runs, not timestamps.** Each `ingestion_run` record is standalone; history accumulates indefinitely.
- **Frontend auto-refresh on pipeline completion** — NavBar polls `/api/system/pipeline/status` every 8s; Ideas & History pages auto-refresh when status changes.

## Open threads & decisions  <!-- CARRY: never auto-clobbered; only [ ]→[x] when a commit resolves it -->
- [ ] (none recorded yet)

## Session log  <!-- append-only -->
- 2026-07-03 `b39a42b` — Quick prime: whitespace, AI research gap-mapping → startup ideas; active feature dev on GitHub/OpenAlex ingestion + project scoping + settings UI
