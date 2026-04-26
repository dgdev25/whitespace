import os
import time

import requests

from app.runners.base import LLMRunner

_RETRIES = 2


class OpenRouterRunner(LLMRunner):
    name = "openrouter"

    def __init__(self, model: str | None = None):
        self._model = model

    def is_available(self) -> bool:
        return bool(os.getenv("OPENROUTER_API_KEY"))

    def run(self, prompt: str, system: str = "", stream: bool = False) -> str:
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise RuntimeError("OPENROUTER_API_KEY missing")
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        for attempt in range(_RETRIES + 1):
            resp = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": self._model or os.getenv("OPENROUTER_ANALYSIS_MODEL", "anthropic/claude-haiku-4-5"),
                    "messages": messages,
                },
                timeout=60,
            )
            if resp.status_code == 429 and attempt < _RETRIES:
                time.sleep(2 ** attempt)
                continue
            resp.raise_for_status()
            break
        data = resp.json()
        return data["choices"][0]["message"]["content"]
