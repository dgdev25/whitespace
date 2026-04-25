import json
import logging
from pathlib import Path
from app.pipeline.json_parsing import run_and_parse_json
from app.runners.selector import select_runner, _default_runners

logger = logging.getLogger(__name__)

_PROMPT = (Path(__file__).parent.parent / "prompts" / "synthesis.md").read_text()


def synthesise_ideas(gaps: dict, n: int, runner=None) -> list[dict]:
    if runner is None:
        runner = select_runner(_default_runners())
    prompt = _PROMPT.replace("{{n}}", str(n)).replace("{{gaps}}", json.dumps(gaps, indent=2))
    data = run_and_parse_json(runner, prompt, None, retries=1)
    return data if isinstance(data, list) else []
