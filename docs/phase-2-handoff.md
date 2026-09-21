# Phase 2 handoff

## Delivered

- Alembic revision `0002_auth_rbac`: `departments`, `users`, `sessions`, `email_tokens`.
- Optional `users.auth_subject` for a later Neon Auth swap. Identity in this phase is FastAPI email/password with Argon2 hashes.
- Idempotent seed CLI: `uv run python -m app.cli seed_phase2`.
- httpOnly `clashfree_session` cookies (`SameSite=Lax`, `Path=/`).
- Public auth API: login, logout, forgot-password, resend-verification, reset-password.
- `GET /api/me` plus capability stubs:
  - `POST /api/timetables/generate` (`generate`)
  - `POST /api/timetables/repair` (`approveRepair`)
  - `POST /api/timetables/publish` (`publish`)
- Console mailer only. Resend is Phase 10.
- Five auth screens, `AuthProvider`, production role dashboards and route guards.
- Vite proxies `/api` and `/health` so the UI and API share an origin.
- Pytest auth/RBAC coverage, Vitest login/guard tests, Playwright preview visuals plus a real-API auth spec, CI `seed_phase2` and `auth-e2e`.

## Seed accounts

Shared local password: `ClashFree!dev` (`SEED_PASSWORD`). All five start verified.

| Email | Role | Department |
| --- | --- | --- |
| `admin@clashfree.test` | `timetable_administrator` | none |
| `coordinator@clashfree.test` | `department_coordinator` | Software Engineering |
| `lecturer@clashfree.test` | `lecturer` | Software Engineering |
| `facilities@clashfree.test` | `facilities_manager` | none |
| `student@clashfree.test` | `student` | Software Engineering |

## Same-origin cookies

Leave `VITE_API_BASE_URL` empty. The Vite dev and preview servers proxy `/api` and `/health` to `http://127.0.0.1:8000`. Pointing the browser at `localhost:5173` while calling `127.0.0.1:8000` directly will drop the session cookie.

## AUTH_DEBUG

When `AUTH_DEBUG=true` (local and the auth e2e job):

- Forgot-password / verification links are printed by `ConsoleMailer`.
- `GET /api/auth/debug/last-token?email=` returns the most recent raw token for Playwright.
- The route is **404** when the flag is false. Do not enable it in a public deployment.

## Production vs preview

| URL | Auth |
| --- | --- |
| `/` | Login, or the signed-in role dashboard |
| `/auth/*` | Public auth screens |
| `/admin/dashboard` and other role homes | Session + role guard |
| `/unavailable/:pageId` | Session; later-phase screens |
| `/preview/*` | Unauthenticated design lab (visual CI) |

Wrong role → `/forbidden`. Logged-out visitors are sent to `/auth/login?next=`.

Non-admin POSTs to generate / repair / publish return **403**. The administrator receives **501** until the solver exists.

## Neon later

Do not implement Neon Managed Auth in this phase. Keep storing ClashFree roles on `users.role`. When Neon is adopted, map the IdP subject onto `users.auth_subject` and stop issuing local passwords.

## Remaining later phases

- Academic CRUD (Phase 3) — see [phase-3-handoff.md](phase-3-handoff.md)
- Scheduling constraints and lecturer availability (Phase 4)
- Solver generate / repair / publish (Phases 5–8)
- Full coordinator / lecturer / facilities / student portals and Users & Roles CRUD (Phase 9)
- Resend email (Phase 10)
- Public registration
