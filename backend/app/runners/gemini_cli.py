import shutil
import subprocess

from app.runners.base import LLMRunner


class GeminiCLIRunner(LLMRunner):
    name = "gemini_cli"

    def is_available(self) -> bool:
        return shutil.which("gemini") is not None

    def run(self, prompt: str, system: str = "", stream: bool = False) -> str:
        full_prompt = f"{system}\n\n{prompt}" if system else prompt
        proc = subprocess.run(
            ["gemini", "-p", full_prompt],
            capture_output=True,
            timeout=300,
        )
        if proc.returncode != 0:
            raise RuntimeError(f"gemini CLI failed: {proc.stderr.decode()[:200]}")
        return proc.stdout.decode().strip()
