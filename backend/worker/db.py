from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Worker is single-threaded — sync engine is correct here.
# psycopg3 (postgresql+psycopg) supports sync mode as-is.
# aiosqlite (sqlite+aiosqlite) must be downgraded to plain sqlite for sync use.
_sync_url = settings.database_url.replace("+aiosqlite", "")
engine = create_engine(_sync_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False)
