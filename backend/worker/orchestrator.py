import logging
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.config import settings
from app.db.models.paper import Paper
from app.db.models.chunk import Chunk
from app.pipeline.chunking import chunk_text
from worker.stages.fetch import fetch_new_papers
from worker.stages.analyse import analyse_papers
from worker.stages.gap_map import map_gaps
from worker.stages.synthesise import synthesise_ideas
from worker.stages.score import score_ideas
from worker.stages.select import select_and_persist
from worker.stages.connect import compute_connections

logger = logging.getLogger(__name__)


def run_daily_pipeline(session: Session) -> None:
    today = date.today().isoformat()
    logger.info(f"Starting daily pipeline for {today}")

    # 1. Fetch new arXiv papers
    existing_ids = {r[0] for r in session.execute(text("SELECT arxiv_id FROM papers")).all()}
    categories = [c.strip() for c in settings.arxiv_categories.split(",")]
    raw_papers = fetch_new_papers(categories, existing_ids=existing_ids)
    if not raw_papers:
        logger.info("No new papers found — skipping pipeline")
        return

    # 2. Persist paper records and build full_text from abstract
    paper_records = []
    for p in raw_papers[:30]:
        paper = Paper(
            arxiv_id=p["arxiv_id"],
            title=p["title"],
            authors=p["authors"],
            abstract=p["abstract"],
            full_text=p.get("abstract", ""),
            categories=p["categories"],
            published_date=p["published_date"],
            url=p["url"],
        )
        session.add(paper)
        paper_records.append((paper, p))
    session.commit()
    for paper, _ in paper_records:
        session.refresh(paper)

    # 3. Chunk papers (chunk_text returns list[str])
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

    # 4. Analyse → Gap map → Synthesise → Score
    paper_dicts = [
        {
            "title": p.title,
            "abstract": p.abstract,
            "full_text": p.full_text,
            "arxiv_id": p.arxiv_id,
        }
        for p, _ in paper_records
    ]
    analyses = analyse_papers(paper_dicts)
    gaps = map_gaps(analyses)
    ideas_raw = synthesise_ideas(gaps, n=settings.ideas_per_run)
    ideas_scored = score_ideas(ideas_raw)

    # 5. Select top N, persist
    idea_records = select_and_persist(
        session, ideas_scored, len(paper_records), n=settings.ideas_per_run
    )

    # 6. Compute connections
    compute_connections(session, idea_records)

    logger.info(f"Pipeline complete — {len(idea_records)} ideas written for {today}")
