from app.core.config import settings


def test_app_name():
    assert settings.app_name == "whitespace"

def test_database_url_has_default():
    assert settings.database_url.startswith("postgresql+psycopg://")

def test_config_has_arxiv_orgs():
    from app.core.config import settings
    assert hasattr(settings, "arxiv_orgs")
    assert "DeepMind" in settings.arxiv_orgs
