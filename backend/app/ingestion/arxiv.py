import logging
import re
import time
import xml.etree.ElementTree as ET
from urllib.parse import urlparse

import requests

logger = logging.getLogger(__name__)

ATOM_NS = "http://www.w3.org/2005/Atom"
_STOPWORDS = {
    "the", "and", "for", "with", "that", "this", "from", "into", "using",
    "used", "your", "their", "about", "what", "where", "when", "which",
    "into", "over", "under", "across", "between", "through", "without",
    "project", "system", "platform", "tool", "tools", "data", "model",
    "models", "repo", "repository", "software",
}


def _extract_context_terms(text: str, limit: int = 24) -> list[str]:
    words = re.findall(r"[a-zA-Z][a-zA-Z0-9_-]{2,}", text.lower())
    seen: set[str] = set()
    terms: list[str] = []
    for w in words:
        if w in _STOPWORDS or w.isdigit():
            continue
        if w in seen:
            continue
        seen.add(w)
        terms.append(w)
        if len(terms) >= limit:
            break
    return terms


def _relevance_score(title: str, abstract: str, terms: list[str]) -> int:
    hay_title = f" {title.lower()} "
    hay_abs = f" {abstract.lower()} "
    score = 0
    for t in terms:
        needle = f" {t} "
        if needle in hay_title:
            score += 3
        elif t in hay_title:
            score += 2
        if needle in hay_abs:
            score += 1
        elif t in hay_abs:
            score += 1
    return score


def search_arxiv(
    categories: list[str],
    max_results_per_category: int = 6,
    lookback_months: int = 6,
    project_context: str | None = None,
) -> list[dict]:
    """Search arXiv for recent papers in the given categories.

    Returns a deduplicated list of dicts with keys:
        arxiv_id, title, pdf_url, abstract
    """
    seen: dict[str, dict] = {}

    for idx, category in enumerate(categories):
        # arXiv asks for at least 3 seconds between API requests
        if idx > 0:
            time.sleep(3)

        query_url = (
            f"http://export.arxiv.org/api/query?"
            f"search_query=cat:{category}"
            f"&start=0&max_results={max_results_per_category}"
            f"&sortBy=submittedDate&sortOrder=descending"
        )
        try:
            resp = requests.get(query_url, timeout=30)
            resp.raise_for_status()
        except requests.RequestException:
            logger.warning("arXiv query failed for category %s", category)
            continue

        root = ET.fromstring(resp.text)

        for entry in root.findall(f"{{{ATOM_NS}}}entry"):
            # Extract arxiv ID from the <id> element (e.g. http://arxiv.org/abs/2401.12345v1)
            id_elem = entry.find(f"{{{ATOM_NS}}}id")
            if id_elem is None or id_elem.text is None:
                continue
            raw_id = id_elem.text.strip()
            # Pull the paper ID, stripping version suffix
            match = re.search(r"(\d{4}\.\d{4,5})", raw_id)
            if not match:
                continue
            arxiv_id = match.group(1)

            if arxiv_id in seen:
                continue

            title_elem = entry.find(f"{{{ATOM_NS}}}title")
            title = (title_elem.text or "").strip().replace("\n", " ") if title_elem is not None else ""

            summary_elem = entry.find(f"{{{ATOM_NS}}}summary")
            abstract = (summary_elem.text or "").strip() if summary_elem is not None else ""

            # Try to find the PDF link
            pdf_url = f"https://arxiv.org/pdf/{arxiv_id}"
            for link in entry.findall(f"{{{ATOM_NS}}}link"):
                if link.get("title") == "pdf":
                    pdf_url = link.get("href", pdf_url)
                    break

            seen[arxiv_id] = {
                "arxiv_id": arxiv_id,
                "title": title,
                "pdf_url": pdf_url,
                "abstract": abstract,
            }

    results = list(seen.values())

    # Optional lexical rerank/filter to keep papers aligned to project context.
    if project_context:
        terms = _extract_context_terms(project_context)
        if terms:
            for item in results:
                item["_score"] = _relevance_score(
                    item.get("title", ""),
                    item.get("abstract", ""),
                    terms,
                )
            scored = [r for r in results if int(r.get("_score", 0)) > 0]
            if scored:
                scored.sort(key=lambda r: int(r.get("_score", 0)), reverse=True)
                # Prefer stronger context matches; fallback to weak matches only if needed.
                strong = [r for r in scored if int(r.get("_score", 0)) >= 3]
                results = strong if strong else scored
            for item in results:
                item.pop("_score", None)

    return results


def resolve_pdf_url(url: str) -> str:
    if "/abs/" in url:
        paper_id = url.split("/abs/")[-1]
        return f"https://arxiv.org/pdf/{paper_id}.pdf"
    parsed = urlparse(url)
    if parsed.netloc.endswith("arxiv.org") and parsed.path.endswith(".pdf"):
        return url
    return url
