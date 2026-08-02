# Single-container myportfolio demo build: frontend static assets served by
# the FastAPI backend itself (backend/app/main.py mounts STATIC_DIR when
# set). Separate from backend/Dockerfile and frontend/Dockerfile, which stay
# dev-mode (uvicorn --reload, vite dev server) for docker-compose.dev-minimal.yml.

# Stage 1: build the frontend's static assets
FROM node:22-slim AS frontend-builder
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# The production image uses the same type-checked build command as CI.
RUN npm run build

# Stage 2: python backend + the built frontend, one runtime image
FROM python:3.12-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

# uv's managed Python interpreter defaults to /root/.local/share/uv — a
# venv's python binary is a symlink into it, and /root is 700, so the
# non-root user below can't even traverse into it (found live: every venv
# command 126s with a bare "Permission denied", not a chown-able issue on
# /app/backend). Redirecting the install dir up front avoids /root entirely.
ENV UV_PYTHON_INSTALL_DIR=/opt/uv-python

WORKDIR /app/backend

COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --no-install-project

COPY backend/ ./
RUN uv sync

COPY --from=frontend-builder /build/frontend/dist ./static

ENV PATH="/app/backend/.venv/bin:$PATH"
ENV STATIC_DIR=/app/backend/static
# Real generation/ingestion is enabled: the free-tier OpenRouter relay
# (myportfolio's orchestrator) makes real calls safe to expose publicly at
# $0 marginal cost — see OPENROUTER_BASE_URL in .showcase/showcase.yaml.
ENV SHOWCASE_DEMO_MODE=false

RUN useradd -m appuser && chown -R appuser:appuser /app/backend /opt/uv-python
USER appuser

EXPOSE 8000

# DATABASE_URL for alembic must be the sync driver (sqlite:///, no
# +aiosqlite) — the app itself falls back to its own async default
# (sqlite+aiosqlite:///./whitespace.db, set in app/core/config.py) when
# DATABASE_URL isn't set for it explicitly, so only the migration step
# overrides it here.
CMD ["sh", "-c", "DATABASE_URL=sqlite:///./whitespace.db alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000"]
