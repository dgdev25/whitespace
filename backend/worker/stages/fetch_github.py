import base64
import logging
import os

import requests

logger = logging.getLogger(__name__)
GITHUB_API = "https://api.github.com"
README_MAX_CHARS = 50_000


def _headers() -> dict[str, str]:
    token = os.getenv("GITHUB_TOKEN")
    h: dict[str, str] = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h


def _fetch_readme(owner: str, repo: str) -> str | None:
    url = f"{GITHUB_API}/repos/{owner}/{repo}/readme"
    try:
        resp = requests.get(url, headers=_headers(), timeout=15)
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        data = resp.json()
        content = base64.b64decode(data.get("content", "")).decode("utf-8", errors="replace")
        return content[:README_MAX_CHARS]
    except (requests.RequestException, ValueError) as exc:
        logger.warning("README fetch failed for %s/%s: %s", owner, repo, exc)
        return None


def fetch_github_repos(repos: list[str], existing_ids: set[str]) -> list[dict]:
    results: list[dict] = []
    for slug in repos:
        if "/" not in slug:
            logger.warning("Skipping invalid GitHub repo slug: %r", slug)
            continue
        owner, repo = slug.split("/", 1)
        uid = f"github:{owner}/{repo}"
        if uid in existing_ids:
            continue
        try:
            resp = requests.get(
                f"{GITHUB_API}/repos/{owner}/{repo}",
                headers=_headers(),
                timeout=15,
            )
            if resp.status_code == 404:
                logger.warning("GitHub repo not found: %s/%s", owner, repo)
                continue
            resp.raise_for_status()
            meta = resp.json()
        except requests.RequestException as exc:
            logger.warning("GitHub metadata fetch failed for %s/%s: %s", owner, repo, exc)
            continue

        if meta.get("private"):
            logger.info("Skipping private repo: %s/%s", owner, repo)
            continue

        readme = _fetch_readme(owner, repo)
        if not readme:
            logger.info("No README for %s/%s — skipping", owner, repo)
            continue

        description = meta.get("description") or ""
        results.append({
            "arxiv_id": uid,
            "title": f"{owner}/{repo}",
            "authors": owner,
            "abstract": description,
            "full_text": readme,
            "categories": ", ".join(meta.get("topics") or []),
            "published_date": (meta.get("created_at") or "")[:10],
            "url": meta.get("html_url") or f"https://github.com/{owner}/{repo}",
            "source": "github",
        })
        logger.info("Fetched GitHub repo: %s/%s", owner, repo)

    return results
