import uuid

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ConnectedIdea(Base):
    __tablename__ = "connected_ideas"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    idea_id: Mapped[str] = mapped_column(ForeignKey("ideas.id", ondelete="CASCADE"), index=True)
    connected_idea_id: Mapped[str] = mapped_column(ForeignKey("ideas.id", ondelete="CASCADE"))
    shared_paper_count: Mapped[int] = mapped_column(Integer, default=1)
    idea: Mapped["Idea"] = relationship(foreign_keys=[idea_id], back_populates="connections")  # noqa: F821
    connected: Mapped["Idea"] = relationship(foreign_keys=[connected_idea_id])  # noqa: F821
