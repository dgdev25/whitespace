import subprocess

from app.runners.base import LLMRunner, resolve_cli


class GeminiCLIRunner(LLMRunner):
    name = "gemini_cli"

    def __init__(self, model: str | None = None):
        self._model = model

    def is_available(self) -> bool:
        return resolve_cli("gemini") is not None

    def run(self, prompt: str, system: str = "", stream: bool = False) -> str:
        full_prompt = f"{system}\n\n{prompt}" if system else prompt
        cli = resolve_cli("gemini")
        if cli is None:
            raise RuntimeError("gemini CLI not found on PATH")
        cmd = [*cli, "-p", full_prompt]
        if self._model:
            cmd += ["-m", self._model]
        proc = subprocess.run(
            cmd,
            capture_output=True,
            timeout=300,
        )
        if proc.returncode != 0:
            raise RuntimeError(f"gemini CLI failed: {proc.stderr.decode('utf-8')[:200]}")
        return proc.stdout.decode("utf-8").strip()
