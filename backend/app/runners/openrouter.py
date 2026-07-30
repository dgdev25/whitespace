import os
import random
import time

import requests

from app.runners.base import LLMRunner

_RETRIES = 2

_latest_opus_slug: str | None = None


def _resolve_latest_opus(api_key: str) -> str:
    """Resolve the newest Claude Opus model OpenRouter offers, without pinning a version.

    OpenRouter has no floating "latest" alias, so we ask its catalog and pick the
    most-recently-created `anthropic/*opus*` slug ourselves, then cache it for the
    process lifetime.
    """
    global _latest_opus_slug
    if _latest_opus_slug is not None:
        return _latest_opus_slug
    resp = requests.get(
        "https://openrouter.ai/api/v1/models",
        headers={"Authorization": f"Bearer {api_key}"},
        timeout=30,
    )
    resp.raise_for_status()
    candidates = [
        m
        for m in resp.json().get("data", [])
        if m.get("id", "").startswith("anthropic/") and "opus" in m.get("id", "")
    ]
    if not candidates:
        raise RuntimeError("No Claude Opus model found on OpenRouter")
    candidates.sort(key=lambda m: m.get("created", 0), reverse=True)
    _latest_opus_slug = candidates[0]["id"]
    return _latest_opus_slug


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
        model = self._model or os.getenv("OPENROUTER_ANALYSIS_MODEL") or _resolve_latest_opus(api_key)
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        for attempt in range(_RETRIES + 1):
            resp = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": model,
                    "messages": messages,
                },
                timeout=60,
            )
            if resp.status_code == 429 and attempt < _RETRIES:
                time.sleep(2 ** attempt + random.random())
                continue
            resp.raise_for_status()
            break
        data = resp.json()
        return data["choices"][0]["message"]["content"]
