import platform
import shutil
from abc import ABC, abstractmethod


def resolve_cli(name: str) -> list[str] | None:
    """
    Locate a CLI tool and return the command prefix needed to invoke it.

    On Windows, npm-installed tools are .cmd/.bat wrappers that cannot be
    executed directly by CreateProcess — they need 'cmd /c' in front.
    Returns None when the tool is not on PATH.
    """
    path = shutil.which(name)
    if path is None:
        return None
    if platform.system() == "Windows" and path.lower().endswith((".cmd", ".bat")):
        return ["cmd", "/c", path]
    return [path]


class LLMRunner(ABC):
    name: str

    @abstractmethod
    def is_available(self) -> bool: ...

    @abstractmethod
    def run(self, prompt: str, system: str = "", stream: bool = False) -> str: ...
