from app.core.config import settings

def test_app_name():
    assert settings.app_name == "whitespace"

def test_database_url_has_default():
    assert settings.database_url is not None
