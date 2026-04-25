import hashlib
import logging
import xml.etree.ElementTree as ET
from datetime import date

import feedparser
import requests

logger = logging.getLogger(__name__)

# Sources: type is "rss" or "sitemap".
# Sitemap sources use trafilatura to extract article text.
_SOURCES = [
    {
        "name": "OpenAI",
        "org": "OpenAI",
        "type": "rss",
        "url": "https://openai.com/blog/rss.xml",
    },
    {
        "name": "Anthropic",
        "org": "Anthropic",
        "type": "sitemap",
        "url": "https://www.anthropic.com/sitemap.xml",
        "filter": "/news/",
    },
    {
        "name": "Google DeepMind",
        "org": "Google DeepMind",
        "type": "sitemap",
        "url": "https://deepmind.google/sitemap.xml",
        "filter": "/discover/blog/",
    },
    {
        "name": "xAI",
        "org": "xAI",
        "type": "sitemap",
        "url": "https://x.ai/sitemap.xml",
        "filter": "/blog/",
    },
]

_HEADERS = {"User-Agent": "Whitespace-Research-Bot/2.0 (+https://github.com/dgtise25/whitespace)"}
_TIMEOUT = 20
_MAX_PER_SOURCE = 10


def _url_id(url: str) -> str:
    """Stable 32-char identifier for a URL — fits the arxiv_id String(32) column."""
    return hashlib.md5(url.encode()).hexdigest()


def _extract_text(url: str) -> str:
    """Use trafilatura to extract main article text from a URL."""
    try:
        import trafilatura
        downloaded = trafilatura.fetch_url(url)
        if not downloaded:
            return ""
        text = trafilatura.extract(downloaded, include_comments=False, include_tables=False)
        return (text or "").strip()
    except Exception as exc:
        logger.warning("trafilatura extraction failed for %s: %s", url, exc)
        return ""


def _fetch_rss(source: dict, existing_ids: set[str]) -> list[dict]:
    try:
        resp = requests.get(source["url"], headers=_HEADERS, timeout=_TIMEOUT)
        resp.raise_for_status()
        feed = feedparser.parse(resp.text)
    except requests.RequestException as exc:
        logger.warning("[%s] RSS fetch failed: %s", source["name"], exc)
        return []

    papers = []
    import re
    for entry in feed.entries[:_MAX_PER_SOURCE]:
        url = str(entry.get("link") or "")
        if not url:
            continue
        uid = _url_id(url)
        if uid in existing_ids:
            continue

        published = (str(entry.get("published") or ""))[:10] or date.today().isoformat()
        abstract = str(entry.get("summary") or entry.get("description") or "")
        abstract = re.sub(r"<[^>]+>", " ", abstract).strip()

        full_text = _extract_text(url) or abstract

        papers.append({
            "arxiv_id": uid,
            "title": entry.get("title", "").strip(),
            "authors": source["org"],
            "abstract": abstract[:1000],
            "full_text": full_text[:4000],
            "categories": f"blog:{source['org'].lower().replace(' ', '_')}",
            "published_date": published,
            "url": url,
            "source": "blog",
        })

    logger.info("[%s] RSS: %d new posts", source["name"], len(papers))
    return papers


def _fetch_sitemap_urls(sitemap_url: str, url_filter: str) -> list[str]:
    try:
        resp = requests.get(sitemap_url, headers=_HEADERS, timeout=_TIMEOUT)
        resp.raise_for_status()
    except requests.RequestException as exc:
        logger.warning("Sitemap fetch failed %s: %s", sitemap_url, exc)
        return []

    try:
        root = ET.fromstring(resp.text)
    except ET.ParseError as exc:
        logger.warning("Sitemap parse error %s: %s", sitemap_url, exc)
        return []

    # Handle both <urlset> and <sitemapindex>
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    urls = []

    # Check for nested sitemaps (sitemapindex)
    for sitemap in root.findall("sm:sitemap", ns):
        loc = sitemap.find("sm:loc", ns)
        if loc is not None and loc.text and url_filter in (loc.text or ""):
            nested = _fetch_sitemap_urls(loc.text.strip(), url_filter)
            urls.extend(nested)

    # Direct URL entries
    for url_el in root.findall("sm:url", ns):
        loc = url_el.find("sm:loc", ns)
        if loc is not None and loc.text and url_filter in loc.text:
            urls.append(loc.text.strip())

    return urls


def _fetch_sitemap(source: dict, existing_ids: set[str]) -> list[dict]:
    urls = _fetch_sitemap_urls(source["url"], source["filter"])
    if not urls:
        logger.info("[%s] No sitemap URLs matched filter %r", source["name"], source["filter"])
        return []

    # Most-recently-added URLs tend to be at the end of sitemaps
    new_urls = [u for u in reversed(urls) if _url_id(u) not in existing_ids][:_MAX_PER_SOURCE]

    papers = []
    for url in new_urls:
        uid = _url_id(url)
        full_text = _extract_text(url)
        if not full_text:
            continue

        # Use first 150 chars as a title approximation if we can't parse it
        title = url.rstrip("/").split("/")[-1].replace("-", " ").title()
        abstract = full_text[:800]

        papers.append({
            "arxiv_id": uid,
            "title": title,
            "authors": source["org"],
            "abstract": abstract,
            "full_text": full_text[:4000],
            "categories": f"blog:{source['org'].lower().replace(' ', '_')}",
            "published_date": date.today().isoformat(),
            "url": url,
            "source": "blog",
        })

    logger.info("[%s] Sitemap: %d new posts extracted", source["name"], len(papers))
    return papers


def fetch_blog_posts(existing_ids: set[str]) -> list[dict]:
    """Fetch recent blog posts from all configured AI lab sources.

    Returns a list of dicts in the same schema as arXiv papers, with
    source='blog' so the orchestrator can track provenance.
    """
    all_posts: list[dict] = []
    for source in _SOURCES:
        try:
            if source["type"] == "rss":
                posts = _fetch_rss(source, existing_ids)
            else:
                posts = _fetch_sitemap(source, existing_ids)
            all_posts.extend(posts)
        except Exception as exc:
            logger.warning("[%s] Unexpected error: %s", source["name"], exc)

    logger.info("Blog fetch complete — %d new posts total", len(all_posts))
    return all_posts
