import os
import time

import requests

from app.runners.base import LLMRunner

_RETRIES = 2


class OpenRouterRunner(LLMRunner):
    name = "openrouter"

    def is_available(self) -> bool:
        return bool(os.getenv("OPENROUTER_API_KEY"))

    def run(self, prompt: str, system: str = "", stream: bool = False) -> str:
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise RuntimeError("OPENROUTER_API_KEY missing")
        for attempt in range(_RETRIES + 1):
            resp = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": os.getenv("OPENROUTER_ANALYSIS_MODEL", "anthropic/claude-haiku-4-5"),
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": prompt},
                    ],
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
