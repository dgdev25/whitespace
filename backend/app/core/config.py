from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "whitespace"
    database_url: str = "sqlite+aiosqlite:///./whitespace.db"
    ruvector_base_url: str = "http://localhost:18732"
    embeddings_mode: str = "full"  # "full" | "stub"
    pipeline_mode: str = "full"    # "full" | "stub"
    worker_schedule_hour: int = 2
    worker_schedule_minute: int = 0
    arxiv_orgs: str = "DeepMind,Anthropic,OpenAI"
    arxiv_categories: str = "cs.AI,cs.LG,cs.NE,stat.ML,cs.CL,cs.IR,cs.CV,eess.IV,cs.AR,cs.DC,cs.PL,cs.SE,cs.SY,eess.SY,cs.CR,cs.DB,cs.GT,cs.HC,cs.MA,cs.RO,eess.AS,eess.SP,math.OC,stat.AP,q-bio.NC"
    ideas_per_run: int = 5
    max_sources_per_run: int = 5
    cached_analyses_count: int = 5

settings = Settings()
