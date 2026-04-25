from unittest.mock import patch, MagicMock
from worker.stages.fetch import fetch_new_papers

def test_fetch_deduplicates_existing(tmp_path):
    existing_ids = {"2601.00001"}
    mock_entry = MagicMock()
    mock_entry.id = "http://arxiv.org/abs/2601.00001v1"
    mock_entry.title = "Test Paper"
    mock_entry.summary = "Abstract"
    mock_entry.authors = [MagicMock(name="Author")]
    mock_entry.tags = [MagicMock(term="cs.LG")]
    mock_entry.published = "2026-01-01T00:00:00Z"
    mock_entry.link = "http://arxiv.org/abs/2601.00001"

    with patch("worker.stages.fetch.feedparser.parse") as mock_parse:
        mock_parse.return_value.entries = [mock_entry]
        papers = fetch_new_papers(["cs.LG"], existing_ids=existing_ids, max_results=10)

    assert papers == []  # deduplicated
