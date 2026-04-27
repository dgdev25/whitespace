import base64
import logging
import os
import re
from collections.abc import Callable

import requests

logger = logging.getLogger(__name__)
GITHUB_API = "https://api.github.com"
README_MAX_CHARS = 50_000
_HANDLE_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9\-]{0,38}$")


def _validate_handle(handle: str) -> str:
    """Raise ValueError if handle contains path-traversal or invalid characters."""
    if not _HANDLE_RE.match(handle):
        raise ValueError(f"Invalid GitHub handle: {handle!r}. Must be alphanumeric with hyphens only.")


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


def _check_rate_limit(resp: requests.Response) -> None:
    """Raise a clear error if GitHub returned a rate-limit response (403 or 429)."""
    if resp.status_code == 429:
        raise RuntimeError(
            "GitHub API rate limit exceeded (429). Set GITHUB_TOKEN in backend/.env and restart the backend."
        )
    if resp.status_code == 403:
        try:
            msg = (resp.json() or {}).get("message", "")
        except ValueError:
            msg = ""
        if "rate limit" in msg.lower():
            raise RuntimeError(
                "GitHub API rate limit exceeded. Set GITHUB_TOKEN in backend/.env and restart the backend."
            )


def _list_handle_repos(handle: str) -> list[dict]:
    """Return all public repo metadata for a GitHub user or org (handles both account types)."""
    _validate_handle(handle)
    hdrs = _headers()
    for endpoint in (
        f"{GITHUB_API}/orgs/{handle}/repos",
        f"{GITHUB_API}/users/{handle}/repos",
    ):
        page, repos = 1, []
        while True:
            resp = requests.get(
                endpoint, headers=hdrs,
                params={"type": "public", "per_page": 100, "page": page},
                timeout=15,
            )
            _check_rate_limit(resp)
            if resp.status_code in (404, 403):
                break  # not an org / no access — try user endpoint
            resp.raise_for_status()
            batch = [r for r in resp.json() if not r.get("private")]
            repos.extend(batch)
            if len(batch) < 100:
                return repos
            page += 1
        if repos:
            return repos
    raise ValueError(f"GitHub handle '{handle}' not found as org or user")


def fetch_handle_repos(
    handle: str,
    existing_ids: set[str],
    on_progress: Callable[[int, int], None] | None = None,
) -> list[dict]:
    """Fetch all public repos from a GitHub user or org, returning paper dicts."""
    repo_list = _list_handle_repos(handle)
    total = len(repo_list)
    results: list[dict] = []

    for i, meta in enumerate(repo_list):
        owner = (meta.get("owner") or {}).get("login", handle)
        repo_name = meta["name"]
        uid = f"github:{owner}/{repo_name}"

        if uid not in existing_ids:
            readme = _fetch_readme(owner, repo_name)
            if readme:
                description = meta.get("description") or ""
                safe_readme = f"<readme>\n{readme.replace('</readme>', '<\\/readme>')}\n</readme>"
                results.append({
                    "arxiv_id": uid,
                    "title": f"{owner}/{repo_name}",
                    "authors": owner,
                    "abstract": description,
                    "full_text": safe_readme,
                    "categories": "",
                    "published_date": (meta.get("created_at") or "")[:10],
                    "url": meta.get("html_url") or f"https://github.com/{owner}/{repo_name}",
                    "source": "github",
                })

        if on_progress:
            on_progress(i + 1, total)

    return results


def fetch_github_repos(repos: list[str], existing_ids: set[str]) -> list[dict]:
    results: list[dict] = []
    for slug in repos:
        if "/" not in slug:
            logger.warning("Skipping invalid GitHub repo slug: %r", slug)
            continue
        owner, repo = slug.split("/", 1)
        try:
            _validate_handle(owner)
            _validate_handle(repo)
        except ValueError as exc:
            logger.warning("Skipping repo with invalid owner/name: %r — %s", slug, exc)
            continue
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
        # Wrap README in delimiters to prevent prompt injection from user-controlled content
        safe_readme = f"<readme>\n{readme.replace('</readme>', '<\\/readme>')}\n</readme>"
        results.append({
            "arxiv_id": uid,
            "title": f"{owner}/{repo}",
            "authors": owner,
            "abstract": description,
            "full_text": safe_readme,
            "categories": ", ".join(meta.get("topics") or []),
            "published_date": (meta.get("created_at") or "")[:10],
            "url": meta.get("html_url") or f"https://github.com/{owner}/{repo}",
            "source": "github",
        })
        logger.info("Fetched GitHub repo: %s/%s", owner, repo)

    return results
