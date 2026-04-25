from datetime import datetime

from pydantic import BaseModel

from app.schemas.ideas import IdeaSummary


class SavedIdeaOut(BaseModel):
    id: str
    idea: IdeaSummary
    saved_at: datetime
    has_build_output: bool
