"""Thread-safe pipeline progress emitter.

The background pipeline thread calls emit(); the async SSE endpoint
reads via get_events(). No queues needed — readers just poll the list
by index.
"""
import threading
from datetime import datetime, timezone

_events: list[dict] = []
_active: bool = False
_lock = threading.Lock()


def start_run() -> None:
    global _events, _active
    with _lock:
        _events = []
        _active = True


def end_run() -> None:
    global _active
    with _lock:
        _active = False


def emit(step: str, message: str, status: str = "running") -> None:
    with _lock:
        _events.append({
            "step": step,
            "message": message,
            "status": status,
            "ts": datetime.now(timezone.utc).isoformat(),
        })


def get_snapshot(from_idx: int = 0) -> tuple[list[dict], bool]:
    """Return (new_events_since_from_idx, is_active)."""
    with _lock:
        return list(_events[from_idx:]), _active
