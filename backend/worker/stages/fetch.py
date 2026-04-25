import feedparser
import re
import logging
import requests

logger = logging.getLogger(__name__)

_CATEGORY_RE = re.compile(r"^[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*$")


def _extract_arxiv_id(url: str) -> str:
    match = re.search(r"arxiv\.org/abs/([^v]+)", url)
    return match.group(1) if match else url


def fetch_new_papers(categories: list[str], existing_ids: set[str], max_results: int = 50) -> list[dict]:
    papers = []
    for cat in categories:
        if not _CATEGORY_RE.match(cat):
            logger.warning("Skipping invalid arXiv category: %r", cat)
            continue
        url = f"http://export.arxiv.org/api/query?search_query=cat:{cat}&sortBy=submittedDate&sortOrder=descending&max_results={max_results}"
        try:
            resp = requests.get(url, timeout=30)
            resp.raise_for_status()
            feed = feedparser.parse(resp.text)
        except requests.RequestException as exc:
            logger.warning("arXiv fetch failed for category %r: %s", cat, exc)
            continue
        for entry in feed.entries:
            arxiv_id = _extract_arxiv_id(entry.id)
            if arxiv_id in existing_ids:
                continue
            papers.append({
                "arxiv_id": arxiv_id,
                "title": entry.title.strip(),
                "authors": ", ".join(a.name for a in entry.authors),
                "abstract": entry.summary.strip(),
                "categories": ", ".join(t.term for t in getattr(entry, "tags", [])),
                "published_date": entry.get("published", "")[:10],
                "url": f"https://arxiv.org/abs/{arxiv_id}",
            })
    logger.info(f"Fetched {len(papers)} new papers across {len(categories)} categories")
    return papers
