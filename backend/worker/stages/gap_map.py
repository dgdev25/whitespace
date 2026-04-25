import json
import logging
from pathlib import Path
from app.pipeline.json_parsing import run_and_parse_json
from app.runners.selector import select_runner_or_raise, _default_runners

logger = logging.getLogger(__name__)

_PROMPT = (Path(__file__).parent.parent / "prompts" / "gap_map.md").read_text()


def map_gaps(analyses: list[dict], runner=None) -> dict:
    if runner is None:
        runner = select_runner_or_raise(_default_runners())
    prompt = _PROMPT.replace("{{analyses}}", json.dumps(analyses, indent=2))
    data = run_and_parse_json(runner, prompt, None, retries=1)
    return data if isinstance(data, dict) else {"engineering_gaps": [], "ready_to_productize": [], "recurring_pain_points": []}
