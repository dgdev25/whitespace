import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Optional

from app.pipeline.json_parsing import run_and_parse_json
from app.runners.selector import _default_runners, select_runner

logger = logging.getLogger(__name__)

_PROMPT = (Path(__file__).parent.parent / "prompts" / "analysis.md").read_text()
_MAX_WORKERS = 6


def _analyse_one(paper: dict, runner) -> Optional[dict]:
    prompt = (
        _PROMPT
        .replace("{{title}}", paper.get("title", ""))
        .replace("{{abstract}}", paper.get("abstract", ""))
        .replace("{{full_text}}", (paper.get("full_text") or paper.get("abstract", ""))[:3000])
    )
    try:
        data = run_and_parse_json(runner, prompt, None, retries=1)
        return {"arxiv_id": paper.get("arxiv_id", ""), **data}
    except Exception as e:
        logger.warning("Analysis failed for %s: %s", paper.get("arxiv_id", "?"), e)
        return None


def analyse_papers(papers: list[dict], runner=None) -> list[dict]:
    if runner is None:
        runner = select_runner(_default_runners())
    results = []
    with ThreadPoolExecutor(max_workers=_MAX_WORKERS) as pool:
        futures = {pool.submit(_analyse_one, p, runner): p for p in papers}
        for future in as_completed(futures):
            result = future.result()
            if result is not None:
                results.append(result)
    return results
