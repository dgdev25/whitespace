from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "whitespace"
    database_url: str = "postgresql+psycopg://whitespace:whitespace@localhost:5432/whitespace"
    ruvector_base_url: str = "http://localhost:18732"
    embeddings_mode: str = "full"  # "full" | "stub"
    pipeline_mode: str = "full"    # "full" | "stub"
    worker_schedule_hour: int = 2
    worker_schedule_minute: int = 0
    arxiv_categories: str = "cs.LG,cs.AI,cs.SE,cs.HC,cs.AR,cs.DC,eess.SP"
    ideas_per_run: int = 8

settings = Settings()
