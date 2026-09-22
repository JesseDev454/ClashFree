# Phase 9 handoff

## Delivered

- Alembic revision `0009_portals`: `users.is_active`, `users.cohort_id`, `department_constraints`, `schedule_requests`, and `user_settings`.
- Administrator Users & Roles (`GET/POST /api/users`, `PATCH /api/users/{id}`). Inactive login is **401**. The last active administrator cannot be deactivated or demoted (**409**). A student requires a cohort in the same department (**422**). Creating a lecturer can link `lecturers.user_id`.
- `PATCH /api/me` updates the display name. `GET/PUT /api/me/settings` stores density, week start, and notification toggles. Nothing is emailed.
- Personal published views: `GET /api/timetables/published/mine` (lecturer via `lecturers.user_id`, student via `users.cohort_id`) and `GET /api/timetables/published/department` (coordinator, own department). `GET /api/timetables/changes/mine` diffs the current published version against the previous one for meetings that touch the viewer. Published slots include `lecturer_id` and `cohort_id`.
- Department workspace for the coordinator: courses, cohorts, assignments, lecturer-availability summary, department constraints, and published conflict review. A body or path from another department is **403**.
- Schedule requests: lecturers create `change` only; coordinators create `scheduling` or `change` and decide status for their department. Students and facilities are **403**.
- Generate accepts optional `faculty_id` or `department_id` (both set is **422**). Meetings outside that scope are hard-locked to the current published weekday, start period, and room. With no published version, the draft contains only the scoped meetings.
- `blocked_period` forbids those weekday/period options for the department’s meetings. `preferred_period` adds a soft penalty, using the profile’s lecturer-preference weight, when a meeting starts outside the preferred set. `lab_need` is stored and counted and does not change room type. `constraints_summary.department_rules` is the row count.
- Thirty-three production screens: Users & Roles, settings, help, and the coordinator, lecturer, facilities, and student portals, including personal and department timetables. Faculty and Department on Generate Timetable load real options and stay mutually exclusive.
- Idempotent seed CLI: `uv run python -m app.cli seed_phase9` (calls Phase 8 seed). It links `student@clashfree.test` to cohort `SWE-300-A` and inserts one departmental lab-need note.
- Pytest portal coverage, Vitest href/guards/empty/today, Playwright `portals.spec.ts` on port **4180**, CI backend seed `seed_phase9` and job `portals-e2e`. Other e2e jobs keep their current seeds.

App version **0.9.0**. CORS includes port **4180**.

## Scope

| Viewer | Filter |
| --- | --- |
| Lecturer | Published slots whose lecturer row has `user_id` |
| Student | Published slots for `users.cohort_id` |
| Coordinator | Published slots and academic edits for `users.department_id` |
| Facilities | Existing room, disruption, and maintenance-block reads |

## Deferred

Notifications, reports, the audit log, and Resend-or-console email shipped in Phase 10. These remain later:

- Export, print, unpublish, and restore version
- Facilities Rooms and Add/Edit Room
- Public registration
- Repair or generate for non-admin roles
