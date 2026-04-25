from app.runners.anthropic import AnthropicRunner
from app.runners.base import LLMRunner
from app.runners.claude_cli import ClaudeCLIRunner
from app.runners.codex_cli import CodexCLIRunner
from app.runners.gemini import GeminiRunner
from app.runners.gemini_cli import GeminiCLIRunner
from app.runners.openrouter import OpenRouterRunner


def _default_runners() -> list[LLMRunner]:
    """Return the canonical ordered runner list. CLI tools take priority over API keys."""
    return [
        ClaudeCLIRunner(),
        CodexCLIRunner(),
        GeminiCLIRunner(),
        GeminiRunner(),
        AnthropicRunner(),
        OpenRouterRunner(),
    ]


def select_runner(runners: list[LLMRunner]) -> LLMRunner | None:
    """Return the first available runner, or None if none are configured."""
    for runner in runners:
        if runner.is_available():
            return runner
    return None


def select_runner_or_raise(runners: list[LLMRunner]) -> LLMRunner:
    """Return the first available runner, or raise an error if none are configured."""
    runner = select_runner(runners)
    if runner is None:
        raise RuntimeError(
            "No LLM runners are available. Configure at least one of: "
            "Claude CLI, Codex CLI, Gemini API, Anthropic API, or OpenRouter API."
        )
    return runner
