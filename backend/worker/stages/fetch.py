import logging
import re
from urllib.parse import quote

import feedparser
import requests

logger = logging.getLogger(__name__)

_CATEGORY_RE = re.compile(r"^[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*$")
_ORG_RE = re.compile(r"^[a-zA-Z0-9 _-]+$")


def _extract_arxiv_id(url: str) -> str:
    match = re.search(r"arxiv\.org/abs/(.+?)(?:v\d+)?$", url)
    return match.group(1) if match else url


def fetch_new_papers(
    orgs: list[str],
    categories: list[str],
    existing_ids: set[str],
    max_results: int = 50,
) -> list[dict]:
    valid_orgs = [o for o in orgs if _ORG_RE.match(o)]
    invalid_orgs = set(orgs) - set(valid_orgs)
    for bad in invalid_orgs:
        logger.warning("Skipping invalid org name: %r", bad)

    valid_cats = [c for c in categories if _CATEGORY_RE.match(c)]

    if not valid_orgs:
        logger.warning("No valid orgs — skipping fetch")
        return []

    org_clause = " OR ".join(f"all:{o}" for o in valid_orgs)
    if valid_cats:
        cat_clause = " OR ".join(f"cat:{c}" for c in valid_cats)
        query = f"({org_clause}) AND ({cat_clause})"
    else:
        query = org_clause

    url = (
        f"https://export.arxiv.org/api/query"
        f"?search_query={quote(query)}"
        f"&sortBy=submittedDate&sortOrder=descending"
        f"&max_results={max_results}"
    )

    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        feed = feedparser.parse(resp.text)
    except requests.RequestException as exc:
        logger.warning("arXiv fetch failed: %s", exc)
        return []

    papers = []
    for entry in feed.entries:
        arxiv_id = _extract_arxiv_id(entry.id)
        if arxiv_id in existing_ids:
            continue
        papers.append({
            "arxiv_id": arxiv_id,
            "title": (getattr(entry, "title", "") or "").strip(),
            "authors": ", ".join(
                a.name for a in getattr(entry, "authors", [])
            ),
            "abstract": (getattr(entry, "summary", "") or "").strip(),
            "categories": ", ".join(
                t.term for t in getattr(entry, "tags", [])
            ),
            "published_date": (getattr(entry, "published", "") or "")[:10],
            "url": f"https://arxiv.org/abs/{arxiv_id}",
        })

    logger.info("Fetched %d new papers for orgs: %s", len(papers), valid_orgs)
    return papers
