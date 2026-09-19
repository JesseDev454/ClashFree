# ClashFree

Disruption-aware, constraint-based university timetable optimisation and repair.

Phase 2 adds email/password authentication, httpOnly session cookies, five role-guarded accounts, and API **403** enforcement. Neon Auth is not used yet; `users.auth_subject` is reserved for a later identity swap. Academic CRUD, the solver, and Resend remain later phases.

## Local setup

### Database and API

Start Postgres locally on port **5433** (so it does not collide with a Windows PostgreSQL install on 5432), or put a Neon connection string in `backend/.env`.

```bash
docker compose up -d db
cd backend
uv sync --group dev
Copy-Item .env.example .env
uv run alembic upgrade head
uv run python -m app.cli seed_phase2
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Health: http://127.0.0.1:8000/health  
API docs: http://127.0.0.1:8000/docs

Seed password for every local account: `ClashFree!dev`

| Email | Role |
| --- | --- |
| `admin@clashfree.test` | Timetable administrator |
| `coordinator@clashfree.test` | Department coordinator (Software Engineering) |
| `lecturer@clashfree.test` | Lecturer |
| `facilities@clashfree.test` | Facilities manager |
| `student@clashfree.test` | Student |

`AUTH_DEBUG=true` prints reset/verify links in the API console and enables `GET /api/auth/debug/last-token`. Leave it off outside local/CI.

### Frontend

Keep `VITE_API_BASE_URL` empty. Vite proxies `/api` and `/health` to FastAPI so session cookies stay same-origin.

```bash
cd frontend
Copy-Item .env.example .env
npm ci
npm run dev
```

Then open:

- http://localhost:5173/ — login, or the signed-in role dashboard
- http://localhost:5173/auth/login
- http://localhost:5173/preview/admin/dashboard — unauthenticated design lab
- http://localhost:5173/preview/components

The preview banner reports **API connected** when FastAPI and Postgres are running. Dashboard numbers remain sample fixtures. Generate, repair and publish stay disabled in the UI; non-admins receive **403** if they POST the stub endpoints, and the administrator receives **501** until Phase 5.

## Checks

Frontend, from `frontend/`:

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test:run
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:e2e:auth
```

Backend, from `backend/`:

```bash
uv sync --group dev
uv run ruff check .
uv run ruff format --check .
uv run pytest
```

`test:e2e` builds the production bundle and exercises preview routes. It mocks `/health` and `/api/me`, so Playwright does not need the API running.

`test:e2e:auth` starts FastAPI (with `AUTH_DEBUG=true`) and runs the real-API login spec. Postgres must be up and seeded.

## Documentation

- [Scope](docs/scope.md)
- [Page inventory](docs/page-inventory.md)
- [Permissions matrix](docs/permissions-matrix.md)
- [Design specification](docs/design-specification.md)
- [Visual review](docs/visual-review.md)
- [Phase 0 handoff](docs/phase-0-handoff.md)
- [Phase 1 handoff](docs/phase-1-handoff.md)
- [Phase 2 handoff](docs/phase-2-handoff.md)

Reference mockups live in `docs/design-references/` and are not served by the Vite app.

## Troubleshooting

- **Port 4173 in use:** stop the existing preview server or change the port in `frontend/package.json` and `frontend/playwright.config.ts`.
- **Playwright browsers missing:** `npx playwright install chromium`.
- **API unreachable in the banner:** start Postgres, run migrations, then start FastAPI on port 8000. Confirm `VITE_API_BASE_URL` is empty so `/health` is proxied.
- **Login succeeds in docs but the UI stays signed out:** the UI and API must share an origin. Use the Vite proxy rather than pointing the browser at `localhost:5173` and the API at `127.0.0.1:8000`.
- **Sidebar items clipped:** scroll the navy sidebar; Settings and Help are below Notifications by design.
- **Charts blank in tests:** unit tests mock `ResizeObserver`; screenshots wait for `document.fonts.ready`.
