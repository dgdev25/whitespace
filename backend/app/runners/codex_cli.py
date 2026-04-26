import subprocess

from app.runners.base import LLMRunner, resolve_cli


class CodexCLIRunner(LLMRunner):
    name = "codex_cli"

    def __init__(self, model: str | None = None):
        self._model = model

    def is_available(self) -> bool:
        return resolve_cli("codex") is not None

    def run(self, prompt: str, system: str = "", stream: bool = False) -> str:
        full_prompt = f"{system}\n\n{prompt}" if system else prompt
        cli = resolve_cli("codex")
        if cli is None:
            raise RuntimeError("codex CLI not found on PATH")
        cmd = [*cli, "exec"]
        if self._model:
            cmd += ["--model", self._model]
        proc = subprocess.run(
            cmd,
            input=full_prompt.encode("utf-8"),
            capture_output=True,
            timeout=300,
        )
        if proc.returncode != 0:
            raise RuntimeError(f"codex CLI failed: {proc.stderr.decode('utf-8')[:200]}")
        return proc.stdout.decode("utf-8").strip()
