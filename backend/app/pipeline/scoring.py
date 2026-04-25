from app.schemas.llm_outputs import SynthesisIdea


def score_ideas(
    ideas: list[SynthesisIdea],
    novelty_threshold: float,
    feasibility_threshold: float,
) -> list[SynthesisIdea]:
    """Filter and sort synthesis ideas by novelty and feasibility thresholds.

    Filters ideas that meet both threshold requirements, then sorts by combined
    novelty + feasibility score in descending order.

    Args:
        ideas: List of synthesis ideas to filter and sort
        novelty_threshold: Minimum raw_novelty_score (0.0-1.0)
        feasibility_threshold: Minimum raw_feasibility_score (0.0-1.0)

    Returns:
        Filtered and sorted list of SynthesisIdea objects
    """
    filtered = [
        idea
        for idea in ideas
        if idea.raw_novelty_score >= novelty_threshold
        and idea.raw_feasibility_score >= feasibility_threshold
    ]

    sorted_ideas = sorted(
        filtered,
        key=lambda idea: idea.raw_novelty_score + idea.raw_feasibility_score,
        reverse=True,
    )

    return sorted_ideas
