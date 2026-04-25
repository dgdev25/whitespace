import uuid

from sqlalchemy import JSON, Boolean, DateTime, Float, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


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
    badge: Mapped[str] = mapped_column(String(32))
    featured_date: Mapped[str] = mapped_column(String(16), nullable=True, index=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    paper_ids: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    connections: Mapped[list["ConnectedIdea"]] = relationship(  # noqa: F821
        foreign_keys="ConnectedIdea.idea_id", back_populates="idea", cascade="all, delete-orphan"
    )
