import os

import requests

from app.runners.base import LLMRunner


class AnthropicRunner(LLMRunner):
    name = "anthropic"

    def is_available(self) -> bool:
        return bool(os.getenv("ANTHROPIC_API_KEY"))

    def run(self, prompt: str, system: str = "", stream: bool = False) -> str:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise RuntimeError("ANTHROPIC_API_KEY missing")
        resp = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={"x-api-key": api_key, "anthropic-version": "2023-06-01"},
            json={
                "model": os.getenv("ANTHROPIC_ANALYSIS_MODEL", "claude-haiku-4-5-20251001"),
                "max_tokens": 4096,
                "system": system,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=60,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["content"][0]["text"]
