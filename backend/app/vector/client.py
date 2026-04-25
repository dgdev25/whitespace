from __future__ import annotations

import json
import re

import psycopg
import psycopg.sql


def _sanitize(collection: str) -> str:
    """Convert collection name to a safe postgres identifier."""
    return re.sub(r"[^a-zA-Z0-9_]", "_", collection)


class RuVectorClient:
    """
    Vector client backed by the ruvector PostgreSQL extension.
    All operations go through SQL — no HTTP sidecar required.
    """

    def __init__(self, database_url: str, dim: int = 384) -> None:
        # SQLAlchemy-style URL → plain psycopg URL
        self.pg_url = database_url.replace("postgresql+psycopg://", "postgresql://")
        self.dim = dim
        self._initialized: set[str] = set()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _connect(self):
        return psycopg.connect(self.pg_url)

    def _ensure_collection(self, table: str, conn) -> None:
        if table in self._initialized:
            return
        # Use identifier escaping to prevent SQL injection
        safe_table = psycopg.sql.Identifier(table)
        conn.execute(
            psycopg.sql.SQL(
                """
                CREATE TABLE IF NOT EXISTS {} (
                    id      TEXT PRIMARY KEY,
                    embedding ruvector,
                    payload JSONB DEFAULT '{{}}'
                )
                """
            ).format(safe_table)
        )
        conn.execute(
            psycopg.sql.SQL(
                """
                CREATE INDEX IF NOT EXISTS {}_embedding_idx
                ON {} USING hnsw (embedding ruvector_cosine_ops)
                """
            ).format(
                psycopg.sql.Identifier(table),
                safe_table
            )
        )
        self._initialized.add(table)

    @staticmethod
    def _vec_to_sql(vector: list[float]) -> str:
        """Convert a Python float list to the '[x,y,z]' string ruvector expects."""
        return "[" + ",".join(str(v) for v in vector) + "]"

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def upsert(self, collection: str, vectors: list[dict]) -> None:
        """
        Upsert vectors into the collection table.

        Each item in `vectors` must have:
          - id:      str
          - vector:  list[float]
          - payload: dict (optional)
        """
        table = _sanitize(collection)
        try:
            with self._connect() as conn:
                self._ensure_collection(table, conn)
                safe_table = psycopg.sql.Identifier(table)
                for v in vectors:
                    conn.execute(
                        psycopg.sql.SQL(
                            """
                            INSERT INTO {} (id, embedding, payload)
                            VALUES (%s, %s::ruvector, %s)
                            ON CONFLICT (id)
                            DO UPDATE SET
                                embedding = EXCLUDED.embedding,
                                payload   = EXCLUDED.payload
                            """
                        ).format(safe_table),
                        (v["id"], self._vec_to_sql(v["vector"]), json.dumps(v.get("payload", {}))),
                    )
                conn.commit()
        except Exception as exc:
            raise RuntimeError(f"ruvector upsert failed: {exc}") from exc

    def query(self, collection: str, vector: list[float], top_k: int = 10) -> dict:
        """
        Search for the top-k nearest neighbours by cosine distance.

        Returns: {"results": [{"id": str, "payload": dict, "score": float}, ...]}
        """
        table = _sanitize(collection)
        try:
            with self._connect() as conn:
                self._ensure_collection(table, conn)
                conn.commit()  # ensure table DDL is committed before SELECT
                safe_table = psycopg.sql.Identifier(table)
                rows = conn.execute(
                    psycopg.sql.SQL(
                        """
                        SELECT id, payload, embedding <-> %s::ruvector AS distance
                        FROM   {}
                        ORDER  BY distance
                        LIMIT  %s
                        """
                    ).format(safe_table),
                    (self._vec_to_sql(vector), top_k),
                ).fetchall()
        except Exception as exc:
            raise RuntimeError(f"ruvector query failed: {exc}") from exc

        return {
            "results": [
                {"id": row[0], "payload": row[1], "score": float(row[2])}
                for row in rows
            ]
        }
