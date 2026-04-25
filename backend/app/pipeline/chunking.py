from typing import Iterable


def chunk_text(text: str, chunk_size: int = 6000, overlap: int = 600) -> list[str]:
    """Split text into overlapping chunks by character count.

    Uses ~4 chars/token heuristic (chunk_size=6000 chars ≈ 1500 tokens).
    """
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = min(len(text), start + chunk_size)
        # Try to break at sentence boundary
        if end < len(text):
            for sep in (". ", ".\n", "\n\n", "\n", " "):
                last = text.rfind(sep, start + chunk_size // 2, end)
                if last != -1:
                    end = last + len(sep)
                    break
        chunks.append(text[start:end])
        if end >= len(text):
            break
        start = end - overlap
    return chunks


def tag_section(text: str) -> str:
    lower = text[:200].lower()
    for key in ["abstract", "introduction", "method", "results", "discussion", "conclusion"]:
        if key in lower:
            return key
    return "body"


def estimate_token_count(text: str) -> int:
    """Rough token estimate: ~4 chars per token for English."""
    return len(text) // 4


def build_chunk_records(chunks: Iterable[str]) -> list[dict]:
    records = []
    for idx, chunk in enumerate(chunks):
        records.append(
            {
                "chunk_index": idx,
                "section_type": tag_section(chunk),
                "text": chunk,
                "token_count": estimate_token_count(chunk),
            }
        )
    return records
