# Repository deployment manifest — Whitespace

**Audited:** 2026-08-01  
**Deployment decision:** Hold refresh/redeployment; retain the existing VPS
instance only while its public and health boundaries remain verified.

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
- Backend tests were not runnable in this environment: `python3` has no
  `pytest`; no result is claimed.
- Frontend tests failed before any test executed: `@testing-library/dom` is
  missing and three tab tests import non-existent components.
- Frontend lint failed with 198 errors, including synchronous state updates in
  effects, stale/missing test types, invalid test imports, and unused values.
  The production build was not run because lint failed first.

## Status

**Not eligible for refresh or a new VPS deployment.** A previously deployed
revision may remain available, but current source quality gates do not prove a
safe reproducible replacement. The research/LLM workload also needs a bounded
provider relay and synthetic-only demonstration state.

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

1. Restore the frontend test dependency and update/remove tests whose target
   components were renamed or deleted. Make the suite execute and pass.
2. Fix the React-effect and TypeScript/ESLint violations rather than suppressing
   them; ensure generated coverage files are excluded from lint input.
3. Provision the documented Python test environment from the lock/declared dev
   dependencies, then run backend tests and production container health checks.
4. Run frontend tests, lint, build, backend tests, and browser QA on a clean
   revision before any refresh.
5. Verify the deployed demo uses only synthetic research/idea state, preserves
   no provider key in the container, enforces a shared-relay spend cap, and
   passes the gated invite plus hosted health checks.
