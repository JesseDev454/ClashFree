from app.core.config import normalize_database_url


def test_normalize_neon_and_postgres_urls() -> None:
    neon = "postgresql://user:pass@ep-host/neondb?sslmode=require"
    assert (
        normalize_database_url(neon)
        == "postgresql+psycopg://user:pass@ep-host/neondb?sslmode=require"
    )
    assert normalize_database_url("postgres://user:pass@localhost/db").startswith(
        "postgresql+psycopg://"
    )
    already = "postgresql+psycopg://user:pass@localhost/db"
    assert normalize_database_url(already) == already
