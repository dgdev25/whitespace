import hashlib
import logging
import time

import requests

logger = logging.getLogger(__name__)

_BASE = "https://api.openalex.org"
_HEADERS = {"User-Agent": "Whitespace-Research-Bot/2.0 (mailto:research@whitespace.ai)"}
_TIMEOUT = 20
_PER_QUERY = 20

# Insurance, reinsurance, and cyber risk academic queries targeting actuarial
# and risk management literature not covered by the AI/ML-focused sources.
_QUERIES = [
    "cyber insurance risk modelling loss distribution reinsurance",
    "catastrophe accumulation systemic cyber risk quantification",
    "actuarial science cyber liability tail risk pricing",
    "insurance securitization catastrophe bond parametric risk transfer",
]


def _uid(oa_id: str) -> str:
    return hashlib.sha256(f"ssrn:{oa_id}".encode()).hexdigest()[:32]


def _reconstruct_abstract(inverted: dict | None) -> str:
    if not inverted:
        return ""
    positions: dict[int, str] = {}
    for word, locs in inverted.items():
        for pos in locs:
            positions[pos] = word
    return " ".join(positions[i] for i in sorted(positions))


def _fetch_query(query: str, existing_ids: set[str]) -> list[dict]:
    try:
        resp = requests.get(
            f"{_BASE}/works",
            params={
                "search": query,
                "filter": "publication_year:2022|2023|2024|2025,type:article",
                "sort": "cited_by_count:desc",
                "per-page": str(_PER_QUERY),
                "select": "id,title,abstract_inverted_index,authorships,publication_date,primary_location,doi",
                "mailto": "research@whitespace.ai",
            },
            headers=_HEADERS,
            timeout=_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException as exc:
        logger.warning("[SSRN/Risk] request failed for query %r: %s", query, exc)
        return []

    results: list[dict] = []
    for work in data.get("results", []):
        oa_id = work.get("id", "")
        if not oa_id:
            continue
        uid = _uid(oa_id)
        if uid in existing_ids:
            continue

        abstract = _reconstruct_abstract(work.get("abstract_inverted_index"))
        if not abstract:
            continue

        authors = ", ".join(
            a.get("author", {}).get("display_name", "")
            for a in (work.get("authorships") or [])[:5]
        )
        loc = work.get("primary_location") or {}
        url = loc.get("landing_page_url") or work.get("doi") or ""

        results.append({
            "arxiv_id": uid,
            "title": (work.get("title") or "").strip(),
            "authors": authors,
            "abstract": abstract,
            "full_text": abstract,
            "categories": "ssrn,insurance,risk_management,cyber",
            "published_date": work.get("publication_date", ""),
            "url": url,
            "source": "ssrn",
        })

    logger.info("[SSRN/Risk] query %r → %d new papers", query, len(results))
    return results


def fetch_ssrn_papers(existing_ids: set[str]) -> list[dict]:
    """Fetch insurance, reinsurance and cyber risk papers via OpenAlex keyword search.

    Targets actuarial science, catastrophe risk, and cyber insurance literature —
    fills the gap left by arXiv's STEM focus. Returns dicts in the standard paper
    schema with source='ssrn'.
    """
    all_papers: list[dict] = []
    seen: set[str] = set(existing_ids)

    for i, query in enumerate(_QUERIES):
        if i > 0:
            time.sleep(1)
        papers = _fetch_query(query, seen)
        all_papers.extend(papers)
        seen |= {p["arxiv_id"] for p in papers}

    logger.info("SSRN/Risk fetch complete — %d new papers", len(all_papers))
    return all_papers
