from unittest.mock import MagicMock, patch

import pytest

from worker.stages.fetch import fetch_new_papers


def _make_entry(arxiv_id: str, title: str = "Test Paper") -> MagicMock:
    entry = MagicMock()
    entry.id = f"http://arxiv.org/abs/{arxiv_id}v1"
    entry.title = title
    entry.summary = "Abstract text here."
    author = MagicMock()
    author.name = "Alice Smith"
    entry.authors = [author]
    tag = MagicMock()
    tag.term = "cs.AI"
    entry.tags = [tag]
    entry.published = "2026-01-01T00:00:00Z"
    entry.link = f"http://arxiv.org/abs/{arxiv_id}"
    return entry


def test_fetch_deduplicates_existing():
    existing_ids = {"2601.00001"}
    with patch("worker.stages.fetch.requests.get") as mock_get:
        mock_get.return_value.text = ""
        mock_get.return_value.raise_for_status = lambda: None
        with patch("worker.stages.fetch.feedparser.parse") as mock_parse:
            mock_parse.return_value.entries = [_make_entry("2601.00001")]
            papers = fetch_new_papers(
                orgs=["DeepMind"], categories=["cs.AI"], existing_ids=existing_ids
            )
    assert papers == []


def test_fetch_returns_new_papers():
    with patch("worker.stages.fetch.requests.get") as mock_get:
        mock_get.return_value.text = "<feed/>"
        mock_get.return_value.raise_for_status = lambda: None
        with patch("worker.stages.fetch.feedparser.parse") as mock_parse:
            mock_parse.return_value.entries = [_make_entry("2601.99999", "New Paper")]
            papers = fetch_new_papers(
                orgs=["Anthropic"], categories=["cs.LG"], existing_ids=set()
            )
    assert len(papers) == 1
    assert papers[0]["arxiv_id"] == "2601.99999"
    assert papers[0]["title"] == "New Paper"


def test_fetch_builds_org_category_query():
    """Verify the URL sent to arXiv includes both org and category terms."""
    with patch("worker.stages.fetch.requests.get") as mock_get:
        mock_get.return_value.text = "<feed/>"
        mock_get.return_value.raise_for_status = lambda: None
        with patch("worker.stages.fetch.feedparser.parse") as mock_parse:
            mock_parse.return_value.entries = []
            fetch_new_papers(
                orgs=["DeepMind", "Anthropic"],
                categories=["cs.AI", "cs.LG"],
                existing_ids=set(),
            )
    call_url = mock_get.call_args[0][0]
    assert "DeepMind" in call_url
    assert "Anthropic" in call_url
    assert "cs.AI" in call_url


def test_fetch_skips_invalid_orgs(caplog):
    import logging
    with patch("worker.stages.fetch.requests.get") as mock_get:
        mock_get.return_value.text = "<feed/>"
        mock_get.return_value.raise_for_status = lambda: None
        with patch("worker.stages.fetch.feedparser.parse") as mock_parse:
            mock_parse.return_value.entries = []
            with caplog.at_level(logging.WARNING):
                fetch_new_papers(
                    orgs=["ValidOrg", "bad<script>"],
                    categories=["cs.AI"],
                    existing_ids=set(),
                )
    assert "bad<script>" in caplog.text


def test_fetch_handles_request_error(caplog):
    import logging
    import requests as req
    with patch("worker.stages.fetch.requests.get", side_effect=req.RequestException("timeout")):
        with caplog.at_level(logging.WARNING):
            papers = fetch_new_papers(orgs=["DeepMind"], categories=["cs.AI"], existing_ids=set())
    assert papers == []
    assert "timeout" in caplog.text
