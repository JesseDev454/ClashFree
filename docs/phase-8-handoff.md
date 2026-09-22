# Phase 8 handoff

## Delivered

- Alembic revision `0008_repair_runs`: `timetable_runs.purpose` (`generate` or `repair`, default `generate`) and nullable `timetable_runs.disruption_id`.
- `POST /api/timetables/repair` re-solves the current published grid for one disruption in `open` or `in_review`. The disrupted room or lecturer is hard-unavailable on the same weekday/period window Phase 7 uses for impact. `preserve_published` is forced for that run so unaffected meetings pay `schedule_stability` when they leave weekday + start period + room. Unaffected meetings are not hard-locked.
- Solutions are ranked by fewest moved meetings, then lowest hard violations, then lowest soft penalty. The best feasible solution is selected as the draft. `infeasible` is a run status, not a 500.
- Existing select, change review, and `publish_draft` stay. Publishing a repair draft sets that disruption to `repaired` in the same transaction. Publishing a generate draft does not change disruption rows. Phase 7 PATCH still cannot set `repaired`.
- Administrator only, capability `approveRepair`. Lecturer, facilities, coordinator, and student receive **403**. Anonymous callers receive **401**. No published version, a missing disruption, `scheduled` / `repaired`, or an empty impact is **409**.
- Two production screens: Repair Timetable and Repair Comparison. Production dashboard and Disruption Centre Repair links go to `/admin/repair-timetable` (the centre passes `disruptionId` when a repairable row is selected). Preview `/preview/admin/dashboard` Repair stays a disabled button.
- Idempotent seed CLI: `uv run python -m app.cli seed_phase8` (calls Phase 7 seed). It does **not** run CP-SAT or invent repair runs.
- Pytest repair coverage, Vitest href/guards/empty/comparison, Playwright `repair.spec.ts` on port **4179**, CI backend seed `seed_phase8` and job `repair-e2e`. The disruptions e2e job stays on `seed_phase7`.

## Repair rules

| Rule | Behaviour |
| --- | --- |
| No current published version | **409** |
| Disruption missing, `scheduled`, or `repaired` | **409** |
| Impact has no overlapping published class | **409** |
| Feasible repair | Moved meetings leave the forbidden resource; `preserved_count` counts meetings that keep weekday, start period, and room |
| Publish a repair draft | Next version, disruption `repaired` |
| Publish a generate draft | Disruption rows unchanged |

Moved count is the existing change diff: weekday, start period, or room differs from the current published slot.

## Production vs preview

| URL | Auth | Data |
| --- | --- | --- |
| `/admin/repair-timetable` | Session + administrator | One open or in-review disruption |
| `/admin/repair-comparison` | Session + administrator | Repair run `?runId=` |
| `/admin/dashboard` Repair | Session + administrator | Link to Repair Timetable |
| `/preview/admin/dashboard` Repair | None | Disabled button |

## API

- `POST /api/timetables/repair` — `{ disruption_id, time_limit_seconds, alternative_count, random_seed? }`. Same limits as generate (1–3 alternatives). Returns the run with per-solution `moved_count` and `preserved_count`.
- `POST /api/timetables/solutions/{id}/select` — choose another repair option as the draft.
- `GET /api/timetables/changes` — pre-publish diff. Change Review is unchanged.
- `POST /api/timetables/publish` — writes `vN+1` and, for a repair draft, marks the disruption repaired.
- `GET /api/timetables/runs/{id}` — includes `purpose`, `disruption_id`, and the comparison counts.

App version **0.8.0**. CORS includes port **4179**.

## Deferred

These remain later phases:

- Email / in-app notifications (Phase 10)
- Coordinator, lecturer, student, and facilities repair
- Repairing every open disruption in one solve
- Hard-pinning unaffected meetings
- Export, unpublishing, restoring versions, Users & Roles, personal timetables (Phase 9)

## Remaining later phases

- Full coordinator / lecturer / facilities / student portals and Users & Roles CRUD (Phase 9)
- Resend email and publish notifications (Phase 10)
- Public registration
