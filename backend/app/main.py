import os

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

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
