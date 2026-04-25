import logging

from sqlalchemy.orm import Session

from app.db.models.analysis import PaperAnalysis
from app.pipeline.json_parsing import run_and_parse_json
from app.prompts import load_prompt
from app.runners.base import LLMRunner
from app.schemas.llm_outputs import GapMapOutput

logger = logging.getLogger(__name__)

GAP_MAP_SYSTEM_PROMPT = load_prompt("gap_mapping")


def run_gap_map(
    session: Session,
    session_id: str,
    runner: LLMRunner,
) -> GapMapOutput:
    """Identify gaps and contradictions across analyzed papers.

    Args:
        session: Database session for querying analyses
        session_id: ID of the session to analyze
        runner: LLM runner instance

    Returns:
        GapMapOutput with identified gaps, contradictions, and themes
    """
    # Fetch all analyses for the session
    analyses = session.query(PaperAnalysis).filter(
        PaperAnalysis.session_id == session_id
    ).all()

    # Build prompt with all analyses
    prompt_parts = [
        "Analyze the following research paper analyses for gaps, contradictions, and themes:\n"
    ]

    for i, analysis in enumerate(analyses, 1):
        prompt_parts.append(f"\n--- Paper {i} ---")
        if analysis.summary:
            prompt_parts.append(f"Summary: {analysis.summary}")
        if analysis.key_claims:
            prompt_parts.append(f"Key Claims: {', '.join(analysis.key_claims)}")
        if analysis.open_questions:
            prompt_parts.append(f"Open Questions: {', '.join(analysis.open_questions)}")
        if analysis.stated_limitations:
            prompt_parts.append(f"Limitations: {', '.join(analysis.stated_limitations)}")

    prompt = "".join(prompt_parts)

    try:
        # Call LLM runner
        data = run_and_parse_json(runner, prompt, GAP_MAP_SYSTEM_PROMPT, retries=1)

        return GapMapOutput(
            gaps=data.get("gaps", []),
            contradictions=data.get("contradictions", []),
            recurring_themes=data.get("recurring_themes", []),
        )

    except Exception as e:
        logger.error(f"Error mapping gaps for session {session_id}: {e}")
        raise
