# Phase 4 handoff

## Delivered

- Alembic revision `0004_constraints_availability`: `scheduling_constraints`, `constraint_weight_profiles`, lecturer weekly slots/exceptions/preferences, room weekly slots/blocks. Slot/exception/preference/block rows cascade when a lecturer or room is deleted.
- Shared teaching grid in `backend/app/core/schedule.py`: Monday–Friday, five 2-hour periods (`08-10` … `16-18`). This is a coded vocabulary, not a CRUD table.
- Idempotent seed CLI: `uv run python -m app.cli seed_phase4` (calls Phase 3 seed first).
- REST under `/api/...` with session cookies. Constraint and weight writes are administrator-only. Lecturers read/write only their own `/api/me/availability` and `/api/me/preferences`. Facilities and administrators write room availability. Unauthenticated callers receive **401**.
- Hard constraints are locked: `PATCH` with `enabled: false` returns **409**. Soft constraints toggle `enabled`.
- At most one `constraint_weight_profiles.is_current`. Activating a preset clears the others, same pattern as one active academic session.
- Five production screens: scheduling constraints, constraint weights, lecturer availability, lecturer scheduling preferences, facilities room availability.
- Lecturer dashboard Availability tile is live (`Submitted` / `Missing`). Facilities dashboard “Rooms online” is the catalogue count. Admin dashboard is unchanged. Preview `/preview/admin/dashboard` stays on fixtures.
- Pytest constraint coverage, Vitest `getAppHref` / grid cycle / preferences validation / route guards, Playwright `constraints.spec.ts`, CI `seed_phase4` and `constraints-e2e`.

## Seed catalogue

Modest coded rules (not mockup department-rule counts):

| Resource | Seed |
| --- | --- |
| Hard constraints | 6 locked (`no_lecturer_clash`, `no_room_clash`, `no_cohort_clash`, `capacity_requirement`, `special_room_compatibility`, `lecturer_availability`) |
| Soft constraints | 5 enabled (`minimize_student_idle_gaps`, `respect_lecturer_preferences`, `balance_classes_across_week`, `minimize_building_movement`, `preserve_published_assignments`) |
| Weight presets | `balanced` (current 9/7/6/5/4/3), `student_experience`, `resource_efficiency`, `repair_stability` |
| Lecturer grid | Dr. Amina Yusuf (`lecturer@clashfree.test`): preferred mornings, Wednesday mostly unavailable, two dated exceptions |
| Preferences | Morning on, avoid Friday afternoon on, no-early-after-late off; 2 classes/day, 4 consecutive hours |
| Rooms | All six seed rooms have weekly slots. LT1 Friday unavailable, Wednesday reserved, two upcoming blocks |

Password for seed accounts remains `ClashFree!dev`.

## Production vs preview

| URL | Auth | Data |
| --- | --- | --- |
| `/admin/scheduling-constraints`, `/admin/constraint-weights` | Session + administrator | Live API |
| `/lecturer/availability`, `/lecturer/scheduling-preferences` | Session + lecturer | Own lecturer rows |
| `/facilities/room-availability` | Session + facilities manager | Live rooms + LT1 template |
| `/preview/unavailable/admin-scheduling-constraints` | None | Design-lab placeholder |

## API

- `GET /api/constraints`, `PATCH /api/constraints/{id}` (`enabled` only)
- `GET /api/constraint-weights`, `PATCH /api/constraint-weights/{id}`, `POST /api/constraint-weights/{id}/activate`
- `GET /api/constraints/summary`
- `GET/PUT /api/me/availability`, `POST/DELETE /api/me/availability/exceptions`
- `GET/PUT /api/me/preferences`
- `GET /api/lecturers/{id}/availability` (admin, or the linked lecturer). `PUT` is admin-only.
- `GET/PUT /api/rooms/{id}/availability`, `POST/DELETE /api/rooms/{id}/availability/blocks`

Invalid weekday/period/state returns **422**. Locked hard disable and unique conflicts return **409**. Lecturers without a `lecturers.user_id` link receive **404** on `/api/me/*`.

## Deferred mockup controls

These remain later phases and are not on the production screens:

- Free-form “+ Add Constraint”
- Department Rules count of 18 (shown as `0`; no department constraints yet)
- Coordinator department constraints and lecturer-availability summaries (Phase 9)
- Lecturer Report Unavailability (Phase 7 disruptions — distinct from planned exceptions)
- Facilities Rooms CRUD UI, room status, maintenance schedule (Phase 7/9)
- Repair / publish (still disabled / **501**)

## Remaining later phases

- Publish / versions, disruptions, repair / comparison (Phases 6–8) — see [phase-5-handoff.md](phase-5-handoff.md) for generate
- Full coordinator / lecturer / facilities / student portals and Users & Roles CRUD (Phase 9)
- Resend email (Phase 10)
- Public registration
