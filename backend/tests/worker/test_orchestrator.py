import pytest
from unittest.mock import patch
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.db.base import Base
from app.db.models import *  # noqa: F401,F403 — registers all models with Base.metadata
from worker.orchestrator import run_daily_pipeline


@pytest.fixture
def sync_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    with Session() as s:
        yield s
    Base.metadata.drop_all(engine)


def test_pipeline_runs_with_stubs(sync_session):
    stub_ideas = [
        {
            "title": "Test Idea",
            "description": "Desc",
            "why_novel": "Novel",
            "who_builds": "Builder",
            "who_buys": "Buyer",
            "novelty_score": 0.8,
            "feasibility_score": 0.7,
            "paper_refs": ["2601.00001"],
        }
    ]

    with (
        patch(
            "worker.orchestrator.fetch_new_papers",
            return_value=[
                {
                    "arxiv_id": "2601.00001",
                    "title": "T",
                    "authors": "A",
                    "abstract": "Ab",
                    "categories": "cs.LG",
                    "published_date": "2026-01-01",
                    "url": "http://x",
                }
            ],
        ),
        patch(
            "worker.orchestrator.analyse_papers",
            return_value=[{"arxiv_id": "2601.00001", "gaps": ["gap1"]}],
        ),
        patch(
            "worker.orchestrator.map_gaps",
            return_value={"gaps": ["gap1"]},
        ),
        patch(
            "worker.orchestrator.synthesise_ideas",
            return_value=stub_ideas,
        ),
        patch(
            "worker.orchestrator.score_ideas",
            side_effect=lambda x, **kw: x,
        ),
    ):
        run_daily_pipeline(sync_session)

    count = sync_session.execute(text("SELECT COUNT(*) FROM ideas")).scalar()
    assert count == 1
