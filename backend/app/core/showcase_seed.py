"""Deterministic, clearly labelled records for the public Whitespace preview."""

from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.build_output import BuildOutput
from app.db.models.idea import Idea
from app.db.models.ingestion_run import IngestionRun
from app.db.models.paper import Paper
from app.db.models.saved_idea import SavedIdea


async def seed_showcase_data(session: AsyncSession) -> None:
    """Seed only an empty database; never overwrite a developer's local work."""
    if (await session.execute(select(Idea.id).limit(1))).scalar_one_or_none() is not None:
        return

    today = date.today().isoformat()
    now = datetime.now(timezone.utc)
    papers = [
        Paper(
            arxiv_id="showcase-privacy-graph",
            title="Synthetic showcase: private evidence graphs for regulated teams",
            authors="Whitespace demo dataset",
            abstract="A deliberately synthetic paper record used only to demonstrate traceable idea review.",
            categories="cs.AI",
            published_date=today,
            url="https://example.invalid/whitespace-showcase/privacy-graph",
            source="synthetic-showcase",
        ),
        Paper(
            arxiv_id="showcase-ops-signals",
            title="Synthetic showcase: operational signal compression",
            authors="Whitespace demo dataset",
            abstract="A deliberately synthetic paper record used only to demonstrate ranked opportunity cards.",
            categories="cs.LG",
            published_date=today,
            url="https://example.invalid/whitespace-showcase/ops-signals",
            source="synthetic-showcase",
        ),
    ]
    session.add_all(papers)
    run = IngestionRun(
        id="showcase-run-001",
        run_date=today,
        papers_fetched=len(papers),
        ideas_generated=3,
        started_at=now,
        completed_at=now,
    )
    session.add(run)
    ideas = [
        Idea(
            id="showcase-idea-evidence-ledger",
            title="Evidence Ledger for AI decisions",
            description=(
                "Synthetic showcase idea: package source records, claims, and human review "
                "into an auditable decision workspace."
            ),
            why_novel="Combines provenance-first review with an operator-friendly evidence graph.",
            who_builds="A small product team with workflow and compliance experience.",
            who_buys="Regulated operations teams that need reviewable AI-assisted decisions.",
            novelty_score=8.7,
            feasibility_score=7.9,
            badge="Synthetic showcase",
            featured_date=today,
            run_id=run.id,
            is_featured=True,
            paper_ids=[papers[0].arxiv_id, papers[1].arxiv_id],
        ),
        Idea(
            id="showcase-idea-ops-brief",
            title="Signal Brief for incident triage",
            description=(
                "Synthetic showcase idea: turn fragmented operational events into a concise, "
                "reviewable escalation brief."
            ),
            why_novel="Makes the evidence and uncertainty visible instead of generating an opaque summary.",
            who_builds="A product engineer and an operations-domain partner.",
            who_buys="Service teams handling recurring high-volume operational alerts.",
            novelty_score=8.1,
            feasibility_score=8.4,
            badge="Synthetic showcase",
            featured_date=today,
            run_id=run.id,
            paper_ids=[papers[1].arxiv_id],
        ),
        Idea(
            id="showcase-idea-policy-diff",
            title="Policy Diff for changing controls",
            description=(
                "Synthetic showcase idea: compare policy revisions and turn material changes "
                "into owner-specific review tasks."
            ),
            why_novel="Connects policy text changes to operational controls and accountable owners.",
            who_builds="A workflow-focused SaaS team.",
            who_buys="Governance and risk teams maintaining controlled procedures.",
            novelty_score=7.8,
            feasibility_score=8.0,
            badge="Synthetic showcase",
            featured_date=today,
            run_id=run.id,
            paper_ids=[papers[0].arxiv_id],
        ),
    ]
    session.add_all(ideas)
    session.add(SavedIdea(idea_id=ideas[0].id))
    for idea in ideas:
        session.add(
            BuildOutput(
                idea_id=idea.id,
                status="ready",
                product_sketch={"kind": "synthetic-showcase", "note": "No model request was made."},
                technical_plan=(
                    "Synthetic demonstration plan: evidence capture, reviewer queue, and immutable decision trail."
                ),
                prd="# Synthetic showcase PRD\n\nThis static example exists solely for product review.",
            )
        )
    await session.commit()
