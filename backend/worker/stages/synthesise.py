import json
import logging
from pathlib import Path
from app.pipeline.json_parsing import parse_llm_json
from app.runners.selector import _default_runners

logger = logging.getLogger(__name__)

_PROMPT = (Path(__file__).parent.parent / "prompts" / "synthesis.md").read_text()


def synthesise_ideas(gaps: dict, n: int, runner=None) -> list[dict]:
    if runner is None:
        runner = _default_runners()
    prompt = _PROMPT.replace("{{n}}", str(n)).replace("{{gaps}}", json.dumps(gaps, indent=2))
    response = runner.run(prompt)
    data = parse_llm_json(response)
    return data if isinstance(data, list) else []
