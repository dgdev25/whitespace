"""Deterministic, clearly labelled records for the public Whitespace preview."""

from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.build_output import BuildOutput
from app.db.models.idea import Idea
from app.db.models.ingestion_run import IngestionRun
from app.db.models.paper import Paper
from app.db.models.saved_idea import SavedIdea

_SHOWCASE_SKETCHES = {
    "showcase-idea-evidence-ledger": {
        "value_prop_headline": "Make every AI-assisted decision reviewable before it is relied on.",
        "value_prop_body": (
            "A synthetic product sketch for a workspace that links a claim to its source "
            "evidence, review decision, and retained audit context."
        ),
        "buyer_profile": (
            "Risk, compliance, and operations leaders responsible for decisions that need a human review trail."
        ),
        "buyer_signals": [
            "Manual evidence collation",
            "Growing audit requests",
            "AI outputs that require accountable review",
        ],
        "risks": [
            {
                "title": "Evidence quality",
                "description": (
                    "The demonstration uses only synthetic sources; a real product must validate source provenance."
                ),
            },
            {
                "title": "Review adoption",
                "description": "Review steps must be concise enough to fit an operator's actual workflow.",
            },
        ],
        "monetisation": [
            {
                "name": "Team workspace",
                "description": "Per-reviewer subscription for controlled decision workspaces.",
                "fit": "Strongest fit",
            },
            {
                "name": "Audit export",
                "description": "Paid retention and export package for review evidence.",
                "fit": "Supplementary",
            },
        ],
        "caveat": "Synthetic showcase content only. No customer data, source ingestion, or model request was used.",
    },
    "showcase-idea-ops-brief": {
        "value_prop_headline": "Turn fragmented operational signals into a reviewable escalation brief.",
        "value_prop_body": (
            "A synthetic concept that groups related events, makes uncertainty visible, "
            "and gives an operator a concise handoff."
        ),
        "buyer_profile": "Operations managers coordinating incidents across several monitoring and ticketing systems.",
        "buyer_signals": [
            "Alert fatigue",
            "Repeated manual status updates",
            "Escalations that lose source context",
        ],
        "risks": [
            {
                "title": "False grouping",
                "description": "Correlated events still require a human decision before escalation.",
            },
            {
                "title": "Data boundary",
                "description": "A production deployment needs explicit connector and retention controls.",
            },
        ],
        "monetisation": [
            {
                "name": "Operations workspace",
                "description": "Subscription for controlled incident-brief workflows.",
                "fit": "Strongest fit",
            },
            {
                "name": "Connector pack",
                "description": "Optional managed integrations for approved event sources.",
                "fit": "Supplementary",
            },
        ],
        "caveat": "Synthetic showcase content only. No live operational source or model request was used.",
    },
    "showcase-idea-policy-diff": {
        "value_prop_headline": "Make material policy changes visible to the people who own the controls.",
        "value_prop_body": (
            "A synthetic concept that compares revisions, links changes to accountable owners, "
            "and records their review."
        ),
        "buyer_profile": "Governance and risk teams maintaining policies that drive operational controls.",
        "buyer_signals": [
            "Policy revisions distributed by email",
            "Unclear control ownership",
            "Difficulty proving review completion",
        ],
        "risks": [
            {
                "title": "Interpretation",
                "description": "Materiality decisions must remain reviewable and accountable.",
            },
            {
                "title": "Scope",
                "description": "A real rollout needs a bounded policy corpus and deletion process.",
            },
        ],
        "monetisation": [
            {
                "name": "Control review workspace",
                "description": "Subscription for policy-diff and owner-review workflows.",
                "fit": "Strongest fit",
            },
            {
                "name": "Retention package",
                "description": "Optional evidence retention and controlled export.",
                "fit": "Supplementary",
            },
        ],
        "caveat": "Synthetic showcase content only. No policy corpus or model request was used.",
    },
}


async def _repair_showcase_build_outputs(session: AsyncSession) -> None:
    """Upgrade only this preview's reserved records after a schema/content refresh."""
    builds = (
        (await session.execute(select(BuildOutput).where(BuildOutput.idea_id.in_(_SHOWCASE_SKETCHES)))).scalars().all()
    )
    changed = False
    for build in builds:
        expected = _SHOWCASE_SKETCHES[build.idea_id]
        if build.product_sketch != expected:
            build.product_sketch = expected
            changed = True
    if changed:
        await session.commit()


async def seed_showcase_data(session: AsyncSession) -> None:
    """Seed only an empty database; never overwrite a developer's local work."""
    if (await session.execute(select(Idea.id).limit(1))).scalar_one_or_none() is not None:
        await _repair_showcase_build_outputs(session)
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
                product_sketch=_SHOWCASE_SKETCHES[idea.id],
                technical_plan=(
                    "Synthetic demonstration plan: evidence capture, reviewer queue, and immutable decision trail."
                ),
                prd="# Synthetic showcase PRD\n\nThis static example exists solely for product review.",
            )
        )
    await session.commit()
