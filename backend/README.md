"""FastAPI backend for ClashFree.

Phase 10 adds notifications, reports, an audit log, and Resend-or-console email.
Phase 9 portals, personal timetables, and scoped generation are still in place.
Phase 8 repair still publishes a new version and marks one disruption repaired.


## Setup

```bash
cd backend
uv sync --group dev
copy .env.example .env   # PowerShell: Copy-Item .env.example .env
```

Start a local database on host port **5433** (or put a Neon `DATABASE_URL` in `.env` instead):

```bash
docker compose up -d db
uv run alembic upgrade head
uv run python -m app.cli seed_phase2
uv run python -m app.cli seed_phase3
uv run python -m app.cli seed_phase4
uv run python -m app.cli seed_phase5
uv run python -m app.cli seed_phase6
uv run python -m app.cli seed_phase10
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Open http://127.0.0.1:8000/health and http://127.0.0.1:8000/docs.

Seed accounts (password `ClashFree!dev`): `admin@clashfree.test`,
`coordinator@clashfree.test`, `lecturer@clashfree.test`,
`facilities@clashfree.test`, `student@clashfree.test`.

Set `AUTH_DEBUG=true` locally so forgot-password links print to the console
and `GET /api/auth/debug/last-token` is available for Playwright.

## Checks

```bash
uv run ruff check .
uv run ruff format --check .
uv run pytest
```
