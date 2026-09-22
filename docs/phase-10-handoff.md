# Phase 10 handoff

## Delivered

- Alembic revision `0010_activity`: `notifications` and `audit_events`.
- In-app rows are always written. Email uses the Phase 9 toggles: `notify_timetable_changes` for publish and disruption mail, `notify_requests` for request mail. Mail runs after the database commit. A mail failure leaves `email_sent` false and does not roll back the timetable, request, or disruption.
- Publish notifies every active administrator, plus lecturers, students, and coordinators whose assignment, cohort, or department is in the diff against the previous current version. The first publish notifies everyone on the new grid.
- Creating a request notifies that department’s active coordinators. Deciding a request notifies the requester.
- Creating a disruption, or changing its status, notifies active administrators and facilities managers.
- Audit rows record publish, request create and decide, disruption create and status, and user create or role/`is_active` changes.
- `GET /api/notifications`, `PATCH /api/notifications/{id}`, and `POST /api/notifications/read-all` are scoped to the signed-in user. Another user’s id is **404**.
- `GET /api/audit` and `GET /api/reports/university` are administrator only. `GET /api/reports/department` is the coordinator’s own department. With no published version the report counts are zeros.
- `GET /api/facilities/utilization` and `GET /api/facilities/history` are for facilities managers and administrators. Utilization is occupied period-slots divided by the 25-slot teaching week.
- The default mailer stays the console. When `RESEND_API_KEY` and `RESEND_FROM` are both set, mail goes out through Resend. Auth reset and verify mail use the same mailer. CI does not set those variables.
- Ten production screens: admin, coordinator, lecturer, facilities, and student notifications; admin and coordinator reports; the admin audit log; facilities room utilization and facility history.
- Idempotent seed CLI: `uv run python -m app.cli seed_phase10` (calls Phase 9 seed). It inserts one student notice, one admin notice, and one audit row.
- Pytest activity coverage, Vitest href/empty/guard, Playwright `activity.spec.ts` on port **4181**, CI backend seed `seed_phase10` and job `activity-e2e`. Other e2e jobs keep their current seeds.

App version **0.10.0**. CORS includes port **4181**.

## Deferred

Phases 11–15 cover the items that were still open after this phase: facilities rooms, version export and lifecycle, student registration, department generate and repair, and Neon Auth.
