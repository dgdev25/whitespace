from sqlalchemy.orm import Session
from app.db.models.idea import Idea
from app.db.models.connected_idea import ConnectedIdea


def compute_connections(session: Session, ideas: list[Idea]) -> None:
    for idea in ideas:
        idea_paper_set = set(idea.paper_ids or [])
        for other in ideas:
            if other.id == idea.id:
                continue
            shared = idea_paper_set & set(other.paper_ids or [])
            if shared:
                conn = ConnectedIdea(
                    idea_id=idea.id,
                    connected_idea_id=other.id,
                    shared_paper_count=len(shared),
                )
                session.add(conn)
    session.commit()
