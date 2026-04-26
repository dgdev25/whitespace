import os
import random
import time
from urllib.parse import quote

import requests

from app.runners.base import LLMRunner

_RETRIES = 2


class GeminiRunner(LLMRunner):
    name = "gemini"

    def __init__(self, model: str | None = None):
        self._model = model

    def is_available(self) -> bool:
        return bool(os.getenv("GEMINI_API_KEY"))

    def run(self, prompt: str, system: str = "", stream: bool = False) -> str:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY missing")
        model = quote(self._model or os.getenv("GEMINI_MODEL", "gemini-2.0-flash"), safe="")
        payload: dict = {"contents": [{"parts": [{"text": prompt}]}]}
        if system:
            payload["system_instruction"] = {"parts": [{"text": system}]}
        for attempt in range(_RETRIES + 1):
            resp = requests.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                params={"key": api_key},  # Google's official auth convention for this API
                json=payload,
                timeout=60,
            )
            if resp.status_code == 429 and attempt < _RETRIES:
                time.sleep(2 ** attempt + random.random())
                continue
            resp.raise_for_status()
            break
        data = resp.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]
