from datetime import date
from sqlalchemy.orm import Session
from app.db.models.idea import Idea


def _badge(novelty: float, feasibility: float) -> str:
    if novelty > 0.75:
        return "novel"
    if feasibility > 0.75:
        return "feasible"
    if novelty > 0.5:
        return "emerging"
    return "speculative"


def select_and_persist(
    session: Session,
    ideas: list[dict],
    n: int,
) -> list[Idea]:
    today = date.today().isoformat()
    ranked = sorted(
        ideas,
        key=lambda x: x.get("novelty_score", 0) + x.get("feasibility_score", 0),
        reverse=True,
    )
    top = ranked[:n]
    idea_records = []
    for i, idea_data in enumerate(top):
        paper_ids = idea_data.get("paper_refs", [])
        record = Idea(
            title=idea_data.get("title", "Untitled"),
            description=idea_data.get("description", ""),
            why_novel=idea_data.get("why_novel", ""),
            who_builds=idea_data.get("who_builds", ""),
            who_buys=idea_data.get("who_buys", ""),
            novelty_score=float(idea_data.get("novelty_score", 0.5)),
            feasibility_score=float(idea_data.get("feasibility_score", 0.5)),
            badge=_badge(
                idea_data.get("novelty_score", 0.5),
                idea_data.get("feasibility_score", 0.5),
            ),
            featured_date=today,
            is_featured=(i == 0),
            paper_ids=paper_ids,
        )
        session.add(record)
        idea_records.append(record)
    session.commit()
    for r in idea_records:
        session.refresh(r)
    return idea_records
