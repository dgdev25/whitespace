import logging
from pathlib import Path
from app.pipeline.json_parsing import run_and_parse_json
from app.runners.selector import select_runner, _default_runners

logger = logging.getLogger(__name__)

_PROMPT = (Path(__file__).parent.parent / "prompts" / "score.md").read_text()


def score_ideas(ideas: list[dict], runner=None) -> list[dict]:
    if runner is None:
        runner = select_runner(_default_runners())
    scored = []
    for idea in ideas:
        prompt = (
            _PROMPT
            .replace("{{title}}", idea.get("title", ""))
            .replace("{{description}}", idea.get("description", ""))
            .replace("{{why_novel}}", idea.get("why_novel", ""))
            .replace("{{who_builds}}", idea.get("who_builds", ""))
            .replace("{{who_buys}}", idea.get("who_buys", ""))
        )
        try:
            data = run_and_parse_json(runner, prompt, None, retries=1)
            idea["novelty_score"] = float(data.get("novelty_score", 0.5))
            idea["feasibility_score"] = float(data.get("feasibility_score", 0.5))
        except Exception as e:
            logger.warning(f"Scoring failed for idea '{idea.get('title', '?')}': {e}")
            idea.setdefault("novelty_score", 0.5)
            idea.setdefault("feasibility_score", 0.5)
        scored.append(idea)
    return scored
