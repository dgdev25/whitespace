import uuid

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class SavedIdea(Base):
    __tablename__ = "saved_ideas"
    __table_args__ = (UniqueConstraint("idea_id"),)
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    idea_id: Mapped[str] = mapped_column(ForeignKey("ideas.id", ondelete="CASCADE"), index=True)
    saved_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    idea: Mapped["Idea"] = relationship()  # noqa: F821
