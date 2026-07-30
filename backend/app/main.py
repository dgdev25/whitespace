import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import build, build_stream, export, ideas, projects, saved, system
from app.core.lifespan import lifespan

_cors_origins_raw = os.getenv("CORS_ORIGINS", "http://localhost:18731")
_cors_origins = [o.strip() for o in _cors_origins_raw.split(",") if o.strip()]

app = FastAPI(title="Whitespace API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next) -> Response:
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

app.include_router(system.router, prefix="/api")
app.include_router(ideas.router, prefix="/api")
app.include_router(saved.router, prefix="/api")
app.include_router(build.router, prefix="/api")
app.include_router(build_stream.router, prefix="/api")
app.include_router(export.router, prefix="/api")
app.include_router(projects.router, prefix="/api")

# Single-container demo mode: serve the frontend's production build from the
# same process the API runs in (frontend/src already calls axios with
# baseURL: "/api" — same-origin by design, no VITE_ build-time env needed).
# STATIC_DIR is unset in normal dev (frontend runs on its own Vite dev
# server instead), so this only activates when the build actually placed a
# `dist` there — e.g. inside the myportfolio showcase Dockerfile.
_static_dir = Path(os.getenv("STATIC_DIR", "")) if os.getenv("STATIC_DIR") else None
if _static_dir and _static_dir.is_dir():
    assets_dir = _static_dir / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="static-assets")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str) -> FileResponse:
        # Never let a bad /api/* path silently 200 with index.html — that
        # would hide real API errors as blank frontend pages.
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404)
        candidate = _static_dir / full_path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(_static_dir / "index.html")
