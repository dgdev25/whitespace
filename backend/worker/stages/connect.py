from sqlalchemy import or_, select
from sqlalchemy.orm import Session
from app.db.models.idea import Idea
from app.db.models.connected_idea import ConnectedIdea


def compute_connections(session: Session, ideas: list[Idea]) -> None:
    if not ideas:
        return
    idea_ids = {i.id for i in ideas}
    existing_rows = session.execute(
        select(ConnectedIdea).where(
            or_(
                ConnectedIdea.idea_id.in_(idea_ids),
                ConnectedIdea.connected_idea_id.in_(idea_ids),
            )
        )
    ).scalars().all()
    existing = {(row.idea_id, row.connected_idea_id) for row in existing_rows}
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
