# ClashFree

Disruption-aware, constraint-based university timetable optimisation and repair.

Phase 10 adds in-app notifications, reports, an audit log, and email when a user’s notification toggles are on. The console mailer is the default; Resend is used when `RESEND_API_KEY` and `RESEND_FROM` are set. Coordinators still edit their own department, and lecturers and students still see their published week. Identity is still FastAPI email/password. Neon Auth is not used yet; `users.auth_subject` is reserved for a later identity swap.

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
uv run python -m app.cli seed_phase3
uv run python -m app.cli seed_phase4
uv run python -m app.cli seed_phase5
uv run python -m app.cli seed_phase6
uv run python -m app.cli seed_phase10
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
| `student@clashfree.test` | Student (cohort `SWE-300-A`) |

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

The preview banner reports **API connected** when FastAPI and Postgres are running. `/preview/admin/dashboard` keeps sample fixtures and keeps Generate, Repair, and Publish disabled. Production `/admin/dashboard` loads catalogue counts from `/api/academic/summary`, live disruption rows from `/api/disruptions`, and enables Generate (links to `/admin/generate-timetable`), Repair (links to `/admin/repair-timetable`), and Publish (links to `/admin/publish-timetable`).

Signed-in administrators can open `/admin/generate-timetable`, `/admin/generation-results`, `/admin/master-timetable`, `/admin/conflict-monitor`, `/admin/publish-timetable`, `/admin/timetable-versions`, `/admin/change-review`, `/admin/disruption-centre`, `/admin/repair-timetable`, `/admin/repair-comparison`, `/admin/users-roles`, `/admin/reports-analytics`, `/admin/audit-log`, and `/admin/notifications`, as well as the Phase 3–4 catalogue and rules screens. Coordinators edit their department under `/coordinator/` and can open `/coordinator/reports-analytics` and `/coordinator/notifications`. Lecturers can open `/lecturer/availability`, `/lecturer/scheduling-preferences`, `/lecturer/report-unavailability`, `/lecturer/my-timetable`, `/lecturer/my-courses`, and `/lecturer/notifications`. Facilities managers can open `/facilities/room-availability`, `/facilities/room-status`, `/facilities/report-disruption`, `/facilities/affected-classes`, `/facilities/maintenance-schedule`, `/facilities/room-utilization`, `/facilities/facility-history`, and `/facilities/notifications`. Students open `/student/my-timetable`, `/student/today`, and `/student/notifications`. Preview hrefs stay on `/preview/unavailable/...`.

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
npm run test:e2e:academic
npm run test:e2e:constraints
npm run test:e2e:solver
npm run test:e2e:publish
npm run test:e2e:disruptions
npm run test:e2e:repair
npm run test:e2e:portals
npm run test:e2e:activity
```

Backend, from `backend/`:

```bash
uv sync --group dev
uv run ruff check .
uv run ruff format --check .
uv run pytest
```

`test:e2e` builds the production bundle and exercises preview routes. It mocks `/health` and `/api/me`, so Playwright does not need the API running.

`test:e2e:auth` starts FastAPI (with `AUTH_DEBUG=true`) and runs the real-API login spec. Postgres must be up and seeded with `seed_phase2`.

`test:e2e:academic` starts FastAPI and runs the administrator Courses CRUD spec. Postgres must also be seeded with `seed_phase3`.

`test:e2e:constraints` starts FastAPI and runs the constraints/availability spec. Postgres must also be seeded with `seed_phase4`.

`test:e2e:solver` starts FastAPI and runs the generate/master-timetable spec. Postgres must also be seeded with `seed_phase5`.

`test:e2e:publish` starts FastAPI and runs the publish/versions spec on port **4177**. Postgres must also be seeded with `seed_phase6`.

`test:e2e:disruptions` starts FastAPI and runs the disruption report/impact spec on port **4178**. Postgres must also be seeded with `seed_phase7`.

`test:e2e:repair` starts FastAPI and runs the repair spec on port **4179**. Postgres must also be seeded with `seed_phase8`.

`test:e2e:portals` starts FastAPI and runs the portal spec on port **4180**. Postgres must also be seeded with `seed_phase9`.

`test:e2e:activity` starts FastAPI and runs the notifications, reports, and audit spec on port **4181**. Postgres must also be seeded with `seed_phase10`.

## Documentation

- [Scope](docs/scope.md)
- [Page inventory](docs/page-inventory.md)
- [Permissions matrix](docs/permissions-matrix.md)
- [Design specification](docs/design-specification.md)
- [Visual review](docs/visual-review.md)
- [Phase 0 handoff](docs/phase-0-handoff.md)
- [Phase 1 handoff](docs/phase-1-handoff.md)
- [Phase 2 handoff](docs/phase-2-handoff.md)
- [Phase 3 handoff](docs/phase-3-handoff.md)
- [Phase 4 handoff](docs/phase-4-handoff.md)
- [Phase 5 handoff](docs/phase-5-handoff.md)
- [Phase 6 handoff](docs/phase-6-handoff.md)
- [Phase 7 handoff](docs/phase-7-handoff.md)
- [Phase 8 handoff](docs/phase-8-handoff.md)
- [Phase 9 handoff](docs/phase-9-handoff.md)
- [Phase 10 handoff](docs/phase-10-handoff.md)

Reference mockups live in `docs/design-references/` and are not served by the Vite app.

## Troubleshooting

- **Port 4173 in use:** stop the existing preview server or change the port in `frontend/package.json` and `frontend/playwright.config.ts`.
- **Playwright browsers missing:** `npx playwright install chromium`.
- **API unreachable in the banner:** start Postgres, run migrations, then start FastAPI on port 8000. Confirm `VITE_API_BASE_URL` is empty so `/health` is proxied.
- **Login succeeds in docs but the UI stays signed out:** the UI and API must share an origin. Use the Vite proxy rather than pointing the browser at `localhost:5173` and the API at `127.0.0.1:8000`.
- **Sidebar items clipped:** scroll the navy sidebar; Settings and Help are below Notifications by design.
- **Charts blank in tests:** unit tests mock `ResizeObserver`; screenshots wait for `document.fonts.ready`.
