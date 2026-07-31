import os
import random
import time

import requests

from app.runners.base import LLMRunner

_RETRIES = 2

_DEFAULT_BASE_URL = "https://openrouter.ai/api/v1"


def _base_url() -> str:
    """Where completions are sent.

    Defaults to OpenRouter directly. When this app runs as a myportfolio demo,
    OPENROUTER_BASE_URL points at the platform's relay instead, which holds the
    shared API key and falls through a chain of free models when one is rate
    limited. That keeps the key out of this container entirely — a demo is
    third-party code from the platform's point of view, and a key it can read
    is a key it can leak.
    """
    return (os.getenv("OPENROUTER_BASE_URL") or _DEFAULT_BASE_URL).rstrip("/")


def _api_key() -> str | None:
    return os.getenv("OPENROUTER_API_KEY") or None


def _using_relay() -> bool:
    return _base_url() != _DEFAULT_BASE_URL


class OpenRouterRunner(LLMRunner):
    name = "openrouter"

    def __init__(self, model: str | None = None):
        self._model = model

    def is_available(self) -> bool:
        # A relay authenticates on our behalf, so no local key is needed. Going
        # to OpenRouter directly still requires one.
        return bool(_api_key()) or _using_relay()

    def run(self, prompt: str, system: str = "", stream: bool = False) -> str:
        api_key = _api_key()
        if not api_key and not _using_relay():
            raise RuntimeError("OPENROUTER_API_KEY missing (or set OPENROUTER_BASE_URL to a relay)")

        # No implicit model. This used to fall back to "the newest Claude Opus
        # OpenRouter offers" whenever no model was configured, which meant an
        # unset env var silently billed the account owner for a frontier model
        # on every request — including every visitor to a public demo. When a
        # relay is in use, omitting the model lets IT choose (its chain is
        # free-only); going direct, an unset model is a configuration error and
        # should say so rather than pick something expensive.
        model = self._model or os.getenv("OPENROUTER_ANALYSIS_MODEL") or os.getenv("OPENROUTER_MODEL")
        if not model and not _using_relay():
            raise RuntimeError(
                "No model configured: set OPENROUTER_ANALYSIS_MODEL (or OPENROUTER_MODEL), "
                "e.g. google/gemma-4-31b-it:free"
            )

        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        payload: dict = {"messages": messages}
        if model:
            payload["model"] = model

        headers = {}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        for attempt in range(_RETRIES + 1):
            resp = requests.post(
                f"{_base_url()}/chat/completions",
                headers=headers,
                json=payload,
                timeout=60,
            )
            # A relay has already walked its own fallback chain before
            # answering 429, so retrying it just delays the same result.
            if resp.status_code == 429 and attempt < _RETRIES and not _using_relay():
                time.sleep(2 ** attempt + random.random())
                continue
            resp.raise_for_status()
            break
        data = resp.json()
        return data["choices"][0]["message"]["content"]
