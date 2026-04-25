import shutil
import subprocess

from app.runners.base import LLMRunner


class CodexCLIRunner(LLMRunner):
    name = "codex_cli"

    def is_available(self) -> bool:
        return shutil.which("codex") is not None

    def run(self, prompt: str, system: str, stream: bool = False) -> str:
        full_prompt = f"{system}\n\n{prompt}" if system else prompt
        proc = subprocess.run(
            ["codex", "exec"],
            input=full_prompt.encode(),
            capture_output=True,
            timeout=300,
        )
        if proc.returncode != 0:
            raise RuntimeError(f"codex CLI failed: {proc.stderr.decode()[:200]}")
        return proc.stdout.decode().strip()
