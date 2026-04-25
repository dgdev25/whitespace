import os

import requests

from app.runners.base import LLMRunner


class GeminiRunner(LLMRunner):
    name = "gemini"

    def is_available(self) -> bool:
        return bool(os.getenv("GEMINI_API_KEY"))

    def run(self, prompt: str, system: str, stream: bool = False) -> str:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY missing")
        model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
        resp = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            params={"key": api_key},
            json={
                "system_instruction": {"parts": [{"text": system}]},
                "contents": [{"parts": [{"text": prompt}]}],
            },
            timeout=60,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]
