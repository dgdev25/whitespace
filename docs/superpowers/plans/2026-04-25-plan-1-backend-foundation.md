# Whitespace v2 — Plan 1: Backend Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the `whitespace/` repo with a fully working FastAPI backend — database models, migrations, and all API routes — testable with curl before any frontend or worker exists.

**Architecture:** PostgreSQL + RuVector database with 7 SQLAlchemy models. FastAPI serves 4 route groups (ideas, saved, build, system). All routes are fully async. The worker populates the database separately (Plan 2); this plan only sets up the serving layer.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2.0 async, Alembic, Pydantic v2, psycopg (async), pytest, pytest-asyncio, httpx

**Prerequisite:** PostgreSQL running locally with RuVector extension. The v1 `start.sh` handles this — copy it from `whitespace.old/` or run `CREATE EXTENSION IF NOT EXISTS ruvector;` manually.

---

## File Map

```
whitespace/
└── backend/
    ├── app/
    │   ├── main.py
    │   ├── core/config.py
    │   ├── core/lifespan.py
    │   ├── core/logging.py
    │   ├── db/base.py
    │   ├── db/session.py
    │   ├── db/models/idea.py
    │   ├── db/models/paper.py
    │   ├── db/models/chunk.py
    │   ├── db/models/saved_idea.py
    │   ├── db/models/build_output.py
    │   ├── db/models/connected_idea.py
    │   ├── db/models/ingestion_run.py
    │   ├── db/migrations/env.py
    │   ├── db/migrations/versions/0001_initial_schema.py
    │   ├── schemas/ideas.py
    │   ├── schemas/saved.py
    │   ├── schemas/build.py
    │   ├── schemas/system.py
    │   ├── api/deps.py
    │   ├── api/routes/system.py
    │   ├── api/routes/ideas.py
    │   ├── api/routes/saved.py
    │   └── api/routes/build.py
    ├── tests/
    │   ├── conftest.py
    │   ├── api/test_system.py
    │   ├── api/test_ideas.py
    │   ├── api/test_saved.py
    │   └── api/test_build.py
    ├── pyproject.toml
    └── alembic.ini
```

---

## Task 1: Project scaffold and dependencies

**Files:** Create `backend/pyproject.toml`, `backend/alembic.ini`, all `__init__.py` stubs

- [ ] **Create `backend/pyproject.toml`**

```toml
[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.backends.legacy:build"

[project]
name = "whitespace-backend"
version = "2.0.0"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.111",
    "uvicorn[standard]>=0.30",
    "sqlalchemy[asyncio]>=2.0",
    "alembic>=1.13",
    "pydantic>=2.7",
    "pydantic-settings>=2.3",
    "psycopg[binary]>=3.1",
    "aiosqlite>=0.20",
    "python-multipart>=0.0.9",
]

[project.optional-dependencies]
dev = ["pytest>=8", "pytest-asyncio>=0.23", "httpx>=0.27", "ruff>=0.4", "mypy>=1.10"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]

[tool.ruff]
line-length = 100
select = ["E", "F", "I", "B"]
```

- [ ] **Create `backend/alembic.ini`** (copy from `whitespace.old/backend/alembic.ini` — only the `script_location` line needs updating to `app/db/migrations`)

- [ ] **Create all `__init__.py` files** in `app/`, `app/core/`, `app/db/`, `app/db/models/`, `app/db/migrations/`, `app/schemas/`, `app/api/`, `app/api/routes/`, `tests/`, `tests/api/`

- [ ] **Install dependencies**

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
```

Expected: no errors, `fastapi`, `sqlalchemy`, `alembic` all importable.

- [ ] **Commit**

```bash
git add backend/
git commit -m "chore: scaffold backend project structure"
```

---

## Task 2: Config and database session

**Files:** Create `app/core/config.py`, `app/db/base.py`, `app/db/session.py`

- [ ] **Write failing test** `tests/test_config.py`

```python
from app.core.config import settings

def test_app_name():
    assert settings.app_name == "whitespace"

def test_database_url_has_default():
    assert settings.database_url is not None
```

- [ ] **Run test — expect FAIL** (`ModuleNotFoundError: app.core.config`)

```bash
pytest tests/test_config.py -v
```

- [ ] **Create `app/core/config.py`**

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "whitespace"
    database_url: str = "postgresql+psycopg://whitespace:whitespace@localhost:5432/whitespace"
    ruvector_base_url: str = "http://localhost:18732"
    embeddings_mode: str = "full"  # "full" | "stub"
    pipeline_mode: str = "full"    # "full" | "stub"
    worker_schedule_hour: int = 2
    worker_schedule_minute: int = 0
    arxiv_categories: str = "cs.LG,cs.AI,cs.SE,cs.HC,cs.AR,cs.DC,eess.SP"
    ideas_per_run: int = 8

settings = Settings()
```

- [ ] **Create `app/db/base.py`**

```python
from sqlalchemy.orm import DeclarativeBase, MappedColumn
from sqlalchemy import DateTime, func
import uuid

class Base(DeclarativeBase):
    pass
```

- [ ] **Create `app/db/session.py`**

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings

engine = create_async_engine(settings.database_url, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def get_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
```

- [ ] **Run test — expect PASS**

```bash
pytest tests/test_config.py -v
```

- [ ] **Commit**

```bash
git add app/core/config.py app/db/base.py app/db/session.py tests/test_config.py
git commit -m "feat: add config and async database session"
```

---

## Task 3: Database models

**Files:** Create all 7 model files in `app/db/models/`

- [ ] **Create `app/db/models/paper.py`**

```python
from sqlalchemy import String, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
import uuid

class Paper(Base):
    __tablename__ = "papers"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    arxiv_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    title: Mapped[str] = mapped_column(Text)
    authors: Mapped[str] = mapped_column(Text)
    abstract: Mapped[str] = mapped_column(Text, nullable=True)
    full_text: Mapped[str] = mapped_column(Text, nullable=True)
    categories: Mapped[str] = mapped_column(String(256))  # comma-separated
    published_date: Mapped[str] = mapped_column(String(32))
    url: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    chunks: Mapped[list["Chunk"]] = relationship(back_populates="paper", cascade="all, delete-orphan")
```

- [ ] **Create `app/db/models/chunk.py`**

```python
from sqlalchemy import String, Text, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
import uuid

class Chunk(Base):
    __tablename__ = "chunks"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    paper_id: Mapped[str] = mapped_column(ForeignKey("papers.id", ondelete="CASCADE"), index=True)
    text: Mapped[str] = mapped_column(Text)
    chunk_index: Mapped[int] = mapped_column(Integer)
    token_count: Mapped[int] = mapped_column(Integer)
    embedding_id: Mapped[str] = mapped_column(String, nullable=True)  # RuVector ref
    paper: Mapped["Paper"] = relationship(back_populates="chunks")
```

- [ ] **Create `app/db/models/idea.py`**

```python
from sqlalchemy import String, Text, Float, Date, Boolean, JSON, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
import uuid

class Idea(Base):
    __tablename__ = "ideas"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text)
    why_novel: Mapped[str] = mapped_column(Text)
    who_builds: Mapped[str] = mapped_column(Text)
    who_buys: Mapped[str] = mapped_column(Text)
    novelty_score: Mapped[float] = mapped_column(Float)
    feasibility_score: Mapped[float] = mapped_column(Float)
    badge: Mapped[str] = mapped_column(String(32))  # "novel"|"feasible"|"speculative"|"emerging"
    featured_date: Mapped[str] = mapped_column(String(16), nullable=True, index=True)  # YYYY-MM-DD
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    paper_ids: Mapped[list] = mapped_column(JSON, default=list)  # [arxiv_id, ...]
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    connections: Mapped[list["ConnectedIdea"]] = relationship(
        foreign_keys="ConnectedIdea.idea_id", back_populates="idea", cascade="all, delete-orphan"
    )
```

- [ ] **Create `app/db/models/connected_idea.py`**

```python
from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
import uuid

class ConnectedIdea(Base):
    __tablename__ = "connected_ideas"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    idea_id: Mapped[str] = mapped_column(ForeignKey("ideas.id", ondelete="CASCADE"), index=True)
    connected_idea_id: Mapped[str] = mapped_column(ForeignKey("ideas.id", ondelete="CASCADE"))
    shared_paper_count: Mapped[int] = mapped_column(Integer, default=1)
    idea: Mapped["Idea"] = relationship(foreign_keys=[idea_id], back_populates="connections")
    connected: Mapped["Idea"] = relationship(foreign_keys=[connected_idea_id])
```

- [ ] **Create `app/db/models/saved_idea.py`**

```python
from sqlalchemy import String, DateTime, ForeignKey, func, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
import uuid

class SavedIdea(Base):
    __tablename__ = "saved_ideas"
    __table_args__ = (UniqueConstraint("idea_id"),)
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    idea_id: Mapped[str] = mapped_column(ForeignKey("ideas.id", ondelete="CASCADE"), index=True)
    saved_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    idea: Mapped["Idea"] = relationship()
```

- [ ] **Create `app/db/models/build_output.py`**

```python
from sqlalchemy import String, Text, JSON, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base
import uuid

class BuildOutput(Base):
    __tablename__ = "build_outputs"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    idea_id: Mapped[str] = mapped_column(ForeignKey("ideas.id", ondelete="CASCADE"), unique=True, index=True)
    product_sketch: Mapped[dict] = mapped_column(JSON)  # {value_prop, buyer, risks, monetisation}
    technical_plan: Mapped[str] = mapped_column(Text)   # Markdown
    status: Mapped[str] = mapped_column(String(16), default="pending")  # pending|generating|ready|failed
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

- [ ] **Create `app/db/models/ingestion_run.py`**

```python
from sqlalchemy import String, Integer, DateTime, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base
import uuid

class IngestionRun(Base):
    __tablename__ = "ingestion_runs"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    run_date: Mapped[str] = mapped_column(String(16))  # YYYY-MM-DD
    papers_fetched: Mapped[int] = mapped_column(Integer, default=0)
    ideas_generated: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str] = mapped_column(Text, nullable=True)
    started_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)
```

- [ ] **Create `app/db/models/__init__.py`** importing all models so Alembic finds them

```python
from .paper import Paper
from .chunk import Chunk
from .idea import Idea
from .connected_idea import ConnectedIdea
from .saved_idea import SavedIdea
from .build_output import BuildOutput
from .ingestion_run import IngestionRun

__all__ = ["Paper", "Chunk", "Idea", "ConnectedIdea", "SavedIdea", "BuildOutput", "IngestionRun"]
```

- [ ] **Commit**

```bash
git add app/db/models/
git commit -m "feat: add all SQLAlchemy models"
```

---

## Task 4: Alembic migration

**Files:** `app/db/migrations/env.py`, `app/db/migrations/versions/0001_initial_schema.py`

- [ ] **Create `app/db/migrations/env.py`** (copy from `whitespace.old/backend/app/db/migrations/env.py`, update import to `from app.db.models import *` and `from app.db.base import Base`)

- [ ] **Create `app/db/migrations/versions/0001_initial_schema.py`**

```python
"""initial schema"""
revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa

def upgrade():
    op.execute("CREATE EXTENSION IF NOT EXISTS ruvector")
    op.create_table("papers",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("arxiv_id", sa.String(32), nullable=False, unique=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("authors", sa.Text(), nullable=False),
        sa.Column("abstract", sa.Text()),
        sa.Column("full_text", sa.Text()),
        sa.Column("categories", sa.String(256), nullable=False),
        sa.Column("published_date", sa.String(32), nullable=False),
        sa.Column("url", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_papers_arxiv_id", "papers", ["arxiv_id"])
    op.create_table("chunks",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("paper_id", sa.String(), sa.ForeignKey("papers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("token_count", sa.Integer(), nullable=False),
        sa.Column("embedding_id", sa.String()),
    )
    op.create_index("ix_chunks_paper_id", "chunks", ["paper_id"])
    op.create_table("ideas",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("why_novel", sa.Text(), nullable=False),
        sa.Column("who_builds", sa.Text(), nullable=False),
        sa.Column("who_buys", sa.Text(), nullable=False),
        sa.Column("novelty_score", sa.Float(), nullable=False),
        sa.Column("feasibility_score", sa.Float(), nullable=False),
        sa.Column("badge", sa.String(32), nullable=False),
        sa.Column("featured_date", sa.String(16)),
        sa.Column("is_featured", sa.Boolean(), default=False),
        sa.Column("paper_ids", sa.JSON(), default=list),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_ideas_featured_date", "ideas", ["featured_date"])
    op.create_table("connected_ideas",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("idea_id", sa.String(), sa.ForeignKey("ideas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("connected_idea_id", sa.String(), sa.ForeignKey("ideas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("shared_paper_count", sa.Integer(), default=1),
    )
    op.create_index("ix_connected_ideas_idea_id", "connected_ideas", ["idea_id"])
    op.create_table("saved_ideas",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("idea_id", sa.String(), sa.ForeignKey("ideas.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("saved_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table("build_outputs",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("idea_id", sa.String(), sa.ForeignKey("ideas.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("product_sketch", sa.JSON(), nullable=False),
        sa.Column("technical_plan", sa.Text(), nullable=False),
        sa.Column("status", sa.String(16), default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_build_outputs_idea_id", "build_outputs", ["idea_id"])
    op.create_table("ingestion_runs",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("run_date", sa.String(16), nullable=False),
        sa.Column("papers_fetched", sa.Integer(), default=0),
        sa.Column("ideas_generated", sa.Integer(), default=0),
        sa.Column("error", sa.Text()),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
    )

def downgrade():
    for t in ["ingestion_runs","build_outputs","saved_ideas","connected_ideas","ideas","chunks","papers"]:
        op.drop_table(t)
```

- [ ] **Run migration**

```bash
cd backend && alembic upgrade head
```

Expected: all tables created, no errors.

- [ ] **Commit**

```bash
git add app/db/migrations/
git commit -m "feat: add initial database migration"
```

---

## Task 5: Pydantic schemas

**Files:** `app/schemas/ideas.py`, `app/schemas/saved.py`, `app/schemas/build.py`, `app/schemas/system.py`

- [ ] **Create `app/schemas/ideas.py`**

```python
from pydantic import BaseModel
from datetime import datetime

class ConnectedIdeaOut(BaseModel):
    id: str
    title: str
    badge: str
    shared_paper_count: int

class IdeaSummary(BaseModel):
    id: str
    title: str
    description: str
    badge: str
    novelty_score: float
    feasibility_score: float
    is_featured: bool
    paper_ids: list[str]
    featured_date: str | None

class IdeaDetail(IdeaSummary):
    why_novel: str
    who_builds: str
    who_buys: str
    connections: list[ConnectedIdeaOut]
    created_at: datetime

class TodayFeed(BaseModel):
    date: str  # YYYY-MM-DD
    papers_ingested: int
    ideas: list[IdeaSummary]
```

- [ ] **Create `app/schemas/saved.py`**

```python
from pydantic import BaseModel
from datetime import datetime
from app.schemas.ideas import IdeaSummary

class SavedIdeaOut(BaseModel):
    id: str
    idea: IdeaSummary
    saved_at: datetime
    has_build_output: bool
```

- [ ] **Create `app/schemas/build.py`**

```python
from pydantic import BaseModel
from datetime import datetime

class MonetisationPattern(BaseModel):
    name: str
    description: str
    fit: str  # "Strongest fit" | "Plausible" | "Exploratory"

class Risk(BaseModel):
    title: str
    description: str

class ProductSketch(BaseModel):
    value_prop_headline: str
    value_prop_body: str
    buyer_profile: str
    buyer_signals: list[str]
    risks: list[Risk]
    monetisation: list[MonetisationPattern]
    caveat: str

class BuildOutputOut(BaseModel):
    id: str
    idea_id: str
    product_sketch: ProductSketch
    technical_plan: str
    status: str
    created_at: datetime
```

- [ ] **Create `app/schemas/system.py`**

```python
from pydantic import BaseModel

class HealthOut(BaseModel):
    status: str
    database: str
    last_ingestion_run: str | None
```

- [ ] **Commit**

```bash
git add app/schemas/
git commit -m "feat: add Pydantic v2 schemas"
```

---

## Task 6: FastAPI app and routes

**Files:** `app/core/lifespan.py`, `app/api/deps.py`, `app/api/routes/*.py`, `app/main.py`

- [ ] **Create `app/core/lifespan.py`**

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.db.session import engine
from app.db.base import Base

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()
```

- [ ] **Create `app/api/deps.py`**

```python
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import AsyncSessionLocal

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
```

- [ ] **Create `app/api/routes/system.py`**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.api.deps import get_session
from app.schemas.system import HealthOut

router = APIRouter(prefix="/system", tags=["system"])

@router.get("/health", response_model=HealthOut)
async def health(session: AsyncSession = Depends(get_session)):
    try:
        await session.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception:
        db_status = "error"
    result = await session.execute(
        text("SELECT run_date FROM ingestion_runs ORDER BY started_at DESC LIMIT 1")
    )
    row = result.fetchone()
    return HealthOut(status="ok", database=db_status, last_ingestion_run=row[0] if row else None)
```

- [ ] **Create `app/api/routes/ideas.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.api.deps import get_session
from app.db.models.idea import Idea
from app.db.models.connected_idea import ConnectedIdea
from app.db.models.ingestion_run import IngestionRun
from app.schemas.ideas import IdeaDetail, IdeaSummary, TodayFeed, ConnectedIdeaOut
from datetime import date
import random

router = APIRouter(prefix="/ideas", tags=["ideas"])

@router.get("/today", response_model=TodayFeed)
async def today_feed(session: AsyncSession = Depends(get_session)):
    today = date.today().isoformat()
    result = await session.execute(
        select(Idea).where(Idea.featured_date == today).order_by(Idea.is_featured.desc(), Idea.novelty_score.desc())
    )
    ideas = result.scalars().all()
    run = await session.execute(
        select(IngestionRun).where(IngestionRun.run_date == today)
    )
    run_row = run.scalars().first()
    return TodayFeed(
        date=today,
        papers_ingested=run_row.papers_fetched if run_row else 0,
        ideas=[IdeaSummary.model_validate(i, from_attributes=True) for i in ideas],
    )

@router.get("/surprise", response_model=IdeaSummary)
async def surprise(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Idea))
    ideas = result.scalars().all()
    if not ideas:
        raise HTTPException(404, "No ideas available yet")
    return IdeaSummary.model_validate(random.choice(ideas), from_attributes=True)

@router.get("/{idea_id}", response_model=IdeaDetail)
async def idea_detail(idea_id: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Idea).where(Idea.id == idea_id))
    idea = result.scalars().first()
    if not idea:
        raise HTTPException(404, "Idea not found")
    conn_result = await session.execute(
        select(ConnectedIdea, Idea)
        .join(Idea, Idea.id == ConnectedIdea.connected_idea_id)
        .where(ConnectedIdea.idea_id == idea_id)
        .order_by(ConnectedIdea.shared_paper_count.desc())
        .limit(6)
    )
    connections = [
        ConnectedIdeaOut(id=i.id, title=i.title, badge=i.badge, shared_paper_count=c.shared_paper_count)
        for c, i in conn_result.all()
    ]
    detail = IdeaDetail.model_validate(idea, from_attributes=True)
    detail.connections = connections
    return detail
```

- [ ] **Create `app/api/routes/saved.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api.deps import get_session
from app.db.models.saved_idea import SavedIdea
from app.db.models.idea import Idea
from app.db.models.build_output import BuildOutput
from app.schemas.saved import SavedIdeaOut
from app.schemas.ideas import IdeaSummary

router = APIRouter(prefix="/saved", tags=["saved"])

@router.get("/", response_model=list[SavedIdeaOut])
async def list_saved(session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(SavedIdea, Idea, BuildOutput)
        .join(Idea, Idea.id == SavedIdea.idea_id)
        .outerjoin(BuildOutput, BuildOutput.idea_id == SavedIdea.idea_id)
        .order_by(SavedIdea.saved_at.desc())
    )
    return [
        SavedIdeaOut(
            id=s.id,
            idea=IdeaSummary.model_validate(i, from_attributes=True),
            saved_at=s.saved_at,
            has_build_output=b is not None and b.status == "ready",
        )
        for s, i, b in result.all()
    ]

@router.post("/{idea_id}", response_model=SavedIdeaOut, status_code=201)
async def save_idea(idea_id: str, session: AsyncSession = Depends(get_session)):
    idea = (await session.execute(select(Idea).where(Idea.id == idea_id))).scalars().first()
    if not idea:
        raise HTTPException(404, "Idea not found")
    existing = (await session.execute(select(SavedIdea).where(SavedIdea.idea_id == idea_id))).scalars().first()
    if existing:
        return SavedIdeaOut(id=existing.id, idea=IdeaSummary.model_validate(idea, from_attributes=True), saved_at=existing.saved_at, has_build_output=False)
    saved = SavedIdea(idea_id=idea_id)
    session.add(saved)
    await session.commit()
    await session.refresh(saved)
    return SavedIdeaOut(id=saved.id, idea=IdeaSummary.model_validate(idea, from_attributes=True), saved_at=saved.saved_at, has_build_output=False)

@router.delete("/{idea_id}", status_code=204)
async def unsave_idea(idea_id: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(SavedIdea).where(SavedIdea.idea_id == idea_id))
    saved = result.scalars().first()
    if saved:
        await session.delete(saved)
        await session.commit()
```

- [ ] **Create `app/api/routes/build.py`**

```python
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api.deps import get_session
from app.db.models.build_output import BuildOutput
from app.db.models.idea import Idea
from app.schemas.build import BuildOutputOut, ProductSketch

router = APIRouter(prefix="/build", tags=["build"])

@router.get("/{idea_id}", response_model=BuildOutputOut)
async def get_build(idea_id: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(BuildOutput).where(BuildOutput.idea_id == idea_id))
    build = result.scalars().first()
    if not build:
        raise HTTPException(404, "Build output not found — POST /build/{idea_id} to generate")
    return BuildOutputOut.model_validate(build, from_attributes=True)

@router.post("/{idea_id}", response_model=BuildOutputOut, status_code=202)
async def trigger_build(idea_id: str, background_tasks: BackgroundTasks, session: AsyncSession = Depends(get_session)):
    idea = (await session.execute(select(Idea).where(Idea.id == idea_id))).scalars().first()
    if not idea:
        raise HTTPException(404, "Idea not found")
    existing = (await session.execute(select(BuildOutput).where(BuildOutput.idea_id == idea_id))).scalars().first()
    if existing and existing.status in ("ready", "generating"):
        return BuildOutputOut.model_validate(existing, from_attributes=True)
    build = BuildOutput(idea_id=idea_id, product_sketch={}, technical_plan="", status="generating")
    session.add(build)
    await session.commit()
    await session.refresh(build)
    # Build generator is wired in Plan 3 — background_tasks.add_task(generate_build, build.id, idea_id)
    return BuildOutputOut.model_validate(build, from_attributes=True)
```

- [ ] **Create `app/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.lifespan import lifespan
from app.api.routes import system, ideas, saved, build

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
```

- [ ] **Commit**

```bash
git add app/
git commit -m "feat: add FastAPI routes for ideas, saved, build, system"
```

---

## Task 7: API tests

**Files:** `tests/conftest.py`, `tests/api/test_system.py`, `tests/api/test_ideas.py`, `tests/api/test_saved.py`

- [ ] **Create `tests/conftest.py`**

```python
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.main import app
from app.db.base import Base
from app.api.deps import get_session
from app.db.models import *  # ensure models registered

TEST_DB = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(scope="session")
def engine():
    return create_async_engine(TEST_DB)

@pytest.fixture(autouse=True)
async def db(engine):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async def override():
        async with session_factory() as s:
            yield s
    app.dependency_overrides[get_session] = override
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    app.dependency_overrides.clear()

@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
```

- [ ] **Create `tests/api/test_system.py`**

```python
async def test_health_returns_ok(client):
    r = await client.get("/api/system/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
    assert r.json()["database"] == "ok"
    assert r.json()["last_ingestion_run"] is None
```

- [ ] **Create `tests/api/test_ideas.py`**

```python
from app.db.models.idea import Idea
from app.api.deps import get_session

async def _seed_idea(client, **kwargs):
    from sqlalchemy.ext.asyncio import AsyncSession
    session_gen = get_session()  # not practical — use raw insert via fixture instead

# Simpler: seed via SQLAlchemy directly in the test
async def test_today_feed_empty(client):
    r = await client.get("/api/ideas/today")
    assert r.status_code == 200
    assert r.json()["ideas"] == []

async def test_surprise_no_ideas(client):
    r = await client.get("/api/ideas/surprise")
    assert r.status_code == 404

async def test_idea_detail_not_found(client):
    r = await client.get("/api/ideas/nonexistent")
    assert r.status_code == 404
```

- [ ] **Create `tests/api/test_saved.py`**

```python
async def test_list_saved_empty(client):
    r = await client.get("/api/saved/")
    assert r.status_code == 200
    assert r.json() == []

async def test_save_nonexistent_idea(client):
    r = await client.post("/api/saved/bad-id")
    assert r.status_code == 404

async def test_unsave_nonexistent_is_idempotent(client):
    r = await client.delete("/api/saved/bad-id")
    assert r.status_code == 204
```

- [ ] **Run all tests — expect PASS**

```bash
pytest tests/ -v
```

Expected output: all green. SQLite used — no Postgres needed for tests.

- [ ] **Commit**

```bash
git add tests/
git commit -m "test: add API route tests with in-memory SQLite"
```

---

## Task 8: Start script and smoke check

**Files:** `backend/start.sh` (copy + adapt from v1), `.env.example`

- [ ] **Create `backend/.env.example`**

```env
DATABASE_URL=postgresql+psycopg://whitespace:whitespace@localhost:5432/whitespace
RUVECTOR_BASE_URL=http://localhost:18732
EMBEDDINGS_MODE=full
PIPELINE_MODE=full
WORKER_SCHEDULE_HOUR=2
WORKER_SCHEDULE_MINUTE=0
ARXIV_CATEGORIES=cs.LG,cs.AI,cs.SE,cs.HC,cs.AR,cs.DC,eess.SP
IDEAS_PER_RUN=8
```

- [ ] **Start the backend and verify**

```bash
cd backend && source .venv/bin/activate
cp .env.example .env  # fill in real values if needed
uvicorn app.main:app --port 18730 --reload
```

- [ ] **Smoke test with curl**

```bash
curl http://localhost:18730/api/system/health
# Expected: {"status":"ok","database":"ok","last_ingestion_run":null}

curl http://localhost:18730/api/ideas/today
# Expected: {"date":"2026-04-25","papers_ingested":0,"ideas":[]}
```

- [ ] **Commit**

```bash
git add .env.example
git commit -m "chore: add env example and verify backend starts cleanly"
```

---

**Plan 1 complete.** The backend is running and all routes respond correctly. No worker or frontend needed yet.

**Continue with:** `2026-04-25-plan-2-worker-pipeline.md`
