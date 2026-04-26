from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import settings
from app.db.models.user_settings import UserSettings
from app.db.session import AsyncSessionLocal, engine
from app.runners.selector import set_model_prefs


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with AsyncSessionLocal() as session:
        existing = await session.get(UserSettings, 1)
        if existing is None:
            existing = UserSettings(
                id=1,
                ideas_per_run=settings.ideas_per_run,
                max_sources_per_run=settings.max_sources_per_run,
                cached_analyses_count=settings.cached_analyses_count,
                runner_model_prefs={},
                github_repos=[],
            )
            session.add(existing)
            await session.commit()
        set_model_prefs(existing.runner_model_prefs or {})
    yield
    await engine.dispose()
