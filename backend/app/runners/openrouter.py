import os

import requests

from app.runners.base import LLMRunner


class OpenRouterRunner(LLMRunner):
    name = "openrouter"

    def is_available(self) -> bool:
        return bool(os.getenv("OPENROUTER_API_KEY"))

    def run(self, prompt: str, system: str, stream: bool = False) -> str:
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise RuntimeError("OPENROUTER_API_KEY missing")
        resp = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": os.getenv("OPENROUTER_ANALYSIS_MODEL", "mistral/mistral-7b-instruct"),
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
            },
            timeout=60,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]
