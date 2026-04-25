from sqlalchemy import select
from sqlalchemy.orm import Session
from app.db.models.idea import Idea
from app.db.models.connected_idea import ConnectedIdea


def compute_connections(session: Session, ideas: list[Idea]) -> None:
    existing = {
        (row.idea_id, row.connected_idea_id)
        for row in session.execute(select(ConnectedIdea)).scalars().all()
    }
    for idea in ideas:
        idea_paper_set = set(idea.paper_ids or [])
        for other in ideas:
            if other.id == idea.id:
                continue
            if (idea.id, other.id) in existing:
                continue
            shared = idea_paper_set & set(other.paper_ids or [])
            if shared:
                conn = ConnectedIdea(
                    idea_id=idea.id,
                    connected_idea_id=other.id,
                    shared_paper_count=len(shared),
                )
                session.add(conn)
                existing.add((idea.id, other.id))
    session.commit()
