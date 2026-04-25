from app.core.config import settings


def test_app_name():
    assert settings.app_name == "whitespace"

def test_database_url_has_default():
    # In development, we use SQLite; in production, PostgreSQL
    assert settings.database_url.startswith(("postgresql+psycopg://", "sqlite+aiosqlite://"))

def test_config_has_arxiv_orgs():
    from app.core.config import settings
    assert hasattr(settings, "arxiv_orgs")
    assert "DeepMind" in settings.arxiv_orgs
