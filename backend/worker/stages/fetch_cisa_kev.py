import hashlib
import logging
from datetime import date, timedelta

import requests

logger = logging.getLogger(__name__)

_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
_HEADERS = {"User-Agent": "Whitespace-Research-Bot/2.0 (mailto:research@whitespace.ai)"}
_TIMEOUT = 20
_LOOKBACK_DAYS = 90


def _uid(cve_id: str) -> str:
    return hashlib.sha256(f"cisa-kev:{cve_id}".encode()).hexdigest()[:32]


def fetch_cisa_kev_vulnerabilities(existing_ids: set[str]) -> list[dict]:
    """Fetch recently added entries from the CISA Known Exploited Vulnerabilities catalog.

    Filters to vulnerabilities added within the last 90 days. No API key required.
    Each entry becomes a paper record with source='cisa_kev', useful for tracking
    active threat exposure relevant to cyber insurance accumulation modelling.
    """
    cutoff = (date.today() - timedelta(days=_LOOKBACK_DAYS)).isoformat()
    try:
        resp = requests.get(_URL, headers=_HEADERS, timeout=_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException as exc:
        logger.warning("[CISA KEV] request failed: %s", exc)
        return []

    results: list[dict] = []
    for vuln in data.get("vulnerabilities", []):
        cve_id = vuln.get("cveID", "")
        date_added = vuln.get("dateAdded", "")
        if not cve_id or date_added < cutoff:
            continue
        uid = _uid(cve_id)
        if uid in existing_ids:
            continue

        short_desc = vuln.get("shortDescription", "").strip()
        required_action = vuln.get("requiredAction", "").strip()
        ransomware = vuln.get("knownRansomwareCampaignUse", "Unknown")
        product = vuln.get("product", "")
        vendor = vuln.get("vendorProject", "")

        abstract = (
            f"{short_desc} "
            f"Affected: {vendor} {product}. "
            f"Required action: {required_action} "
            f"Ransomware association: {ransomware}."
        ).strip()

        results.append({
            "arxiv_id": uid,
            "title": f"{cve_id}: {vuln.get('vulnerabilityName', '')}",
            "authors": vendor,
            "abstract": abstract,
            "full_text": abstract,
            "categories": "cisa_kev,cyber,vulnerability",
            "published_date": date_added,
            "url": "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
            "source": "cisa_kev",
        })

    logger.info("[CISA KEV] %d new vulnerabilities (added since %s)", len(results), cutoff)
    return results
