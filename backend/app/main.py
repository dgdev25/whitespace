from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import build, build_stream, ideas, saved, system
from app.core.lifespan import lifespan

app = FastAPI(title="Whitespace API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:18731"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(system.router, prefix="/api")
app.include_router(ideas.router, prefix="/api")
app.include_router(saved.router, prefix="/api")
app.include_router(build.router, prefix="/api")
app.include_router(build_stream.router, prefix="/api")
