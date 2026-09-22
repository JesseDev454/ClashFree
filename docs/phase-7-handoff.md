# Phase 7 handoff

## Delivered

- Alembic revision `0007_disruptions`: operational incident rows against the **current published** weekly grid. Display code `D-{id:03d}` is formatted in the API, not stored. Affected-class lists are computed, not persisted.
- Impact maps `[starts_on, ends_on]` onto session weekdays and the 2-hour periods (`08-10` … `16-18`), then matches published `timetable_version_slots` by room or lecturer. Empty overlap or no published version returns an empty list, not 500.
- Lecturer Report Unavailability does **not** write a Phase 4 availability exception. Immediate room outages do **not** rewrite catalogue `rooms.status` unless Room Status is used. Scheduling future maintenance with `create_block=true` writes a `RoomAvailabilityBlock` in the same transaction.
- REST under `/api/disruptions`. Mutating routes need `reportDisruption`. Lecturers are bound to their own lecturer row; facilities may only report `kind=room`; coordinators and students receive **403**; anonymous callers receive **401**. `POST /api/timetables/repair` stays **501**.
- Six production screens: Disruption Centre, Report Unavailability, Room Status, Report Disruption, Affected Classes, Maintenance Schedule.
- Production administrator dashboard **Active Disruptions** and **Recent Disruptions** load from the API. Preview dashboard stays on fixtures. Repair stays disabled.
- Idempotent seed CLI: `uv run python -m app.cli seed_phase7` (calls Phase 6 seed first). It does **not** run CP-SAT or invent versions. Three catalogue-aligned rows: LT2 electrical (`open`), Dr. Amina Yusuf (`in_review`), ICT Lab 1 scheduled maintenance plus a weekend room block.
- Pytest disruption coverage, Vitest `getAppHref` / empty-error / disabled Repair / production dashboard API rows / lecturer and facilities guards, Playwright `disruptions.spec.ts` on port **4178**, CI `seed_phase7` and `disruptions-e2e`.

## Status rules

| Rule | Behaviour |
| --- | --- |
| Window starts in the future | `scheduled` |
| Window already started | `open` |
| Administrator acknowledge | `PATCH` `open` → `in_review` |
| `repaired` | Reserved for Phase 8; Phase 7 UI does not offer it |

Creating a disruption with no active session is **409**. Creating without a published version is allowed (row exists; impact empty). The UI warns “No published timetable — impact unknown”.

## Production vs preview

| URL | Auth | Data |
| --- | --- | --- |
| `/admin/disruption-centre` | Session + administrator | Live API |
| `/lecturer/report-unavailability` | Session + lecturer | Own lecturer disruptions |
| `/facilities/room-status`, `/facilities/report-disruption`, `/facilities/affected-classes`, `/facilities/maintenance-schedule` | Session + facilities | Room-kind disruptions |
| `/admin/dashboard` disruptions | Session + administrator | `/api/disruptions` |
| `/preview/admin/dashboard` | None | Fixtures; Repair still disabled |
| `/preview/unavailable/...` for these six ids | None | Design-lab placeholder (live app routes are wired) |

## API

- `GET /api/disruptions` — admin: all; lecturer: own; facilities: `kind=room`. Query `status`, `kind`
- `GET /api/disruptions/summary` — admin tiles; facilities room-kind counts
- `GET /api/disruptions/{id}` and `GET /api/disruptions/{id}/impact` — same scope; computed impact
- `POST /api/disruptions/preview` — impact without persist
- `POST /api/disruptions` — `{ kind, room_id?, lecturer_id?, reason, description?, severity?, starts_on, ends_on, start_period?, end_period?, create_block? }`
- `PATCH /api/disruptions/{id}` — admin: `status` to `in_review`; facilities: own open/scheduled room row reason/window
- `POST /api/timetables/repair` stays **501**

App version **0.7.0**. CORS includes port **4178**.

## Deferred

These remain later phases and are not on the production screens:

- Repair CTAs, Approve/Apply, Repair Comparison (Phase 8)
- Email / in-app notification product (Phase 10) — copy may say the administrator is alerted; the alert **is** the Disruption Centre row
- Export / Print, Save Draft, notify-policy toggles
- Unpublishing or restoring versions
- Users & Roles CRUD
- Personal timetables (Phase 9)

## Remaining later phases

- Repair / comparison (Phase 8)
- Full coordinator / lecturer / facilities / student portals and Users & Roles CRUD (Phase 9)
- Resend email and publish notifications (Phase 10)
- Public registration
