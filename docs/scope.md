# ClashFree Phase 0 Scope

ClashFree is a disruption-aware, constraint-based university timetable optimisation and repair system. It generates conflict-free academic schedules and, after publication, repairs them when lecturers, rooms or other resources become unavailable, changing as few unaffected classes as possible.

This document freezes what Phase 0 covers, who the product is for, and which later phases own the remaining 77 production screens.

## Problem

A class can only be scheduled when the lecturer is free, the student cohort is free, a suitable room is free, capacity and duration fit, and no hard university rule is broken. Doing this for hundreds of classes is already difficult. After a timetable is published, a single disruption can cascade if staff rebuild the whole schedule by hand.

ClashFree’s core loop is **generate → preserve → repair**.

## Roles

| Role | Responsibility | Central solver access |
| --- | --- | --- |
| Timetable Administrator | University-wide data, constraints, generation, repair approval, publishing | Yes — university-wide, and the only role that publishes |
| Department Coordinator | Department courses, cohorts, assignments, local constraints, requests, department generate and repair | Yes — own department only |
| Lecturer | Personal timetable, availability, preferences, unavailability reports | No |
| Facilities Manager | Rooms, maintenance, room disruptions, utilisation | No |
| Student | Personal timetable, today’s classes, change alerts | No |

The Timetable Administrator may generate a timetable, approve a repair, or publish a version for the whole university. A Department Coordinator may generate and approve a repair only for their own department. Publishing stays with the administrator. Lecturer, facilities, and student roles do not run the solver.

## Principal workflows

1. Prepare academic data (sessions, courses, lecturers, cohorts, rooms, assignments).
2. Define hard constraints and soft-preference weights.
3. Generate a feasible timetable.
4. Review conflicts and quality metrics, then publish a version.
5. Report a disruption (room closure or lecturer unavailability).
6. Identify affected classes, lecturers and students.
7. Generate minimal-change repair options and compare them.
8. Apply a repair, publish a new version, and notify affected users.

## Phase 0 boundaries

**In scope**

- Inventory of all 78 reference screens, unique routes, roles and implementation phases.
- Permissions matrix (view, edit, submit requests, report disruptions, generate, approve repairs, publish).
- Visual specification and CSS design tokens.
- Runnable frontend preview with a component gallery and one administrator dashboard.
- Shared components listed in the Phase 0 plan.
- Local fixture data clearly labelled as sample values.
- Unit, accessibility and Chromium end-to-end tests against the production preview build.

**Out of scope**

- FastAPI backend, Neon/local PostgreSQL, migrations and health endpoints (Phase 1 — see [phase-1-handoff.md](phase-1-handoff.md)).
- Real authentication and role enforcement (Phase 2).
- Implementation of all 78 screens.
- Timetable generation, disruption analysis and repair (Phases 5–8).
- Email, audit persistence, production deployment.

Preview routes (`/preview/*`) are not part of the 78-screen production inventory. Dashboard numbers, names and dates in the preview are fixtures.

## Build principle

Do not implement fifty screens first. Phase 0 only needs a visual and component foundation that later phases can reuse. The technical heart of the project remains generation plus minimal-change repair, which begins after the backend exists.
