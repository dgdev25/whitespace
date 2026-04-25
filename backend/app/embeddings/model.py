from __future__ import annotations

import os

from app.core.config import settings


def _pg_url() -> str:
    return settings.database_url.replace("postgresql+psycopg://", "postgresql://")


def embed_text(text: str) -> list[float]:
    """Generate a 384-dim embedding using ruvector's built-in model (all-MiniLM-L6-v2).

    Falls back to a zero vector in stub mode.
    """
    if os.getenv("EMBEDDINGS_MODE", "full") == "stub":
        return [0.0] * 384

    import psycopg

    with psycopg.connect(_pg_url()) as conn:
        row = conn.execute(
            "SELECT ruvector_embed(%s)::text", (text[:8000],)
        ).fetchone()

    if row is None or row[0] is None:
        raise RuntimeError("ruvector_embed() returned NULL — is the embeddings feature compiled?")

    # Parse the postgres array text representation "{0.1,0.2,...}" into a float list
    raw = row[0].strip("{}")
    return [float(v) for v in raw.split(",")]
