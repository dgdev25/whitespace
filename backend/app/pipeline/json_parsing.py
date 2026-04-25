from __future__ import annotations

import json
import re
from typing import Any

from app.runners.base import LLMRunner

_ANSI_RE = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")


class LLMJSONParseError(RuntimeError):
    """Raised when an LLM response cannot be parsed as JSON."""


def _strip_ansi(text: str) -> str:
    return _ANSI_RE.sub("", text)


def _strip_fences(text: str) -> str:
    cleaned = text.strip()
    for prefix in ("```json\n", "```json", "```\n", "```"):
        if cleaned.startswith(prefix):
            cleaned = cleaned[len(prefix) :]
            break
    for suffix in ("\n```", "```"):
        if cleaned.endswith(suffix):
            cleaned = cleaned[: -len(suffix)]
            break
    return cleaned.strip()


def _extract_balanced_json(text: str) -> str | None:
    starts = [idx for idx, ch in enumerate(text) if ch in "[{"]
    for start in starts:
        opening = text[start]
        closing = "}" if opening == "{" else "]"
        depth = 0
        in_string = False
        escaped = False
        for idx in range(start, len(text)):
            ch = text[idx]
            if in_string:
                if escaped:
                    escaped = False
                elif ch == "\\":
                    escaped = True
                elif ch == '"':
                    in_string = False
                continue
            if ch == '"':
                in_string = True
                continue
            if ch == opening:
                depth += 1
            elif ch == closing:
                depth -= 1
                if depth == 0:
                    return text[start : idx + 1]
    return None


def parse_llm_json(response_text: str) -> Any:
    cleaned = _strip_ansi(response_text).strip()
    if not cleaned:
        raise LLMJSONParseError("Empty LLM response")

    candidates = [cleaned, _strip_fences(cleaned)]

    fenced_blocks = re.findall(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned, flags=re.IGNORECASE)
    candidates.extend(block.strip() for block in fenced_blocks if block.strip())

    extracted = _extract_balanced_json(cleaned)
    if extracted:
        candidates.append(extracted)

    seen: set[str] = set()
    for candidate in candidates:
        candidate = candidate.strip()
        if not candidate or candidate in seen:
            continue
        seen.add(candidate)
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, (dict, list)):
                return parsed
        except json.JSONDecodeError:
            continue

    preview = cleaned[:300].replace("\n", " ")
    raise LLMJSONParseError(f"Unable to parse LLM response as JSON. Preview: {preview}")


def run_and_parse_json(
    runner: LLMRunner,
    prompt: str,
    system: str = "",
    *,
    retries: int = 1,
) -> dict[str, Any]:
    last_error: Exception | None = None
    for attempt in range(retries + 1):
        adjusted_prompt = prompt
        if attempt > 0:
            adjusted_prompt = (
                prompt
                + "\n\nIMPORTANT: Return ONLY a valid JSON object. "
                + "No markdown fences, no prose, no commentary."
            )
        try:
            response = runner.run(prompt=adjusted_prompt, system=system or "", stream=False)
            return parse_llm_json(response)
        except LLMJSONParseError as exc:
            last_error = exc
            continue
        except (RuntimeError, TypeError, AttributeError) as exc:
            # Runner failed or returned unexpected type
            last_error = exc
            continue

    if isinstance(last_error, Exception):
        raise LLMJSONParseError(str(last_error))
    raise LLMJSONParseError("Unable to parse LLM response as JSON")


def parse_json_response(response: str, expected_type: type = dict) -> dict | list:
    """Parse a JSON response string, optionally verifying the top-level type."""
    data = parse_llm_json(response)
    if not isinstance(data, expected_type):
        raise ValueError(f"Expected {expected_type.__name__}, got {type(data).__name__}")
    return data
