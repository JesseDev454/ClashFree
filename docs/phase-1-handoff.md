# Phase 1 handoff

## Delivered

- `backend/` FastAPI app with Pydantic Settings, SQLAlchemy 2 and Alembic.
- PostgreSQL connection via `DATABASE_URL` (Neon or local Docker).
- `GET /health` upserts and reads a singleton `health_probes` row.
- React calls `/health` from the design-preview banner (`BackendStatus`).
- `docker-compose.yml` Postgres 16 service for local work without Neon.
- Backend Ruff + Pytest in GitHub Actions against a Postgres service.

## Acceptance

The React app opens locally, requests `GET /health`, and FastAPI can write and read a row in PostgreSQL. Generate / repair / publish remain disabled.

## Remaining after Phase 1

Phase 2 (now implemented — see [phase-2-handoff.md](phase-2-handoff.md)) covers local email/password auth, session cookies and 403 capability guards. Neon Managed Auth is still a later identity-provider swap, not a rewrite of `users.role`.

Do **not** implement the solver (Phase 5) or academic CRUD (Phase 3) here.
