import logging
from datetime import date, datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.config import settings
from app.db.models.paper import Paper
from app.db.models.chunk import Chunk
from app.db.models.ingestion_run import IngestionRun
from app.pipeline.chunking import chunk_text
from worker.stages.fetch import fetch_new_papers
from worker.stages.fetch_blogs import fetch_blog_posts
from worker.stages.fetch_semantic_scholar import fetch_semantic_scholar_papers
from worker.stages.analyse import analyse_papers
from worker.stages.critique import critique_analyses
from worker.stages.gap_map import map_gaps
from worker.stages.synthesise import synthesise_ideas
from worker.stages.score import score_ideas
from worker.stages.select import select_and_persist
from worker.stages.connect import compute_connections

logger = logging.getLogger(__name__)


def _abstracts_to_pseudo_analyses(papers: list[dict]) -> list[dict]:
    """Build lightweight pseudo-analyses from raw paper metadata.

    Skips per-paper LLM calls so re-synthesis runs complete in seconds
    rather than minutes. gap_map + synthesise still use the LLM.
    """
    return [
        {
            "arxiv_id": p.get("arxiv_id", ""),
            "summary": p.get("abstract", "")[:600],
            "key_claims": [],
            "methods": [],
            "open_questions": [],
            "stated_limitations": [],
        }
        for p in papers
    ]


def run_daily_pipeline(session: Session) -> None:
    today = date.today().isoformat()
    logger.info(f"Starting daily pipeline for {today}")

    run = IngestionRun(run_date=today)
    session.add(run)
    session.commit()
    session.refresh(run)

    try:
        # 1. Fetch from all sources
        existing_ids = {r[0] for r in session.execute(text("SELECT arxiv_id FROM papers")).all()}
        orgs = [o.strip() for o in settings.arxiv_orgs.split(",")]
        categories = [c.strip() for c in settings.arxiv_categories.split(",")]

        raw_arxiv = fetch_new_papers(orgs=orgs, categories=categories, existing_ids=existing_ids)
        all_existing = existing_ids | {p["arxiv_id"] for p in raw_arxiv}

        raw_blogs = fetch_blog_posts(existing_ids=all_existing)
        all_existing |= {p["arxiv_id"] for p in raw_blogs}

        raw_s2 = fetch_semantic_scholar_papers(existing_ids=all_existing)

        raw_all = raw_arxiv + raw_blogs + raw_s2
        logger.info(
            "Fetched — arXiv: %d, blogs: %d, Semantic Scholar: %d",
            len(raw_arxiv), len(raw_blogs), len(raw_s2),
        )

        if raw_all:
            # 2. Persist all new records
            paper_records = []
            for p in raw_all[:50]:
                paper = Paper(
                    arxiv_id=p["arxiv_id"],
                    title=p["title"],
                    authors=p["authors"],
                    abstract=p.get("abstract", ""),
                    full_text=p.get("full_text") or p.get("abstract", ""),
                    categories=p["categories"],
                    published_date=p["published_date"],
                    url=p.get("url", ""),
                    source=p.get("source", "arxiv"),
                )
                session.add(paper)
                paper_records.append((paper, p))
            session.commit()
            for paper, _ in paper_records:
                session.refresh(paper)

            run.papers_fetched = len([p for p in paper_records if p[1].get("source", "arxiv") == "arxiv"])
            session.commit()

            # 3. Chunk papers (arxiv + semantic scholar only — blogs are already plain text)
            for paper, p in paper_records:
                text_to_chunk = p.get("abstract", "")
                if text_to_chunk:
                    chunks = chunk_text(text_to_chunk)
                    for idx, chunk_str in enumerate(chunks):
                        session.add(Chunk(
                            paper_id=paper.id,
                            text=chunk_str,
                            chunk_index=idx,
                            token_count=len(chunk_str.split()),
                        ))
            session.commit()

            paper_dicts = [
                {
                    "title": p.title,
                    "abstract": p.abstract,
                    "full_text": p.full_text,
                    "arxiv_id": p.arxiv_id,
                    "source": p.source,
                }
                for p, _ in paper_records
            ]

            # 4. Analyse all sources in parallel
            analyses = analyse_papers(paper_dicts)

        else:
            # No new content — re-synthesise from existing pool (fast path)
            logger.info("No new content — re-synthesising from existing pool (fast path)")
            existing_papers = session.query(Paper).order_by(Paper.published_date.desc()).limit(50).all()
            if not existing_papers:
                logger.info("No content in DB yet — skipping")
                run.completed_at = datetime.now(timezone.utc)
                session.commit()
                return

            run.papers_fetched = 0
            session.commit()

            paper_dicts = [
                {
                    "title": p.title,
                    "abstract": p.abstract,
                    "full_text": p.full_text,
                    "arxiv_id": p.arxiv_id,
                    "source": getattr(p, "source", "arxiv"),
                }
                for p in existing_papers
            ]
            analyses = _abstracts_to_pseudo_analyses(paper_dicts)

        # 5. Critical thinking pass — flags hype, tensions, credible signals
        critique = critique_analyses(analyses)

        # 6. Gap map (informed by critique) → Synthesise → Score
        gaps = map_gaps(analyses, critique=critique)
        ideas_raw = synthesise_ideas(gaps, n=settings.ideas_per_run)
        ideas_scored = score_ideas(ideas_raw)

        # 7. Select top N, persist
        idea_records = select_and_persist(
            session, ideas_scored, n=settings.ideas_per_run, run_id=run.id
        )

        # 8. Compute connections
        compute_connections(session, idea_records)

        run.ideas_generated = len(idea_records)
        run.completed_at = datetime.now(timezone.utc)
        session.commit()

        logger.info(f"Pipeline complete — {len(idea_records)} ideas for {today}")

    except Exception as exc:
        run.error = str(exc)
        run.completed_at = datetime.now(timezone.utc)
        session.commit()
        raise
