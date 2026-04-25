from abc import ABC, abstractmethod


class LLMRunner(ABC):
    name: str

    @abstractmethod
    def is_available(self) -> bool: ...

    @abstractmethod
    def run(self, prompt: str, system: str, stream: bool = False) -> str: ...
