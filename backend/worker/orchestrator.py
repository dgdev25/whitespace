import logging
from datetime import date, datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.config import settings
from app.db.models.paper import Paper
from app.db.models.chunk import Chunk
from app.db.models.ingestion_run import IngestionRun
from app.pipeline.chunking import chunk_text
from worker import progress as prog
from worker.stages.fetch import fetch_new_papers
from worker.stages.fetch_blogs import fetch_blog_posts
from worker.stages.fetch_github import fetch_github_repos
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


def run_daily_pipeline(
    session: Session,
    max_sources: int | None = None,
    cached_analyses: int | None = None,
    ideas_per_run: int | None = None,
    orgs: list[str] | None = None,
    categories: list[str] | None = None,
    github_repos: list[str] | None = None,
) -> None:
    max_new = max_sources if max_sources is not None else settings.max_sources_per_run
    cached_limit = cached_analyses if cached_analyses is not None else settings.cached_analyses_count
    n_ideas = ideas_per_run if ideas_per_run is not None else settings.ideas_per_run

    today = date.today().isoformat()
    logger.info(f"Starting daily pipeline for {today}")

    prog.start_run()
    prog.emit("start", f"Pipeline started for {today}", "running")

    run = IngestionRun(run_date=today)
    session.add(run)
    session.commit()
    session.refresh(run)

    try:
        # 1. Fetch from all sources
        existing_ids = {r[0] for r in session.execute(text("SELECT arxiv_id FROM papers")).all()}
        _orgs = orgs if orgs else [o.strip() for o in settings.arxiv_orgs.split(",")]
        _cats = categories if categories else [c.strip() for c in settings.arxiv_categories.split(",")]

        prog.emit("fetch_arxiv", f"Fetching arXiv papers ({', '.join(_orgs)})…", "running")
        raw_arxiv = fetch_new_papers(orgs=_orgs, categories=_cats, existing_ids=existing_ids)
        prog.emit("fetch_arxiv", f"arXiv: {len(raw_arxiv)} new papers", "done")
        all_existing = existing_ids | {p["arxiv_id"] for p in raw_arxiv}

        prog.emit("fetch_blogs", "Fetching blog posts (Anthropic, DeepMind, OpenAI, xAI)…", "running")
        raw_blogs = fetch_blog_posts(existing_ids=all_existing)
        prog.emit("fetch_blogs", f"Blogs: {len(raw_blogs)} new posts", "done")
        all_existing |= {p["arxiv_id"] for p in raw_blogs}

        prog.emit("fetch_s2", "Fetching Semantic Scholar papers…", "running")
        raw_s2 = fetch_semantic_scholar_papers(existing_ids=all_existing)
        prog.emit("fetch_s2", f"Semantic Scholar: {len(raw_s2)} new papers", "done")
        all_existing |= {p["arxiv_id"] for p in raw_s2}

        _repos = github_repos if github_repos is not None else []
        raw_github: list[dict] = []
        if _repos:
            prog.emit("fetch_github", f"Fetching {len(_repos)} GitHub repo(s)…", "running")
            raw_github = fetch_github_repos(repos=_repos, existing_ids=all_existing)
            prog.emit("fetch_github", f"GitHub: {len(raw_github)} new repo(s)", "done")

        raw_all = raw_arxiv + raw_blogs + raw_s2 + raw_github
        logger.info("Fetched — arXiv: %d, blogs: %d, Semantic Scholar: %d, GitHub: %d",
                    len(raw_arxiv), len(raw_blogs), len(raw_s2), len(raw_github))

        if raw_all:
            # 2. Persist all new records (capped per run)
            paper_records = []
            for p in raw_all[:max_new]:
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

            # 3. Chunk
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

            # 4. Analyse only new papers; load cached analyses for the rest
            prog.emit("analyse", f"Analysing {len(paper_dicts)} new sources…", "running")
            new_analyses = analyse_papers(paper_dicts)

            # Save analyses back to paper records for future cache hits
            arxiv_to_analysis = {a["arxiv_id"]: a for a in new_analyses}
            for paper, _ in paper_records:
                if paper.arxiv_id in arxiv_to_analysis:
                    paper.analysis = arxiv_to_analysis[paper.arxiv_id]
            session.commit()

            # Analyse any previously-imported papers that have no LLM analysis yet
            # (e.g. repos imported via org scan — READMEs stored but never analysed)
            new_arxiv_ids = {p.arxiv_id for p, _ in paper_records}
            unanalysed = (
                session.query(Paper)
                .filter(Paper.analysis.is_(None))
                .filter(~Paper.arxiv_id.in_(new_arxiv_ids))
                .order_by(Paper.created_at.desc())
                .limit(max_new)
                .all()
            )
            if unanalysed:
                prog.emit("analyse", f"Analysing {len(unanalysed)} previously-imported sources…", "running")
                unanalysed_dicts = [
                    {"title": p.title, "abstract": p.abstract, "full_text": p.full_text,
                     "arxiv_id": p.arxiv_id, "source": p.source}
                    for p in unanalysed
                ]
                extra_analyses = analyse_papers(unanalysed_dicts)
                extra_map = {a["arxiv_id"]: a for a in extra_analyses}
                for p in unanalysed:
                    if p.arxiv_id in extra_map:
                        p.analysis = extra_map[p.arxiv_id]
                session.commit()
                new_analyses += extra_analyses

            # Load cached analyses from previously-analysed papers
            cached_papers = (
                session.query(Paper)
                .filter(Paper.analysis.isnot(None))
                .filter(~Paper.arxiv_id.in_(new_arxiv_ids | {p.arxiv_id for p in unanalysed}))
                .order_by(Paper.created_at.desc())
                .limit(cached_limit)
                .all()
            )
            cached_analyses_list: list[dict] = [p.analysis for p in cached_papers if p.analysis is not None]
            analyses: list[dict] = new_analyses + cached_analyses_list
            prog.emit("analyse", f"Analysed {len(new_analyses)} new + {len(cached_analyses_list)} cached", "done")

            # Build arxiv_id → title lookup for grounded paper_refs in synthesis
            source_map: dict[str, str] = {p["arxiv_id"]: p["title"] for p in paper_dicts}
            for p in unanalysed:
                source_map.setdefault(p.arxiv_id, p.title)
            for p in cached_papers:
                source_map.setdefault(p.arxiv_id, p.title)

        else:
            prog.emit("fetch_arxiv", "No new content — re-synthesising from existing pool", "done")
            logger.info("No new content — re-synthesising from existing pool (fast path)")
            existing_papers = session.query(Paper).order_by(Paper.published_date.desc()).limit(50).all()
            if not existing_papers:
                prog.emit("error", "No content in database yet", "error")
                logger.info("No content in DB yet — skipping")
                run.completed_at = datetime.now(timezone.utc)
                session.commit()
                prog.end_run()
                return

            run.papers_fetched = 0
            session.commit()

            # Prefer cached LLM analyses; properly analyse any unanalysed papers
            # (covers org-imported repos whose READMEs have never been LLM-processed)
            cached = [p for p in existing_papers if p.analysis]
            uncached = [p for p in existing_papers if not p.analysis]

            analyses: list[dict] = [a for p in cached if (a := p.analysis) is not None]
            if uncached:
                to_analyse = uncached[:max_new]
                prog.emit("analyse", f"Analysing {len(to_analyse)} unanalysed sources…", "running")
                uncached_dicts = [
                    {"title": p.title, "abstract": p.abstract, "full_text": p.full_text,
                     "arxiv_id": p.arxiv_id, "source": getattr(p, "source", "arxiv")}
                    for p in to_analyse
                ]
                uncached_analyses = analyse_papers(uncached_dicts)
                uncached_map = {a["arxiv_id"]: a for a in uncached_analyses}
                for p in to_analyse:
                    if p.arxiv_id in uncached_map:
                        p.analysis = uncached_map[p.arxiv_id]
                session.commit()
                analyses += uncached_analyses

            # Build arxiv_id → title lookup for grounded paper_refs in synthesis
            source_map = {p.arxiv_id: p.title for p in existing_papers}

            prog.emit("analyse", f"{len(cached)} cached + {len(uncached[:10])} pseudo analyses", "done")

        # 5. Critique
        prog.emit("critique", "Applying critical thinking across all sources…", "running")
        critique = critique_analyses(analyses)
        prog.emit("critique", "Critical review complete", "done")

        # 6. Gap map
        prog.emit("gap_map", "Mapping research gaps…", "running")
        gaps = map_gaps(analyses, critique=critique)
        prog.emit("gap_map", "Gap map complete", "done")

        # 7. Synthesise
        prog.emit("synthesise", f"Synthesising {n_ideas} ideas…", "running")
        ideas_raw = synthesise_ideas(gaps, n=n_ideas, source_map=source_map)
        prog.emit("synthesise", f"{len(ideas_raw)} ideas synthesised", "done")

        # 8. Score
        prog.emit("score", "Scoring ideas…", "running")
        ideas_scored = score_ideas(ideas_raw)
        prog.emit("score", "Scoring complete", "done")

        # 9. Select
        prog.emit("select", f"Selecting top {n_ideas} ideas…", "running")
        idea_records = select_and_persist(
            session, ideas_scored, n=n_ideas, run_id=run.id
        )
        prog.emit("select", f"{len(idea_records)} ideas saved", "done")

        # 10. Connect
        prog.emit("connect", "Computing connections between ideas…", "running")
        compute_connections(session, idea_records)
        prog.emit("connect", "Connections mapped", "done")

        run.ideas_generated = len(idea_records)
        run.completed_at = datetime.now(timezone.utc)
        session.commit()

        prog.emit("complete", f"Done — {len(idea_records)} new ideas ready", "done")
        logger.info(f"Pipeline complete — {len(idea_records)} ideas for {today}")

    except Exception as exc:
        prog.emit("error", str(exc), "error")
        run.error = str(exc)
        run.completed_at = datetime.now(timezone.utc)
        session.commit()
        raise
    finally:
        prog.end_run()
