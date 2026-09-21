# Phase 6 handoff

## Delivered

- Alembic revision `0006_timetable_versions`: `timetable_versions` and `timetable_version_slots`. Version slots cascade when a version row is deleted. Live `timetable_slots` are not aliased — regenerating a draft cannot rewrite history.
- Publish copies the **selected draft** into a new version (`is_current=true`; the previous current for that session becomes `superseded`) and one snapshot slot per draft slot.
- Idempotent seed CLI: `uv run python -m app.cli seed_phase6` (calls Phase 5 seed first). It does **not** run CP-SAT or invent versions. Tests and Playwright publish after generate.
- REST under `/api/timetables/...`. `POST /publish` needs administrator + `publish` capability. Unauthenticated callers receive **401**; non-admins receive **403**. `POST /repair` stays **501**.
- Three production screens: Publish Timetable, Timetable Versions, Change Review (draft vs currently published, not repair-vs-published).
- Production dashboard **Publish** links to `/admin/publish-timetable`. Repair stays disabled. Preview Generate and Publish stay disabled buttons.
- Master Timetable badge `Published vN` when a current version exists, with a **Draft | Published** toggle when a draft also exists. Still `Draft` if none is published.
- CP-SAT `preserve_published_assignments` now soft-penalises meetings that leave a current published weekday + start period + room, using `schedule_stability` (0–10). Hard constraints still win.
- Pytest publish coverage, Vitest `getAppHref` / Confirm disabled / versions and change-review empty-error / lecturer guards / preview Publish button, Playwright `publish.spec.ts` on port **4177**, CI `seed_phase6` and `publish-e2e`.

## Version numbering

Sequential integers per academic session, starting at **1**. Display as `v1`, `v2`, … — not mockup labels such as `v2.1`. `MAX(version_number)+1` for that session. At most one `timetable_versions.is_current` per session.

## Snapshot copy

`POST /api/timetables/publish` copies `TimetableSolution` + `TimetableSlot` rows into:

- `timetable_versions` (`solution_id` is the source draft, denormalised slot count / hard violations / soft penalty / utilisation)
- `timetable_version_slots` (same weekday / period / room / assignment / meeting_index)

Guards:

- **409** if no selected draft, no active session, or `hard_violations > 0`
- **409** if this `solution_id` is already the source of the current version
- **422** if notes are longer than 500 characters
- First publish is allowed with incomplete assignments (GST/CSC stay unscheduled); the checklist warns and does not block

## Change kinds

`GET /api/timetables/changes` computes a diff keyed by `(assignment_id, meeting_index)`:

- **added** — in the to-side only
- **removed** — in the from-side only
- **moved** — same meeting, different weekday / start_period / room_id

Default: current published vs selected draft. First publish: every draft meeting is `added`. If the draft matches published: empty list. Optional `from_version_id` / `to_version_id` compare two published snapshots. Nothing is persisted.

## Preserve published

When `preserve_published_assignments` is enabled and a current version exists, the solver snapshot includes published placements. A meeting not placed on the same weekday + start_period + room is scored with `schedule_stability`. This is a soft penalty only — it is not repair.

## Production vs preview

| URL | Auth | Data |
| --- | --- | --- |
| `/admin/publish-timetable`, `/admin/timetable-versions`, `/admin/change-review` | Session + administrator | Live API |
| `/admin/dashboard` Publish | Session + administrator | Links to publish |
| `/admin/master-timetable` | Session + administrator | Published slots when a current version exists |
| `/preview/admin/dashboard` | None | Fixtures; Generate and Publish still disabled |
| `/preview/unavailable/admin-publish-timetable` | None | Design-lab placeholder |

## API

- `POST /api/timetables/publish` body `{ notes? }` — publishes the selected draft
- `GET /api/timetables/published` — current version + slots (`404` if none)
- `GET /api/timetables/versions` (latest first), `GET /api/timetables/versions/{id}`
- `GET /api/timetables/changes` — default current published vs selected draft
- `POST /api/timetables/repair` stays **501**

App version **0.6.0**. CORS includes port **4177**.

## Deferred mockup controls

These remain later phases and are not on the production screens:

- Repair / comparison (Phase 8) — omit Approve Repair / Apply / Open Repair Timetable; Change Review is draft vs published only
- Audience toggles, in-app / email notifications on publish (Phase 10)
- Compare-any-two-versions UI (API query params exist; the Versions screen is view-only history)
- Unpublishing or editing a published snapshot
- Restoring an old version as the new draft
- Export / Print
- Mockup version labels (`v2.1`)
- Lecturer / student / coordinator personal timetables (Phase 9)
- Async job queue

## Remaining later phases

- Disruptions (Phase 7)
- Repair / comparison (Phase 8)
- Full coordinator / lecturer / facilities / student portals and Users & Roles CRUD (Phase 9)
- Resend email and publish notifications (Phase 10)
- Public registration
