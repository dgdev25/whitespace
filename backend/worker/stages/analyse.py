import logging
from pathlib import Path
from app.pipeline.json_parsing import run_and_parse_json
from app.runners.selector import select_runner, _default_runners

logger = logging.getLogger(__name__)

_PROMPT = (Path(__file__).parent.parent / "prompts" / "analysis.md").read_text()


def analyse_papers(papers: list[dict], runner=None) -> list[dict]:
    """Run per-paper LLM analysis. Returns list of analysis dicts."""
    if runner is None:
        runner = select_runner(_default_runners())
    results = []
    for p in papers:
        prompt = (
            _PROMPT
            .replace("{{title}}", p.get("title", ""))
            .replace("{{abstract}}", p.get("abstract", ""))
            .replace("{{full_text}}", (p.get("full_text") or p.get("abstract", ""))[:3000])
        )
        try:
            data = run_and_parse_json(runner, prompt, None, retries=1)
            results.append({"arxiv_id": p.get("arxiv_id", ""), **data})
        except Exception as e:
            logger.warning(f"Analysis failed for {p.get('arxiv_id', '?')}: {e}")
    return results
