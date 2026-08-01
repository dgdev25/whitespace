# Repository deployment manifest — Whitespace

**Audited:** 2026-08-01  
**Deployment decision:** Hold refresh/redeployment pending container and hosted
acceptance; retain the existing VPS instance only while its public and health
boundaries remain verified.

## What it is

A React/FastAPI product that ingests research papers, runs an LLM analysis
pipeline, and presents scored startup ideas, saved projects, and product
sketches. The showcase uses one container with SQLite and the platform’s shared
LLM relay rather than a project-owned provider key.

## Evidence reviewed

- `README.md`, `.showcase/showcase.yaml`, backend `pyproject.toml`, and
  frontend package scripts.
- The tracked workspace was clean at audit start and the manifest has a gated
  small single-container deployment with `/api/system/health`.
- 2026-08-01 remediation: frontend tests pass (2 tests), ESLint is clean, and
  the production Vite build passes. The stale tab suites targeted deleted
  components and were removed; the remaining tests use declared direct
  Testing Library dependencies.
- 2026-08-01 remediation: backend tests pass (20 tests) in an isolated
  environment created from `.[dev]`. The build-generator and orchestrator
  tests now fully stub LLM/provider work, so the suite is deterministic and
  does not reach an external model or feed.
- 2026-08-01 remediation: the complete backend Ruff gate is clean after normal
  source formatting, import cleanup, exception chaining, and a documented
  120-column policy. No lint rules were suppressed. Backend tests still pass
  (20 tests) after the cleanup.
- 2026-08-01 container gate: the production Docker image builds using the same
  type-checked frontend command as CI and returns a successful
  `/api/system/health` response with a new SQLite database.

## Status

**Not yet eligible for refresh or a new VPS deployment.** A previously
deployed revision may remain available, but container and hosted acceptance do
not yet prove a safe reproducible replacement. The research/LLM workload also
needs a bounded provider relay and synthetic-only demonstration state.

## Project-page record

**Updated:** 2026-08-01

- Added platform-compatible workflow and architecture PNG metadata to
  `.showcase/showcase.yaml`.
- `docs/project-page/` stores the editable HTML diagram sources and the
  committed raster maps. The shared portfolio detail template renders them
  full width with the global active palette; no standalone visitor page or SVG
  is introduced.
- The maps distinguish the currently listed demo from a source refresh: the
  refresh remains blocked by the recorded quality gates.

## Remediation before reconsideration

1. Verify the deployed demo uses only synthetic research/idea state, preserves
   no provider key in the container, and enforces a shared-relay spend cap.
2. Run browser QA plus the gated invite and hosted health checks on a clean
   revision before any refresh.
