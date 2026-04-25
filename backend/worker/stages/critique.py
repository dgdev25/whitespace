import json
import logging
from pathlib import Path

from app.pipeline.json_parsing import run_and_parse_json
from app.runners.selector import _default_runners, select_runner_or_raise

logger = logging.getLogger(__name__)

_PROMPT = (Path(__file__).parent.parent / "prompts" / "critique.md").read_text()

_EMPTY = {
    "contested_claims": [],
    "hype_flags": [],
    "cross_source_tensions": [],
    "credible_signals": [],
    "underreported_gaps": [],
}


def critique_analyses(analyses: list[dict], runner=None) -> dict:
    """Apply critical thinking across all source analyses.

    Takes the combined analyses from papers and blog posts and produces a
    structured critique — hype flags, cross-source tensions, credible signals,
    and underreported gaps. This flows into gap_map for richer context.
    """
    if not analyses:
        return _EMPTY

    if runner is None:
        runner = select_runner_or_raise(_default_runners())

    prompt = _PROMPT.replace("{{analyses}}", json.dumps(analyses, indent=2))
    data = run_and_parse_json(runner, prompt, retries=1)
    if not isinstance(data, dict):
        logger.warning("Critique returned non-dict — using empty result")
        return _EMPTY
    return data
