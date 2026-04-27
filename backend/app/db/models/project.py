from __future__ import annotations
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, Integer, String, Text, JSON, Boolean, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Project(Base):
    __tablename__ = "projects"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(256))
    domain: Mapped[str] = mapped_column(String(64))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    focus_statement: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source_config: Mapped[dict] = mapped_column(JSON, default=dict)
    pipeline_config: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    runs: Mapped[list[ProjectRun]] = relationship(back_populates="project", cascade="all, delete-orphan")
    ideas: Mapped[list[ProjectIdea]] = relationship(back_populates="project", cascade="all, delete-orphan")


class ProjectRun(Base):
    __tablename__ = "project_runs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id"), index=True)
    status: Mapped[str] = mapped_column(String(32), default="running")
    stages: Mapped[list] = mapped_column(JSON, default=list)
    papers_fetched: Mapped[int] = mapped_column(Integer, default=0)
    ideas_generated: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    project: Mapped[Project] = relationship(back_populates="runs")
    ideas: Mapped[list[ProjectIdea]] = relationship(back_populates="run")


class ProjectIdea(Base):
    __tablename__ = "project_ideas"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id"), index=True)
    run_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("project_runs.id"), nullable=True)
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text)
    why_novel: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    who_builds: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    who_buys: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tags: Mapped[list] = mapped_column(JSON, default=list)
    paper_refs: Mapped[list] = mapped_column(JSON, default=list)
    score: Mapped[int] = mapped_column(Integer, default=0)
    novelty_score: Mapped[int] = mapped_column(Integer, default=0)
    feasibility_score: Mapped[int] = mapped_column(Integer, default=0)
    impact_score: Mapped[int] = mapped_column(Integer, default=0)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    prd: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    project: Mapped[Project] = relationship(back_populates="ideas")
    run: Mapped[Optional[ProjectRun]] = relationship(back_populates="ideas")
