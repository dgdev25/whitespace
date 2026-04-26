import os
import time

import requests

from app.runners.base import LLMRunner

_RETRIES = 2


class AnthropicRunner(LLMRunner):
    name = "anthropic"

    def __init__(self, model: str | None = None):
        self._model = model

    def is_available(self) -> bool:
        return bool(os.getenv("ANTHROPIC_API_KEY"))

    def run(self, prompt: str, system: str = "", stream: bool = False) -> str:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise RuntimeError("ANTHROPIC_API_KEY missing")
        payload = {
            "model": self._model or os.getenv("ANTHROPIC_ANALYSIS_MODEL", "claude-haiku-4-5-20251001"),
            "max_tokens": 4096,
            "system": system,
            "messages": [{"role": "user", "content": prompt}],
        }
        for attempt in range(_RETRIES + 1):
            resp = requests.post(
                "https://api.anthropic.com/v1/messages",
                headers={"x-api-key": api_key, "anthropic-version": "2023-06-01"},
                json=payload,
                timeout=60,
            )
            if resp.status_code == 429 and attempt < _RETRIES:
                time.sleep(2 ** attempt)
                continue
            resp.raise_for_status()
            break
        data = resp.json()
        return data["content"][0]["text"]
