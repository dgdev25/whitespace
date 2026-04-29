<!-- TURBO:AUTO-START -->
# Project: backend

*Auto-generated at 2026-04-29 11:35 — do not edit between markers*

## Git State
- **Branch:** `master`
- **Remote:** `https://github.com/dgdev25/whitespace.git`
- **Commits:** 101
- **Uncommitted changes:** 1 file(s)

### Recent Commits
```
b39a42b fix(github): bulk import now populates reference list + add repo pagination
d485ef5 feat: project ideas, PRD generation, GitHub reference repos, security hardening
adce6a2 feat(projects): multi-domain project system with wizard, ideas, and pipeline views
6a7e7e7 feat(settings): add ACL/OpenAlex sources, per-source toggles, nested sub-tabs
73e876d feat: enrich Research Basis with source titles, add GitHub to pipeline panel, paginate history
8c7b445 fix: pass real URLs into build prompts and render correct links per source type
a59f6d4 chore: remove unused _abstracts_to_pseudo_analyses helper
c3fd6ca fix: analyse org-imported repo READMEs so they feed into synthesis
```

## Tech Stack
- Python

### Key Dependencies (pyproject.toml)
- `fastapi`
- `uvicorn`
- `sqlalchemy`
- `alembic`
- `pydantic`
- `pydantic-settings`
- `psycopg`
- `aiosqlite`
- `python-multipart`
- `apscheduler`
- `tiktoken`
- `pdfplumber`
- `requests`
- `huggingface_hub`
- `feedparser`
- *...and more*

## Structure (top-level)
```
app/
tests/
whitespace_backend.egg-info/
worker/
.env.example
CLAUDE.md
pyproject.toml
```

<!-- TURBO:AUTO-END -->

























































































































