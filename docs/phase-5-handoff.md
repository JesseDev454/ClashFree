# Phase 5 handoff

## Delivered

- Alembic revision `0005_timetable_runs`: `timetable_runs`, `timetable_solutions`, `timetable_slots`, `timetable_conflicts`. Solutions, slots and conflicts cascade when a run is deleted.
- Google OR-Tools **CP-SAT** solver in `backend/app/services/solver.py`. Snapshot builder and persistence live in `backend/app/services/timetable.py`.
- Idempotent seed CLI: `uv run python -m app.cli seed_phase5` (calls Phase 4 seed first). Adds Science Lab (`lab`, capacity 120) and raises ICT Lab 1 to 90 so the sample is feasible.
- REST under `/api/timetables/...` with session cookies. Generate is administrator + `generate` capability. Unauthenticated callers receive **401**; non-admins receive **403**.
- Four production screens: Generate Timetable, Generation Results, Master Timetable (draft of the selected solution), Conflict Monitor (validation of that draft).
- Production dashboard **Generate** buttons link to `/admin/generate-timetable`. Repair and Publish stay disabled. Preview `/preview/admin/dashboard` Generate buttons stay disabled and fixture-based.
- Constraint Weights Soft Penalty / Hard Violations read from the selected draft when one exists.
- Pytest solver coverage, Vitest `getAppHref` / generate loading / results empty-error / route guards, Playwright `solver.spec.ts`, CI `seed_phase5` and `solver-e2e`.

## Solver model

Shared grid remains Monday–Friday, five 2-hour periods (`08-10` … `16-18`).

Each `course_assignments` row with a lecturer becomes `N` meetings from `contact_pattern`:

- `N x 2h` → `N` independent 1-period meetings
- duration **> 2 hours** (`1 x 3h`) → `N` blocks of **two consecutive periods** (closest fit to the 2h grid)

Assignments with no lecturer (`GST 203`, `CSC 201`) are skipped. They appear on the preflight checklist as incomplete, not as hard failures of the whole run.

Hard constraints are always enforced (matching the locked seed rules): no lecturer/room/cohort clash, capacity `room.capacity >= max(course.expected_size, cohort.size)`, room type, lecturer and room unavailability, rooms with catalogue status `unavailable` or `maintenance` excluded (LT2, ICT Lab 2).

Soft penalties apply only when the corresponding `scheduling_constraints.enabled` row is true, using the current weight profile (0–10): preferred slots, idle gaps, daily balance, building movement, room-fit waste. `preserve_published_assignments` is a no-op until Phase 6.

Candidates: CP-SAT runs up to `alternative_solutions` (1–3) with distinct random seeds. The lowest-objective feasible candidate is selected as draft. Time limit default **30s** (UI 10/30/120). Generation is synchronous.

Infeasible runs store `status=infeasible`, zero solutions, and a human-readable message. They do not return 500.

## Seed catalogue

| Resource | Seed |
| --- | --- |
| Ready assignments | 6 (10 meetings) |
| Incomplete | GST 203, CSC 201 (no lecturer) |
| Science Lab | `lab`, capacity **120** (PHY 301’s CSC-300-A cohort is 112) |
| ICT Lab 1 | capacity **90** (SWE 403 expected 82 / cohort 86) |
| Excluded rooms | LT2 unavailable, ICT Lab 2 maintenance |

Password for seed accounts remains `ClashFree!dev`.

## Production vs preview

| URL | Auth | Data |
| --- | --- | --- |
| `/admin/generate-timetable` … `/admin/conflict-monitor` | Session + administrator | Live API |
| `/admin/dashboard` Generate | Session + administrator | Links to generate |
| `/preview/admin/dashboard` | None | Fixtures; Generate still disabled |
| `/preview/unavailable/admin-generate-timetable` | None | Design-lab placeholder |

## API

- `GET /api/timetables/preflight`
- `POST /api/timetables/generate` body `{ time_limit_seconds, alternative_count, random_seed? }`
- `GET /api/timetables/runs`, `GET /api/timetables/runs/{id}`
- `POST /api/timetables/solutions/{id}/select`
- `GET /api/timetables/draft` (`404` if none)
- `GET /api/timetables/conflicts?solution_id=`
- `POST /api/timetables/validate` recomputes conflicts for the selected draft
- `POST /api/timetables/repair` and `POST /api/timetables/publish` stay **501**

409 if there is no active session or no current weight profile. 422 for time limit outside 5–120 or alternative count outside 1–3.

## Deferred mockup controls

These remain later phases and are not on the production screens:

- Publish, versions, change review (Phase 6) — Master Timetable badge is `Draft`, not `Published v2.1`
- Repair / comparison (Phase 8) — omit Resolve / Apply / Open Repair Timetable
- Faculty/department-scoped generation (Phase 9) — dropdowns stay All and disabled
- Export / Print
- Invented “3 candidates” metrics when the model is infeasible
- Lecturer / student / coordinator personal timetables (Phase 9)
- Disruptions table (Phase 7)
- Async job queue / Celery / Redis

## Remaining later phases

- Publish / versions / change review (Phase 6)
- Disruptions (Phase 7)
- Repair / comparison (Phase 8)
- Full coordinator / lecturer / facilities / student portals and Users & Roles CRUD (Phase 9)
- Resend email (Phase 10)
- Public registration
