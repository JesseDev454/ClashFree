# Phase 3 handoff

## Delivered

- Alembic revision `0003_academic_crud`: `faculties`, `faculty_id` on `departments`, `academic_sessions`, `courses`, `cohorts`, `lecturers`, `rooms`, `course_assignments`.
- Identity table `sessions` is unchanged. Academic periods live in `academic_sessions`; the REST path is still `/api/sessions`.
- Idempotent seed CLI: `uv run python -m app.cli seed_phase3` (calls Phase 2 seed first).
- REST CRUD under `/api/...` with session cookies and administrator writes. Facilities may GET and PATCH rooms. Unauthenticated callers receive **401**; students, lecturers and coordinators receive **403** on academic writes.
- `GET /api/academic/summary` feeds the four academic tiles on `/admin/dashboard`.
- Seven production administrator screens: academic sessions, faculties & departments, courses, student cohorts, lecturers, rooms & facilities, course assignments.
- Course **Ready** status is derived: a lecturer plus at least one cohort assignment. Incomplete seed assignments (`GST 203`, `CSC 201`) stay **Draft**.
- At most one `academic_sessions.status = active`. Activating another archives the previous.
- Deletes that would orphan assignments return **409**.
- Pytest academic coverage, Vitest `getAppHref` / Courses form / student guard, Playwright `academic.spec.ts`, CI `seed_phase3` and `academic-e2e`.

## Seed dataset

Modest Software Engineering sample (not the mockup’s 327 courses):

| Resource | Seed |
| --- | --- |
| Faculty | `FCS` Faculty of Computing Studies |
| Departments | `SWE`, `CSC` |
| Sessions | `2026/2027` First Semester **active**; `2025/2026` archived |
| Courses | 8 (`SWE 401`, `SWE 403`, `CSC 312`, …) |
| Cohorts | 4 (`SWE-400-A`, …) |
| Lecturers | 5, including Dr. Amina Yusuf linked to `lecturer@clashfree.test` |
| Rooms | 6 (`LT1`, `ICT Lab 1`, …) |
| Assignments | Most courses complete; two deliberately missing a lecturer |

Password for seed accounts remains `ClashFree!dev`.

## Production vs preview

| URL | Auth | Data |
| --- | --- | --- |
| `/admin/academic-sessions` … `/admin/course-assignments` | Session + administrator | Live API |
| `/admin/dashboard` academic tiles | Session + administrator | `/api/academic/summary` |
| `/preview/admin/dashboard` | None | Fixtures (`327` / `94` / `28` / `38`) |
| `/preview/unavailable/admin-courses` | None | Design-lab placeholder |
| `/facilities/rooms` | Session | Still `/unavailable/facilities-rooms` (Phase 9 UI) |

## Deferred mockup controls

These remain later phases and are not on the production screens:

- Import CSV / Export / Copy previous semester
- Lecturer weekly availability editor and “Send reminder”
- Scheduling constraints and constraint weights (Phase 4) — see [phase-4-handoff.md](phase-4-handoff.md)
- Published version and room utilisation % (shown as — until a timetable exists)
- Coordinator department-scoped editors
- Facilities rooms UI
- Solver generate / repair / publish (still disabled / **501**)

## Remaining later phases

- Solver generate / repair / publish (Phases 5–8)
- Full coordinator / lecturer / facilities / student portals and Users & Roles CRUD (Phase 9)
- Resend email (Phase 10)
- Public registration
