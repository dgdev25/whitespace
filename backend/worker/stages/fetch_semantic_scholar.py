import hashlib
import logging
import time

import requests

logger = logging.getLogger(__name__)

_BASE = "https://api.semanticscholar.org/graph/v1"
_FIELDS = "paperId,title,abstract,authors,year,publicationDate,externalIds,publicationTypes"
_HEADERS = {"User-Agent": "Whitespace-Research-Bot/2.0"}
_TIMEOUT = 20
_MAX_PER_ORG = 15
_RATE_LIMIT_SLEEP = 3  # seconds between requests (unauthenticated limit)

# Orgs to query. Names are used as search terms against Semantic Scholar.
_ORGS = [
    "Anthropic",
    "DeepMind",
    "OpenAI",
    "xAI",
    "Meta AI",
    "Microsoft Research",
]


def _s2_id(paper_id: str) -> str:
    """Stable 32-char identifier for a Semantic Scholar paper ID."""
    return hashlib.md5(f"s2:{paper_id}".encode()).hexdigest()


def _fetch_org(org: str, existing_ids: set[str]) -> list[dict]:
    try:
        resp = requests.get(
            f"{_BASE}/paper/search",
            params={"query": org, "fields": _FIELDS, "limit": _MAX_PER_ORG},
            headers=_HEADERS,
            timeout=_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException as exc:
        logger.warning("[S2:%s] Request failed: %s", org, exc)
        return []

    papers = []
    for item in data.get("data", []):
        # If the paper is on arXiv, use the arXiv ID — won't duplicate arXiv fetch
        arxiv_id = (item.get("externalIds") or {}).get("ArXiv")
        if arxiv_id:
            uid = arxiv_id
        else:
            uid = _s2_id(item.get("paperId", ""))

        if uid in existing_ids:
            continue

        abstract = (item.get("abstract") or "").strip()
        if not abstract:
            continue

        # Filter: only include if any author is affiliated with the queried org
        # (Semantic Scholar search is broad — this narrows to relevant papers)
        authors_raw = item.get("authors") or []
        authors_str = ", ".join(a.get("name", "") for a in authors_raw)

        pub_date = item.get("publicationDate") or str(item.get("year", "")) or ""

        papers.append({
            "arxiv_id": uid,
            "title": (item.get("title") or "").strip(),
            "authors": authors_str,
            "abstract": abstract,
            "full_text": abstract,
            "categories": f"semantic_scholar:{org.lower().replace(' ', '_')}",
            "published_date": pub_date[:10] if pub_date else "",
            "url": f"https://www.semanticscholar.org/paper/{item.get('paperId', '')}",
            "source": "semantic_scholar",
        })

    logger.info("[S2:%s] %d new papers", org, len(papers))
    return papers


def fetch_semantic_scholar_papers(existing_ids: set[str]) -> list[dict]:
    """Fetch recent papers from Semantic Scholar for configured AI lab orgs.

    Uses the public API (no key required). Rate-limited to avoid 429s.
    Returns dicts in the same schema as arXiv papers with source='semantic_scholar'.
    """
    all_papers: list[dict] = []
    for i, org in enumerate(_ORGS):
        if i > 0:
            time.sleep(_RATE_LIMIT_SLEEP)
        try:
            papers = _fetch_org(org, existing_ids | {p["arxiv_id"] for p in all_papers})
            all_papers.extend(papers)
        except Exception as exc:
            logger.warning("[S2:%s] Unexpected error: %s", org, exc)

    logger.info("Semantic Scholar fetch complete — %d new papers", len(all_papers))
    return all_papers
