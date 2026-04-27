import hashlib
import logging
import time

import requests

logger = logging.getLogger(__name__)

_BASE = "https://aclanthology.org"
_HEADERS = {"User-Agent": "Whitespace-Research-Bot/2.0 (academic research tool)"}
_TIMEOUT = 20
_PER_VOLUME = 20

# Recent high-value proceedings. Volume IDs follow the pattern {year}.{venue}-{type}.
_VOLUMES = [
    "2024.acl-long",
    "2024.acl-short",
    "2024.findings-acl",
    "2024.emnlp-main",
    "2024.findings-emnlp",
    "2024.naacl-long",
    "2024.naacl-short",
    "2024.eacl-long",
    "2025.coling-main",
]


def _uid(paper_id: str) -> str:
    return hashlib.sha256(f"acl:{paper_id}".encode()).hexdigest()[:32]


def _fetch_volume(vol_id: str, existing_ids: set[str]) -> list[dict]:
    try:
        resp = requests.get(
            f"{_BASE}/volumes/{vol_id}.json",
            headers=_HEADERS,
            timeout=_TIMEOUT,
        )
        if resp.status_code == 404:
            return []
        resp.raise_for_status()
        papers_raw = resp.json()
    except requests.RequestException as exc:
        logger.warning("[ACL:%s] request failed: %s", vol_id, exc)
        return []

    if not isinstance(papers_raw, list):
        papers_raw = papers_raw.get("papers", []) if isinstance(papers_raw, dict) else []

    results: list[dict] = []
    venue_tag = vol_id.split(".")[1].split("-")[0] if "." in vol_id else "acl"

    for p in papers_raw[:_PER_VOLUME]:
        paper_id = p.get("id", "")
        if not paper_id:
            continue
        uid = _uid(paper_id)
        if uid in existing_ids:
            continue

        abstract = (p.get("abstract") or "").strip()
        if not abstract:
            continue

        authors = ", ".join(
            a.get("full", a.get("last", ""))
            for a in (p.get("author") or [])[:5]
        )
        year = str(p.get("year", ""))

        results.append({
            "arxiv_id": uid,
            "title": (p.get("title") or "").strip(),
            "authors": authors,
            "abstract": abstract,
            "full_text": abstract,
            "categories": f"acl,{venue_tag}",
            "published_date": year,
            "url": f"{_BASE}/{paper_id}",
            "source": "acl_anthology",
        })

    logger.info("[ACL:%s] %d new papers", vol_id, len(results))
    return results


def fetch_acl_anthology_papers(existing_ids: set[str]) -> list[dict]:
    """Fetch recent NLP papers from ACL Anthology proceedings.

    Targets major venues: ACL, EMNLP, NAACL, COLING, EACL.
    Returns dicts in the standard paper schema with source='acl_anthology'.
    """
    all_papers: list[dict] = []
    seen: set[str] = set(existing_ids)

    for i, vol_id in enumerate(_VOLUMES):
        if i > 0:
            time.sleep(1)
        papers = _fetch_volume(vol_id, seen)
        all_papers.extend(papers)
        seen |= {p["arxiv_id"] for p in papers}

    logger.info("ACL Anthology fetch complete — %d new papers", len(all_papers))
    return all_papers
