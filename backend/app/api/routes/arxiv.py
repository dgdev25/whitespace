from __future__ import annotations

import re
import time
from datetime import datetime, timedelta, timezone
from typing import Any
from xml.etree import ElementTree
import html

import requests
from fastapi import APIRouter, HTTPException, Query

from app.schemas.common import ResponseEnvelope, make_meta


CATEGORY_TAXONOMY_URL = "https://arxiv.org/category_taxonomy"
ARXIV_API_URL = "http://export.arxiv.org/api/query"
ARXIV_REQUEST_DELAY_SECONDS = 3
CATEGORY_CACHE_TTL = timedelta(hours=24)
DEFAULT_MAX_RESULTS = 50
MAX_MAX_RESULTS = 200

router = APIRouter()

_cached_categories: list[dict[str, Any]] | None = None
_cached_categories_at: datetime | None = None


def _parse_category_taxonomy(raw_html: str) -> list[dict[str, Any]]:
    categories: list[dict[str, Any]] = []
    current_group: str | None = None

    pattern = re.compile(r"<h2[^>]*>(.*?)</h2>|<h4[^>]*>(.*?)</h4>", re.IGNORECASE | re.DOTALL)
    for match in pattern.finditer(raw_html):
        group_text = match.group(1)
        category_text = match.group(2)
        if group_text:
            group = html.unescape(re.sub(r"<[^>]+>", "", group_text)).strip()
            if group and group.lower() not in {"classification guide", "group name"}:
                current_group = group
            continue
        if category_text:
            cleaned = html.unescape(re.sub(r"<[^>]+>", "", category_text)).strip()
            cat_match = re.match(r"([^\s]+)\s*\(([^)]+)\)", cleaned)
            if not cat_match:
                continue
            category_id, name = cat_match.groups()
            categories.append(
                {
                    "id": category_id.strip(),
                    "name": name.strip(),
                    "group": current_group,
                }
            )

    return categories


def _get_cached_categories() -> list[dict[str, Any]] | None:
    if _cached_categories is None or _cached_categories_at is None:
        return None
    if datetime.now(timezone.utc) - _cached_categories_at > CATEGORY_CACHE_TTL:
        return None
    return _cached_categories


def _set_cached_categories(categories: list[dict[str, Any]]) -> None:
    global _cached_categories
    global _cached_categories_at
    _cached_categories = categories
    _cached_categories_at = datetime.now(timezone.utc)


@router.get("/arxiv/categories")
def list_categories() -> ResponseEnvelope:
    cached = _get_cached_categories()
    if cached is not None:
        return ResponseEnvelope(data=cached, error=None, meta=make_meta(count=len(cached)))

    try:
        resp = requests.get(CATEGORY_TAXONOMY_URL, timeout=30)
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"ARXIV_UNAVAILABLE: {exc}") from exc

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="ARXIV_UNAVAILABLE")

    categories = _parse_category_taxonomy(resp.text)
    if not categories:
        raise HTTPException(status_code=502, detail="ARXIV_CATEGORY_PARSE_FAILED")

    _set_cached_categories(categories)
    return ResponseEnvelope(data=categories, error=None, meta=make_meta(count=len(categories)))


def _parse_atom_entries(raw_xml: str) -> list[dict[str, Any]]:
    namespace = {"atom": "http://www.w3.org/2005/Atom"}
    feed = ElementTree.fromstring(raw_xml)
    entries: list[dict[str, Any]] = []

    for entry in feed.findall("atom:entry", namespace):
        id_url = entry.findtext("atom:id", default="", namespaces=namespace)
        if "/abs/" not in id_url:
            continue
        raw_id = id_url.split("/abs/")[-1]
        arxiv_id = raw_id.split("v")[0]

        title = (entry.findtext("atom:title", default="", namespaces=namespace) or "").strip()
        summary = (entry.findtext("atom:summary", default="", namespaces=namespace) or "").strip()
        published = entry.findtext("atom:published", default="", namespaces=namespace)
        updated = entry.findtext("atom:updated", default="", namespaces=namespace)

        categories = [
            category.attrib.get("term")
            for category in entry.findall("atom:category", namespace)
            if category.attrib.get("term")
        ]

        entries.append(
            {
                "id": arxiv_id,
                "title": title,
                "summary": summary,
                "published": published,
                "updated": updated,
                "abs_url": f"https://arxiv.org/abs/{arxiv_id}",
                "pdf_url": f"https://arxiv.org/pdf/{arxiv_id}.pdf",
                "categories": categories,
            }
        )

    return entries


def _parse_published_date(published: str) -> datetime | None:
    if not published:
        return None
    try:
        return datetime.fromisoformat(published.replace("Z", "+00:00"))
    except ValueError:
        return None


@router.get("/arxiv/search")
def search_arxiv(
    categories: list[str] = Query(..., min_length=1),
    time_unit: str = Query("months"),
    time_value: int = Query(6, ge=1, le=120),
    max_results: int = Query(DEFAULT_MAX_RESULTS, ge=1, le=MAX_MAX_RESULTS),
) -> ResponseEnvelope:
    if time_unit not in {"months", "years"}:
        raise HTTPException(status_code=400, detail="INVALID_TIME_UNIT")

    cutoff = datetime.now(timezone.utc) - (
        timedelta(days=30 * time_value) if time_unit == "months" else timedelta(days=365 * time_value)
    )

    results: dict[str, dict[str, Any]] = {}

    for index, category in enumerate(categories):
        if index > 0:
            time.sleep(ARXIV_REQUEST_DELAY_SECONDS)

        params = {
            "search_query": f"cat:{category}",
            "start": 0,
            "max_results": max_results,
            "sortBy": "submittedDate",
            "sortOrder": "descending",
        }
        try:
            resp = requests.get(ARXIV_API_URL, params=params, timeout=30)
        except requests.RequestException as exc:
            raise HTTPException(status_code=502, detail=f"ARXIV_UNAVAILABLE: {exc}") from exc

        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="ARXIV_UNAVAILABLE")

        entries = _parse_atom_entries(resp.text)
        for entry in entries:
            published_dt = _parse_published_date(entry.get("published", ""))
            if published_dt is None or published_dt < cutoff:
                continue
            existing = results.get(entry["id"])
            if existing:
                existing_categories = set(existing.get("categories", []))
                existing_categories.update(entry.get("categories", []))
                existing["categories"] = sorted(existing_categories)
                continue
            results[entry["id"]] = entry

    sorted_results = sorted(
        results.values(),
        key=lambda item: item.get("published", ""),
        reverse=True,
    )

    return ResponseEnvelope(
        data=sorted_results,
        error=None,
        meta=make_meta(count=len(sorted_results)),
    )
