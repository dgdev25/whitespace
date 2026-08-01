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
- 2026-08-01 showcase safety gate: the production image sets
  `SHOWCASE_DEMO_MODE=true`. Live ingestion, organisation import, model-backed
  product-sketch generation, project PRD generation, and project pipeline runs
  now reject with `403` before an external request can occur. The guard has an
  API test and was proven in a fresh image alongside a `200` health response.
- 2026-08-01 showcase-data gate: an empty demo database is seeded idempotently
  at startup with two synthetic source records and three explicitly labelled
  `Synthetic showcase` ideas, including one saved idea and a prebuilt static
  sketch. A fresh image returned those records through the normal feed API;
  no external research or model request was made.

## Status

**Ready for a guarded refresh, pending browser and hosted acceptance.** A fresh
image now supplies deterministic synthetic data and prevents external
ingestion/model spend. Do not call it a completed deployment until the updated
gated VPS revision renders correctly and its health, invite, and public
boundaries are rechecked.

**Refresh evidence (2026-08-01):** Leaseweb is running image commit
`6df6e9d`. Its internal health is `200` with SQLite `ok`; the normal feed
returns the two synthetic source records and three `Synthetic showcase` ideas;
and a pipeline request returns `403`. The public health route remains invite
gated (`401` with `noindex`). Browser and a fresh invite-redemption acceptance
remain the final refresh gates.

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

1. Refresh the gated VPS instance from the reviewed commit and verify that the
   runtime image holds no provider key while the demo guard rejects all
   live-operation requests.
2. Run browser QA plus the gated invite and hosted health checks on that clean
   revision before any refresh.
