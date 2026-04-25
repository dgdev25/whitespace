import logging

from sqlalchemy.orm import Session

from app.db.models.chunk import Chunk
from app.db.models.paper import Paper
from app.pipeline.json_parsing import run_and_parse_json
from app.prompts import load_prompt
from app.runners.base import LLMRunner
from app.schemas.llm_outputs import PaperAnalysisOutput
from app.vector.client import RuVectorClient

logger = logging.getLogger(__name__)

ANALYSIS_SYSTEM_PROMPT = load_prompt("paper_analysis")


def run_analysis(
    session: Session,
    paper: Paper,
    runner: LLMRunner,
    ruvector_client: RuVectorClient,
) -> PaperAnalysisOutput:
    """Analyze a research paper using LLM.

    Args:
        session: Database session for querying chunks
        paper: Paper object to analyze
        runner: LLM runner instance
        ruvector_client: RuVector client for vector search

    Returns:
        PaperAnalysisOutput with extracted analysis
    """
    # Build prompt with paper content and relevant chunks
    chunks = session.query(Chunk).filter(Chunk.paper_id == paper.id).all()

    prompt_parts = [
        f"Paper: {paper.title or 'Untitled'}",
        f"\n\nContent:\n{paper.raw_text or ''}",
    ]

    if chunks:
        prompt_parts.append("\n\nRelevant excerpts:")
        for i, chunk in enumerate(chunks[:10], 1):
            prompt_parts.append(f"\n[Excerpt {i}]: {chunk.text}")

    prompt = "".join(prompt_parts)

    try:
        # Call LLM runner
        data = run_and_parse_json(runner, prompt, ANALYSIS_SYSTEM_PROMPT, retries=1)

        # Extract fields with defaults for missing ones
        return PaperAnalysisOutput(
            summary=data.get("summary", ""),
            key_claims=data.get("key_claims", []),
            methods=data.get("methods", []),
            open_questions=data.get("open_questions", []),
            stated_limitations=data.get("stated_limitations", []),
        )

    except (ValueError, KeyError, TypeError) as e:
        logger.error(f"Error analyzing paper {paper.id}: Invalid response structure: {e}")
        raise
    except RuntimeError as e:
        logger.error(f"Error analyzing paper {paper.id}: LLM or parsing error: {e}")
        raise
    except Exception as e:
        logger.error(f"Error analyzing paper {paper.id}: Unexpected error: {e}", exc_info=True)
        raise
