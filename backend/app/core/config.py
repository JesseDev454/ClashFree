from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


def normalize_database_url(url: str) -> str:
    """Accept Neon/postgres URLs and force the psycopg3 SQLAlchemy driver."""
    if url.startswith("postgresql+psycopg://") or url.startswith("postgresql+psycopg2://"):
        return url
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url.removeprefix("postgresql://")
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url.removeprefix("postgres://")
    return url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "clashfree-api"
    database_url: str
    cors_origins: str = (
        "http://127.0.0.1:5173,http://localhost:5173,"
        "http://127.0.0.1:4173,http://localhost:4173,"
        "http://127.0.0.1:4174,http://localhost:4174,"
        "http://127.0.0.1:4175,http://localhost:4175,"
        "http://127.0.0.1:4176,http://localhost:4176,"
        "http://127.0.0.1:4177,http://localhost:4177,"
        "http://127.0.0.1:4178,http://localhost:4178"
    )
    session_secret: str = "clashfree-dev-session-secret-change-me"
    session_ttl_hours: int = 12
    cookie_secure: bool = False
    auth_debug: bool = False
    seed_password: str = "ClashFree!dev"
    app_origin: str = "http://127.0.0.1:5173"
    session_cookie_name: str = "clashfree_session"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def sqlalchemy_database_url(self) -> str:
        return normalize_database_url(self.database_url)


@lru_cache
def get_settings() -> Settings:
    return Settings()
