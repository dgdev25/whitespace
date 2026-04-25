from unittest.mock import patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.base import Base
from app.db.models import *
import uuid

def _make_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()

def test_build_generator_marks_ready():
    session = _make_session()
    idea = Idea(
        id=str(uuid.uuid4()), title="Test", description="Desc", why_novel="Novel",
        who_builds="Builder", who_buys="Buyer", novelty_score=0.8,
        feasibility_score=0.7, badge="novel", paper_ids=["2601.00001"]
    )
    session.add(idea)
    build = BuildOutput(idea_id=idea.id, product_sketch={}, technical_plan="", status="generating")
    session.add(build)
    session.commit()

    sketch = {
        "value_prop_headline": "Fix APIs automatically",
        "value_prop_body": "Handles drift.",
        "buyer_profile": "Platform engineers",
        "buyer_signals": ["50+ engineers"],
        "risks": [{"title": "Latency", "description": "Adds 100ms"}],
        "monetisation": [{"name": "SaaS", "description": "Usage-based", "fit": "Strongest fit"}],
        "caveat": "Hypotheses only."
    }

    with patch("worker.build_generator.generate_product_sketch", return_value=sketch), \
         patch("worker.build_generator.generate_technical_plan", return_value="## Plan\nPhase 1"):
        from worker.build_generator import run_build
        run_build(session, build.id, idea.id)

    session.refresh(build)
    assert build.status == "ready"
    assert build.product_sketch["value_prop_headline"] == "Fix APIs automatically"
    assert "Phase 1" in build.technical_plan
