# Repository deployment manifest — Whitespace

**Audited:** 2026-08-01  
**Deployment decision:** Publicly available as an invite-gated, read-only
synthetic showcase on Leaseweb. Retain the instance only while its health,
invite, and live-operation boundaries remain verified.

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
- 2026-08-01 hosted browser correction: every seeded build output now has the
  complete static product-sketch contract that the React plan screen renders.
  Startup also repairs only Whitespace's three reserved synthetic records from
  the earlier minimal placeholder. A focused seed test prevents a partial
  sketch from being published again.

## Status

**Published as a guarded synthetic showcase.** The source, container, and
hosted acceptance gates now pass. It is an invite-gated review environment,
not a live research or model-analysis service.

**Hosted evidence (2026-08-01):** Leaseweb is running image commit
`46f3490`. Both live containers report internal health `ok`, SQLite `ok`, and
`showcase_demo_mode: true`. A fresh invitation redeemed successfully; its
authenticated feed returned the three `Synthetic showcase` ideas, while the
pipeline endpoint returned `403`. The public health route remains invite gated
(`401` with `noindex`). A separate fresh browser invitation rendered the
static build-plan overview with no horizontal overflow or browser errors; both
disposable test invitations were immediately revoked.

## Project-page record

**Updated:** 2026-08-01

- Added platform-compatible workflow and architecture PNG metadata to
  `.showcase/showcase.yaml`.
- `docs/project-page/` stores the editable HTML diagram sources and the
  committed raster maps. The shared portfolio detail template renders them
  full width with the global active palette; no standalone visitor page or SVG
  is introduced.
- The maps distinguish the public synthetic showcase from the separate live
  research product, which remains intentionally disabled on this host.

## Remediation before reconsideration

1. Before any future live deployment, provision a separate data, retention,
   budget, provider-key, and deletion-control review. Do not remove the
   showcase guard as a shortcut.
2. Repeat the hosted invite, read-only action, health, and browser checks for
   every production refresh.
