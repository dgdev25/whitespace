from sqlalchemy import Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UserSettings(Base):
    __tablename__ = "user_settings"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    ideas_per_run: Mapped[int] = mapped_column(Integer, nullable=False)
    max_sources_per_run: Mapped[int] = mapped_column(Integer, nullable=False)
    cached_analyses_count: Mapped[int] = mapped_column(Integer, nullable=False)
    runner_model_prefs: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
