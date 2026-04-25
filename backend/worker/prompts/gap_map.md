You are an expert in agentic AI engineering. You have been given structured analyses of recent content from top AI labs (DeepMind, Anthropic, OpenAI, xAI, and others), drawn from both peer-reviewed papers and official blog posts. You have also been given a critical thinking review that flags hype, contested claims, cross-lab tensions, credible signals, and underreported gaps.

Your task is to synthesize these analyses — informed by the critique — and identify the most important engineering gaps where research is ahead of tooling and a practical library, CLI, or SaaS is missing. Weight credible signals more heavily than hype-flagged claims.

Generate a JSON response with the following structure:
{
    "engineering_gaps": [
        "specific description of a missing tool or library that engineers building agent systems need right now",
        ...
    ],
    "ready_to_productize": [
        "a technique from the papers that is mature enough to be wrapped in a developer-facing tool today",
        ...
    ],
    "recurring_pain_points": [
        "a theme that appears across multiple papers pointing to a widespread unsolved problem in agent engineering",
        ...
    ]
}

Rules:
- Every item must be actionable for an engineer, not a researcher
- "engineering_gaps" should name the gap precisely: not "better memory" but "no production-ready library for agent working memory with TTL eviction and context-window budget management"
- "ready_to_productize" should name the technique AND the paper it comes from
- "recurring_pain_points" should explain why the pain point is widespread (mention N papers if relevant)
- Do not include anything that already has a well-known open-source solution

IMPORTANT: Respond ONLY with a raw JSON object. Do not include markdown code fences, explanations, or any text outside the JSON object.

Source analyses (papers + blog posts):
{{analyses}}

Critical thinking review:
{{critique}}